import { act, fireEvent, render, screen } from '@testing-library/react'
import ReadingExplorer from '../ReadingExplorer'
import { ReadingAudioProvider } from '../ReadingAudio'

const playNoteNow = jest.fn().mockResolvedValue(true)
jest.mock('@/hooks/useFallingNotesAudio', () => ({ useFallingNotesAudio: () => ({ playNoteNow }) }))
jest.mock('../ScoreExample', () => ({ __esModule: true, default: () => <div data-testid="mock-reading-score">악보 예시</div> }))
beforeEach(() => playNoteNow.mockReset().mockResolvedValue(true))
afterEach(() => jest.restoreAllMocks())
it('ties selection, staff position and the existing keyboard buttons to the same MIDI', () => {
  render(<ReadingAudioProvider><ReadingExplorer /></ReadingAudioProvider>)
  expect(playNoteNow).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: /^도 샵 \(4옥타브\)$/ })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: /^음 선택: 레 \(4옥타브\)$/ }))
  expect(screen.getByRole('status', { name: '선택한 음' })).toHaveTextContent('레 · 4옥타브 · 높은음자리표 · 오선 바로 아래 칸')
  expect(screen.getByRole('button', { name: /^레 \(4옥타브\)$/ })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: /^도 \(3옥타브\)$/ }))
  expect(screen.getByRole('status', { name: '선택한 음' })).toHaveTextContent('도 · 3옥타브 · 낮은음자리표 · 둘째 칸')
  expect(screen.getByRole('button', { name: /^음 선택: 도 \(3옥타브\)$/ })).toHaveAttribute('aria-pressed', 'true')
})
it('still selects notes when playback throws', async () => {
  playNoteNow.mockImplementation(() => { throw new Error('audio blocked') })
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  render(<ReadingAudioProvider><ReadingExplorer /></ReadingAudioProvider>)
  fireEvent.click(screen.getByRole('button', { name: /^미 \(4옥타브\)$/ }))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^선택한 음 들어 보기$/ })) })
  expect(screen.getByRole('status', { name: '선택한 음' })).toHaveTextContent('미 · 4옥타브 · 높은음자리표 · 첫째 줄')
  expect(screen.getByRole('button', { name: /^미 \(4옥타브\)$/ })).toHaveAttribute('aria-pressed', 'true')
})

it('centres middle C initially and reveals button selections without moving focus or the document', () => {
  jest.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(320)
  jest.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(660)
  render(<ReadingAudioProvider><ReadingExplorer /></ReadingAudioProvider>)
  const region = screen.getByRole('region', { name: '음높이 학습 건반 (좌우 스크롤)' })
  expect(region.scrollLeft).toBe(170)
  const focus = document.activeElement
  fireEvent.click(screen.getByRole('button', { name: /^음 선택: 도 \(5옥타브\)$/ }))
  expect(region.scrollLeft).toBe(340)
  expect(document.activeElement).toBe(focus)
  expect(window.scrollY).toBe(0)
  // 같은 음이어도 수동 스크롤 뒤 버튼으로 선택하면 해당 건반을 다시 보여 준다.
  region.scrollLeft = 0
  fireEvent.click(screen.getByRole('button', { name: /^음 선택: 도 \(5옥타브\)$/ }))
  expect(region.scrollLeft).toBe(340)
  region.scrollLeft = 120
  fireEvent.click(screen.getByRole('button', { name: /^레 \(4옥타브\)$/ }))
  expect(region.scrollLeft).toBe(120)
  expect(screen.getByRole('button', { name: /^레 \(4옥타브\)$/ })).toHaveAttribute('aria-pressed', 'true')
})
it('leaves wide keyboards alone for initial and button selections', () => {
  jest.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(800)
  jest.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(660)
  render(<ReadingAudioProvider><ReadingExplorer /></ReadingAudioProvider>)
  const region = screen.getByRole('region', { name: '음높이 학습 건반 (좌우 스크롤)' })
  expect(region.scrollLeft).toBe(0)
  fireEvent.click(screen.getByRole('button', { name: /^음 선택: 도 \(5옥타브\)$/ }))
  expect(region.scrollLeft).toBe(0)
})


it('keeps keyboard and guidance before changing score drawings on phones', () => {
  render(<ReadingAudioProvider><ReadingExplorer /></ReadingAudioProvider>)
  const keyboard = screen.getByRole('region', { name: '음높이 학습 건반 (좌우 스크롤)' })
  const guidance = screen.getByRole('status', { name: '선택한 음' })
  for (const name of ['음 선택: 가운데 도 (4옥타브)', '음 선택: 레 (4옥타브)', '음 선택: 시 (3옥타브)', '음 선택: 가운데 도 (4옥타브)']) {
    fireEvent.click(screen.getByRole('button', { name }))
    const score = screen.getAllByTestId('mock-reading-score')[0]
    expect(keyboard.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(guidance.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  }
})
