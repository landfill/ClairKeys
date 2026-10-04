import { render, screen, waitFor } from '@testing-library/react'
import ScoreExample from '../ScoreExample'
import { READING_EXAMPLES } from '@/lib/learn/reading'

const load = jest.fn().mockResolvedValue(undefined)
const draw = jest.fn()
const clear = jest.fn()
jest.mock('opensheetmusicdisplay', () => ({ OpenSheetMusicDisplay: jest.fn().mockImplementation((container: HTMLElement) => ({ load, render: () => draw(container), clear })) }))

beforeEach(() => { load.mockReset().mockResolvedValue(undefined); draw.mockReset().mockImplementation((container: HTMLElement) => {
  container.replaceChildren()
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '320')
  svg.setAttribute('height', '160')
  Object.defineProperty(svg, 'getBBox', { value: () => ({ x: 10, y: 20, width: 180, height: 64 }) })
  container.appendChild(svg)
}); clear.mockClear() })
afterEach(() => jest.restoreAllMocks())
it('loads MusicXML and gives the drawing an accessible name and visible alternative', async () => {
  const { unmount } = render(<ScoreExample example={READING_EXAMPLES[0]} />)
  const image = screen.getByRole('img')
  expect(image).toHaveAccessibleName('높은음자리표 줄 음 악보')
  const caption = screen.getByText(/높은음자리표 오선.*첫째 줄.*미.*둘째 줄.*솔/)
  expect(screen.getByRole('figure')).toHaveAccessibleName('높은음자리표 줄 음 예시')
  expect(screen.getByRole('figure')).toHaveAttribute('aria-describedby', caption.id)
  expect(image).not.toHaveAttribute('aria-describedby')
  expect(image.getAttribute('aria-label')).not.toContain(caption.textContent)
  expect(screen.getByText(/높은음자리표 오선.*첫째 줄.*미/)).toBeVisible()
  await waitFor(() => expect(draw).toHaveBeenCalled())
  expect(load.mock.calls[0][0]).toContain('<step>E</step><octave>4</octave>')
  unmount()
  expect(clear).toHaveBeenCalled()
})
it('keeps alternative text when score rendering fails', async () => {
  load.mockRejectedValue(new Error('score load failed'))
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  render(<ScoreExample example={READING_EXAMPLES[4]} />)
  expect(await screen.findByText(/악보 그림을 불러오지 못했어요/)).toBeVisible()
  expect(screen.getByRole('img')).toHaveAccessibleName('높은음자리표의 가운데 도 악보')
  expect(screen.getByRole('figure')).toHaveAccessibleDescription('높은음자리표 오선. 아래 덧줄 하나에 가운데 도(4옥타브).')
  expect(screen.getByText(/높은음자리표 오선.*아래 덧줄 하나/)).toBeVisible()
})


it('fits the actual drawing bounds at readable size inside a stable placeholder', async () => {
  jest.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(320)
  jest.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(128)
  const { container } = render(<ScoreExample example={READING_EXAMPLES[0]} />)
  const image = screen.getByRole('img')
  const placeholderClass = image.className
  await waitFor(() => expect(image).toHaveAttribute('aria-busy', 'false'))
  expect(image.className).toBe(placeholderClass)
  const svg = container.querySelector('svg')!
  expect(svg).toHaveAttribute('viewBox', '8 18 184 68')
  expect(parseFloat(svg.style.height)).toBe(104)
  expect(parseFloat(svg.style.width)).toBeLessThanOrEqual(296)
  expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet')
})
