import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KeyboardLesson from '../KeyboardLesson'

const playNoteNow = jest.fn().mockResolvedValue(true)
const request = jest.fn()
let onMidiNote: (midi: number) => void
jest.mock('@/hooks/useFallingNotesAudio', () => ({ useFallingNotesAudio: () => ({ playNoteNow }) }))
jest.mock('@/hooks/useMidiInput', () => ({ useMidiInput: ({ onNoteOn }: { onNoteOn: (midi: number) => void }) => {
  onMidiNote = onNoteOn
  return { status: 'idle', devices: [], request }
} }))

beforeEach(() => { playNoteNow.mockReset().mockResolvedValue(true); request.mockClear() })
afterEach(() => { jest.restoreAllMocks() })

it('announces pointer presses and renders accessible keys without starting audio on mount', async () => {
  render(<KeyboardLesson random={() => 0.5} />)
  expect(playNoteNow).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: '도 샵 (4옥타브)' })).toBeInTheDocument()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '가운데 도 (4옥타브)' })) })
  expect(screen.getByRole('status', { name: '누른 건반' })).toHaveTextContent('가운데 도 · 4옥타브')
  expect(playNoteNow).toHaveBeenCalledWith(60)
  expect(screen.getAllByText('검은 건반 2개')).toHaveLength(2)
  expect(screen.getAllByText('검은 건반 3개')).toHaveLength(2)
})

it('accepts Enter and Space on focused keys', async () => {
  const user = userEvent.setup()
  render(<KeyboardLesson />)
  screen.getByRole('button', { name: '레 (4옥타브)' }).focus()
  await user.keyboard('{Enter}')
  expect(playNoteNow).toHaveBeenLastCalledWith(62)
  await user.keyboard(' ')
  expect(playNoteNow).toHaveBeenCalledTimes(2)
})

it.each(['throw', 'reject', 'silent'])('keeps display and practice working when audio is %s', async failure => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  if (failure === 'throw') playNoteNow.mockImplementation(() => { throw new Error('audio') })
  else if (failure === 'reject') playNoteNow.mockRejectedValue(new Error('audio'))
  else playNoteNow.mockResolvedValue(false)
  render(<KeyboardLesson random={() => 0.5} />)
  fireEvent.click(screen.getByRole('button', { name: '도 찾기 시작' }))
  fireEvent.click(screen.getByRole('button', { name: '도 (3옥타브)' }))
  expect(screen.getByRole('status', { name: '연습 결과' })).toHaveTextContent('다시')
  fireEvent.click(screen.getByRole('button', { name: '가운데 도 (4옥타브)' }))
  expect(screen.getByRole('status', { name: '연습 결과' })).toHaveTextContent('맞음')
  expect(screen.getByRole('status', { name: '누른 건반' })).toHaveTextContent('가운데 도')
  await waitFor(() => expect(screen.getByText(/소리를 재생하지 못했어요/)).toBeInTheDocument())
  warn.mockRestore()
})

it('supports mute without disabling note names or practice', () => {
  render(<KeyboardLesson random={() => 0.5} />)
  fireEvent.click(screen.getByRole('checkbox', { name: '소리 켜기' }))
  fireEvent.click(screen.getByRole('button', { name: '도 찾기 시작' }))
  fireEvent.click(screen.getByRole('button', { name: '가운데 도 (4옥타브)' }))
  expect(playNoteNow).not.toHaveBeenCalled()
  expect(screen.getByRole('status', { name: '연습 결과' })).toHaveTextContent('맞음')
})

it('requests MIDI on user action and accepts external notes', async () => {
  render(<KeyboardLesson random={() => 0.5} />)
  expect(request).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'MIDI 연결' }))
  expect(request).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: '도 찾기 시작' }))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '레 (4옥타브)' })) })
  // MIDI 입력도 같은 표시·판정 경로를 거친다.
  await act(async () => onMidiNote(60))
  expect(screen.getByRole('status', { name: '연습 결과' })).toHaveTextContent('맞음')
  await act(async () => onMidiNote(21))
  expect(screen.getByRole('status', { name: '누른 건반' })).toHaveTextContent('라 · 0옥타브')
  await act(async () => onMidiNote(0))
  expect(screen.getByRole('status', { name: '누른 건반' })).toHaveTextContent('라 · 0옥타브')
})


it('offers all three Cs and changes the question even with fixed randomness', () => {
  render(<KeyboardLesson random={() => 0.999} />)
  expect(screen.getAllByRole('button', { name: /^(가운데 )?도 \(.*옥타브\)$/ })).toHaveLength(3)
  fireEvent.click(screen.getByRole('checkbox', { name: '소리 켜기' }))
  fireEvent.click(screen.getByRole('button', { name: '도 찾기 시작' }))
  expect(screen.getByTestId('do-target')).toHaveTextContent('5옥타브')
  fireEvent.click(screen.getByRole('button', { name: '도 (5옥타브)' }))
  expect(screen.getByRole('status', { name: '연습 결과' })).toHaveTextContent('맞음')
  fireEvent.click(screen.getByRole('button', { name: '새 문제' }))
  expect(screen.getByTestId('do-target')).toHaveTextContent('4옥타브')
  expect(screen.getByRole('status', { name: '연습 결과' })).not.toHaveTextContent('맞음')
})

it('centres middle C by changing only the overflowing region scrollLeft', () => {
  const width = jest.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(320)
  const scrollWidth = jest.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(660)
  render(<KeyboardLesson />)
  expect(screen.getByRole('region', { name: '학습 건반 (좌우 스크롤)' }).scrollLeft).toBe(170)
  expect(document.activeElement).toBe(document.body)
  expect(window.scrollY).toBe(0)
  width.mockRestore()
  scrollWidth.mockRestore()
})

it('leaves the scrollLeft alone when the keyboard fits', () => {
  const width = jest.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(800)
  const scrollWidth = jest.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(660)
  render(<KeyboardLesson />)
  expect(screen.getByRole('region', { name: '학습 건반 (좌우 스크롤)' }).scrollLeft).toBe(0)
  width.mockRestore()
  scrollWidth.mockRestore()
})
