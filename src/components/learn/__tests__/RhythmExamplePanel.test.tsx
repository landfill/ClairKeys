import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RhythmExamplePanel from '../RhythmExamplePanel'
import { ReadingAudioProvider } from '../ReadingAudio'

const load = jest.fn().mockResolvedValue(undefined)
const draw = jest.fn()
const clear = jest.fn()
jest.mock('opensheetmusicdisplay', () => ({
  OpenSheetMusicDisplay: jest.fn().mockImplementation((container: HTMLElement) => ({
    load,
    render: () => draw(container),
    clear,
  })),
}))

beforeEach(() => {
  load.mockReset().mockResolvedValue(undefined)
  draw.mockReset().mockImplementation((container: HTMLElement) => {
    container.replaceChildren()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '320')
    svg.setAttribute('height', '160')
    Object.defineProperty(svg, 'getBBox', { value: () => ({ x: 10, y: 20, width: 180, height: 64 }) })
    container.appendChild(svg)
  })
  clear.mockClear()
})

const NOTE_ITEMS = [
  { id: 'note-whole', beats: '4박' },
  { id: 'note-half', beats: '2박' },
  { id: 'note-quarter', beats: '1박' },
  { id: 'note-eighth', beats: '반 박' },
]

describe('RhythmExamplePanel', () => {
  it('renders the group with its label and selects the first example by default', async () => {
    render(
      <ReadingAudioProvider>
        <RhythmExamplePanel label="음표 길이 비교" items={NOTE_ITEMS} />
      </ReadingAudioProvider>
    )

    await screen.findByRole('img')

    const group = screen.getByRole('group', { name: '음표 길이 비교' })
    expect(group).toBeInTheDocument()

    const wholeButton = within(group).getByRole('button', { name: '온음표, 4박' })
    const halfButton = within(group).getByRole('button', { name: '2분음표, 2박' })

    expect(wholeButton).toHaveAccessibleName('온음표, 4박')
    expect(halfButton).toHaveAccessibleName('2분음표, 2박')
    expect(wholeButton).toHaveAttribute('aria-pressed', 'true')
    expect(halfButton).toHaveAttribute('aria-pressed', 'false')

    // Initial score example is the first item
    const figure = screen.getByRole('figure')
    expect(figure).toHaveAttribute('data-example', 'note-whole')
    expect(figure).toHaveAccessibleName('온음표 예시')

    // Listen button is for the first item
    const listenButtons = screen.getAllByRole('button', { name: /들어 보기$/ })
    expect(listenButtons).toHaveLength(1)
    expect(listenButtons[0]).toHaveAccessibleName('온음표 들어 보기')
  })

  it('switches aria-pressed, score drawing and listen button upon clicking another button', async () => {
    const user = userEvent.setup()
    render(
      <ReadingAudioProvider>
        <RhythmExamplePanel label="음표 길이 비교" items={NOTE_ITEMS} />
      </ReadingAudioProvider>
    )

    await screen.findByRole('img')

    const halfButton = screen.getByRole('button', { name: '2분음표, 2박' })
    await user.click(halfButton)

    expect(halfButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '온음표, 4박' })).toHaveAttribute('aria-pressed', 'false')

    const figure = screen.getByRole('figure')
    expect(figure).toHaveAttribute('data-example', 'note-half')
    expect(figure).toHaveAccessibleName('2분음표 예시')

    const listenButton = screen.getByRole('button', { name: /들어 보기$/ })
    expect(listenButton).toHaveAccessibleName('2분음표 들어 보기')
  })

  it('displays beat text on buttons when beats prop is provided and omits when absent', async () => {
    const { unmount } = render(
      <ReadingAudioProvider>
        <RhythmExamplePanel label="음표 길이 비교" items={NOTE_ITEMS} />
      </ReadingAudioProvider>
    )

    await screen.findByRole('img')
    expect(screen.getByRole('button', { name: '온음표, 4박' })).toHaveTextContent('4박')
    expect(screen.getByRole('button', { name: '온음표, 4박' })).toHaveAccessibleName('온음표, 4박')
    unmount()

    const REST_ITEMS = [
      { id: 'rest-whole' },
      { id: 'rest-half' },
      { id: 'rest-quarter' },
      { id: 'rest-eighth' },
    ]

    render(
      <ReadingAudioProvider>
        <RhythmExamplePanel label="쉼표 예시" items={REST_ITEMS} />
      </ReadingAudioProvider>
    )

    await screen.findByRole('img')
    const wholeRestButton = screen.getByRole('button', { name: '온쉼표' })
    expect(wholeRestButton).toHaveTextContent('온쉼표')
    expect(wholeRestButton).toHaveAccessibleName('온쉼표')
    expect(wholeRestButton).not.toHaveTextContent('박')
  })

  it('keeps only one listen button in the panel and keeps hidden descriptions out of the a11y tree', async () => {
    render(
      <ReadingAudioProvider>
        <RhythmExamplePanel label="음표 길이 비교" items={NOTE_ITEMS} />
      </ReadingAudioProvider>
    )

    await screen.findByRole('img')
    expect(screen.getAllByRole('button', { name: /들어 보기$/ })).toHaveLength(1)

    // Hidden descriptions should have aria-hidden="true"
    const figure = screen.getByRole('figure')
    const hiddenSpans = figure.querySelectorAll('figcaption span[aria-hidden="true"]')
    expect(hiddenSpans.length).toBe(NOTE_ITEMS.length - 1)

    // Visible description should match current example
    const visibleSpans = figure.querySelectorAll('figcaption > span:not([aria-hidden])')
    expect(visibleSpans).toHaveLength(1)
    expect(visibleSpans[0]).toHaveTextContent(/온음표/)
  })
})
