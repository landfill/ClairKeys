import { act, fireEvent, render, screen } from '@testing-library/react'
import { ReadingAudioProvider, ListenButton } from '../ReadingAudio'
import { RHYTHM_EXAMPLES } from '@/lib/learn/rhythm'

const playNoteNow = jest.fn().mockResolvedValue(true)
const startAudio = jest.fn().mockResolvedValue(true)
const stopAudio = jest.fn()
const setVolume = jest.fn()
let clockStart = 0
const getCurrentTime = () => (performance.now() - clockStart) / 1000
jest.mock('@/hooks/useFallingNotesAudio', () => ({ DEFAULT_MASTER_GAIN: 0.5, useFallingNotesAudio: () => ({ playNoteNow, startAudio, stopAudio, setVolume, getCurrentTime }) }))
beforeEach(() => {
  jest.useFakeTimers()
  startAudio.mockReset().mockImplementation(async () => { clockStart = performance.now() + 50; return true })
  stopAudio.mockClear(); setVolume.mockClear(); playNoteNow.mockClear()
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })
const mixed = RHYTHM_EXAMPLES.find(item => item.id === 'note-eighth')!
it('schedules exact lengths and mutes the rest without adding a click engine', async () => {
  render(<ReadingAudioProvider><ListenButton rhythm={mixed} label="리듬" /></ReadingAudioProvider>)
  expect(startAudio).not.toHaveBeenCalled()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '리듬' })) })
  expect(startAudio).toHaveBeenCalledWith([{ midi: 67, start: 0, duration: 0.375 }, { midi: 67, start: 0.375, duration: 0.375 }], 0, 1, false)
  await act(async () => { await jest.advanceTimersByTimeAsync(800) })
  expect(setVolume).toHaveBeenLastCalledWith(0)
  expect(screen.getByRole('status', { name: '리듬 재생 차례' })).toHaveTextContent('3/4 · 4분쉼표')
  await act(async () => { await jest.advanceTimersByTimeAsync(2250) })
  expect(stopAudio).toHaveBeenCalled()
  expect(screen.queryByRole('status', { name: '리듬 재생 차례' })).toBeNull()
})
it('counts a full silent rest without initializing sounding audio', async () => {
  const rest = RHYTHM_EXAMPLES.find(item => item.id === 'rest-whole')!
  render(<ReadingAudioProvider><ListenButton rhythm={rest} label="쉼표" /></ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '쉼표' })) })
  expect(startAudio).not.toHaveBeenCalled()
  expect(playNoteNow).not.toHaveBeenCalled()
  expect(screen.getByRole('status', { name: '리듬 재생 차례' })).toHaveTextContent('온쉼표')
  await act(async () => { await jest.advanceTimersByTimeAsync(3000) })
  expect(screen.queryByRole('status', { name: '리듬 재생 차례' })).toBeNull()
})
it('clears timers and scheduled audio on unmount and when another example starts', async () => {
  const timers = jest.spyOn(globalThis, 'setTimeout')
  const clear = jest.spyOn(globalThis, 'clearTimeout')
  const { unmount } = render(<ReadingAudioProvider><ListenButton rhythm={mixed} label="리듬" /><ListenButton midis={[60]} label="음높이" /></ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '리듬' })) })
  const firstTimer = timers.mock.results[timers.mock.calls.findIndex(([, delay]) => delay === 50)].value
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '음높이' })) })
  expect(stopAudio).toHaveBeenCalled()
  expect(clear).toHaveBeenCalledWith(firstTimer)
  expect(playNoteNow).toHaveBeenCalledWith(60)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '리듬' })) })
  const pending = timers.mock.results[timers.mock.calls.findLastIndex(([, delay]) => delay === 50)].value
  unmount()
  expect(clear).toHaveBeenCalledWith(pending)
})
it('keeps the failure notice directly beneath the initiating rhythm button', async () => {
  startAudio.mockResolvedValue(false)
  render(<ReadingAudioProvider><ListenButton rhythm={mixed} label="리듬" /></ReadingAudioProvider>)
  const button = screen.getByRole('button', { name: '리듬' })
  await act(async () => { fireEvent.click(button) })
  expect(button.nextElementSibling).toHaveTextContent('소리를 재생하지 못했어요')
  expect(button.nextElementSibling).toHaveAttribute('role', 'status')
})

it('restarts a repeated click after cancelling the previous timer and schedule', async () => {
  const timers = jest.spyOn(globalThis, 'setTimeout')
  const clear = jest.spyOn(globalThis, 'clearTimeout')
  render(<ReadingAudioProvider><ListenButton rhythm={mixed} label="리듬" /></ReadingAudioProvider>)
  const button = screen.getByRole('button', { name: '리듬' })
  await act(async () => { fireEvent.click(button) })
  const pending = timers.mock.results[timers.mock.calls.findIndex(([, delay]) => delay === 50)].value
  await act(async () => { fireEvent.click(button) })
  expect(clear).toHaveBeenCalledWith(pending)
  expect(stopAudio).toHaveBeenCalledTimes(1)
  expect(startAudio).toHaveBeenCalledTimes(2)
  await act(async () => { await jest.advanceTimersByTimeAsync(3050) })
  expect(stopAudio).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('status', { name: '리듬 재생 차례' })).toBeNull()
})
