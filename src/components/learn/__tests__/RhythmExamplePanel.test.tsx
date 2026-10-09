import { act, fireEvent, render, screen, within } from '@testing-library/react'
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

const playNoteNow = jest.fn().mockResolvedValue(true)
const startAudio = jest.fn().mockResolvedValue(true)
const stopAudio = jest.fn()
const stopTappedNotes = jest.fn()
const setVolume = jest.fn()
const getCurrentTime = jest.fn().mockReturnValue(0)
jest.mock('@/hooks/useFallingNotesAudio', () => ({
  useFallingNotesAudio: () => ({ playNoteNow, startAudio, stopAudio, stopTappedNotes, setVolume, getCurrentTime }),
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
  playNoteNow.mockReset().mockResolvedValue(true)
  startAudio.mockReset().mockResolvedValue(true)
  stopAudio.mockReset()
  stopTappedNotes.mockReset()
  setVolume.mockReset()
  getCurrentTime.mockReset().mockReturnValue(0)
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
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
    render(
      <ReadingAudioProvider>
        <RhythmExamplePanel label="음표 길이 비교" items={NOTE_ITEMS} />
      </ReadingAudioProvider>
    )

    await screen.findByRole('img')

    const halfButton = screen.getByRole('button', { name: '2분음표, 2박' })
    await act(async () => {
      fireEvent.click(halfButton)
    })

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

  it('calls stopAudio when switching examples during playback', async () => {
    render(
      <ReadingAudioProvider>
        <RhythmExamplePanel label="음표 길이 비교" items={NOTE_ITEMS} />
      </ReadingAudioProvider>
    )

    await screen.findByRole('img')
    const listenBtn = screen.getByRole('button', { name: '온음표 들어 보기' })
    await act(async () => {
      fireEvent.click(listenBtn)
    })
    await act(async () => {
      await jest.advanceTimersByTimeAsync(50)
    })

    stopAudio.mockClear()
    const halfBtn = screen.getByRole('button', { name: '2분음표, 2박' })
    await act(async () => {
      fireEvent.click(halfBtn)
    })

    expect(stopAudio).toHaveBeenCalled()
  })
})
