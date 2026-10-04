import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { ListenButton, ReadingAudioProvider } from '../ReadingAudio'
const playNoteNow = jest.fn().mockResolvedValue(true)
const stopAudio = jest.fn()
const stopTappedNotes = jest.fn()
const setVolume = jest.fn()
jest.mock('@/hooks/useFallingNotesAudio', () => ({ useFallingNotesAudio: () => ({ playNoteNow, stopAudio, stopTappedNotes, setVolume }) }))
beforeAll(() => { Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: jest.fn() }) })
afterAll(() => { Reflect.deleteProperty(Element.prototype, 'scrollIntoView') })
beforeEach(() => { playNoteNow.mockReset().mockResolvedValue(true); jest.useFakeTimers() })
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

it('plays the provided MIDI sequence in order and cancels queued notes on unmount', async () => {
  const { unmount } = render(<ReadingAudioProvider><ListenButton midis={[64, 67, 71]} label="줄 음 들어 보기" /></ReadingAudioProvider>)
  expect(playNoteNow).not.toHaveBeenCalled()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^줄 음 들어 보기$/ })) })
  expect(playNoteNow.mock.calls).toEqual([[64]])
  await act(async () => { await jest.advanceTimersByTimeAsync(1200) })
  expect(playNoteNow.mock.calls).toEqual([[64], [67]])
  unmount()
  await act(async () => { await jest.advanceTimersByTimeAsync(5000) })
  expect(playNoteNow.mock.calls).toEqual([[64], [67]])
})
it('reports silent playback without removing the example', async () => {
  playNoteNow.mockResolvedValue(false)
  render(<ReadingAudioProvider><p>음 설명</p><ListenButton midis={[60]} label="들어 보기" /></ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^들어 보기$/ })) })
  expect(screen.getByRole('status')).toHaveTextContent('소리를 재생하지 못했어요')
  expect(screen.getByText('음 설명')).toBeInTheDocument()
})

it.each(['silent', 'throw', 'reject'])('shows %s failure only beside the initiating button and removes it after a successful retry', async failure => {
  if (failure === 'throw') playNoteNow.mockImplementation(() => { throw new Error('audio unavailable') })
  else if (failure === 'reject') playNoteNow.mockRejectedValue(new Error('audio unavailable'))
  else playNoteNow.mockResolvedValue(false)
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  render(<ReadingAudioProvider>
    <p>음 설명</p>
    <ListenButton midis={[60]} label="첫 예시 들어 보기" />
    <ListenButton midis={[64]} label="다른 예시 들어 보기" />
  </ReadingAudioProvider>)
  const first = screen.getByRole('button', { name: '첫 예시 들어 보기' })
  const other = screen.getByRole('button', { name: '다른 예시 들어 보기' })
  await act(async () => { fireEvent.click(first) })
  const notice = screen.getByRole('status')
  expect(first.nextElementSibling).toBe(notice)
  expect(within(other.parentElement!).queryByRole('status')).toBeNull()
  expect(notice).toHaveAttribute('aria-live', 'polite')
  expect(screen.getByText('음 설명')).toBeInTheDocument()
  playNoteNow.mockResolvedValue(true)
  await act(async () => { fireEvent.click(first) })
  expect(screen.queryByRole('status')).toBeNull()
})

it('ignores an older pending failure after a different button starts playback', async () => {
  let finishFirst!: (played: boolean) => void
  playNoteNow.mockImplementationOnce(() => new Promise<boolean>(resolve => { finishFirst = resolve }))
  render(<ReadingAudioProvider>
    <ListenButton midis={[60, 62]} label="첫 예시" />
    <ListenButton midis={[64]} label="다른 예시" />
  </ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '첫 예시' })) })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '다른 예시' })) })
  await act(async () => { finishFirst(false); await jest.advanceTimersByTimeAsync(5000) })
  expect(screen.queryByRole('status')).toBeNull()
  expect(playNoteNow.mock.calls).toEqual([[60], [64]])
})

it('scrolls the newly shown failure notice once with nearest alignment without changing focus', async () => {
  const scroll = jest.spyOn(Element.prototype, 'scrollIntoView')
  playNoteNow.mockResolvedValue(false)
  render(<ReadingAudioProvider><ListenButton midis={[60, 62]} label="들어 보기" /></ReadingAudioProvider>)
  const button = screen.getByRole('button', { name: '들어 보기' })
  button.focus()
  await act(async () => { fireEvent.click(button) })
  expect(scroll).toHaveBeenCalledTimes(1)
  expect(scroll.mock.instances[0]).toBe(screen.getByRole('status'))
  expect(scroll).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
  expect(button).toHaveFocus()
  await act(async () => { await jest.advanceTimersByTimeAsync(1200) })
  expect(scroll).toHaveBeenCalledTimes(1)
})
