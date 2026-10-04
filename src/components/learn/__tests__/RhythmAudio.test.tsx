import { act, fireEvent, render, screen } from '@testing-library/react'
import { ReadingAudioProvider, ListenButton } from '../ReadingAudio'
import { RHYTHM_EXAMPLES } from '@/lib/learn/rhythm'

const playNoteNow = jest.fn().mockResolvedValue(true)
const startAudio = jest.fn().mockResolvedValue(true)
const stopAudio = jest.fn()
const stopTappedNotes = jest.fn()
const setVolume = jest.fn()
let clockStart = 0
const getCurrentTime = () => (performance.now() - clockStart) / 1000
jest.mock('@/hooks/useFallingNotesAudio', () => ({ DEFAULT_MASTER_GAIN: 0.5, useFallingNotesAudio: () => ({ playNoteNow, startAudio, stopAudio, stopTappedNotes, setVolume, getCurrentTime }) }))
beforeEach(() => {
  jest.useFakeTimers()
  startAudio.mockReset().mockImplementation(async () => { clockStart = performance.now() + 50; return true })
  stopTappedNotes.mockClear(); stopAudio.mockClear(); setVolume.mockClear(); playNoteNow.mockClear()
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })
const mixed = RHYTHM_EXAMPLES.find(item => item.id === 'note-eighth')!
it('schedules exact lengths and mutes the rest without adding a click engine', async () => {
  render(<ReadingAudioProvider><ListenButton rhythm={mixed} label="리듬" /></ReadingAudioProvider>)
  expect(startAudio).not.toHaveBeenCalled()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '리듬' })) })
  expect(startAudio).toHaveBeenCalledWith([{ midi: 67, start: 0, duration: 0.375, velocity: 0.85 }, { midi: 67, start: 0.375, duration: 0.375, velocity: 0.45 }], 0, 1, false)
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

it('shows preparation until sample loading and the audio lead have finished', async () => {
  let ready!: (value: boolean) => void
  startAudio.mockImplementationOnce(() => new Promise<boolean>(resolve => { ready = resolve }))
  render(<ReadingAudioProvider><ListenButton rhythm={mixed} label="리듬" /></ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '리듬' })) })
  expect(screen.getByRole('status', { name: '소리 준비 상태' })).toHaveTextContent('소리를 준비하고 있어요')
  expect(screen.queryByRole('status', { name: '리듬 재생 차례' })).toBeNull()
  await act(async () => { await jest.advanceTimersByTimeAsync(2500) })
  expect(screen.queryByRole('status', { name: '리듬 재생 차례' })).toBeNull()
  await act(async () => { clockStart = performance.now() + 50; ready(true) })
  expect(screen.queryByRole('status', { name: '리듬 재생 차례' })).toBeNull()
  await act(async () => { await jest.advanceTimersByTimeAsync(50) })
  expect(screen.queryByRole('status', { name: '소리 준비 상태' })).toBeNull()
  expect(screen.getByRole('status', { name: '리듬 재생 차례' })).toHaveTextContent('1/4 · 8분음표')
  expect(screen.queryByText(/소리를 재생하지 못했어요/)).toBeNull()
})
it.each(['pending', 'false', 'throw'])('continues every rhythm event on the wall clock after %s audio failure', async failure => {
  if (failure === 'pending') startAudio.mockImplementationOnce(() => new Promise<boolean>(() => {}))
  else if (failure === 'throw') startAudio.mockImplementationOnce(() => { throw new Error('audio unavailable') })
  else startAudio.mockResolvedValueOnce(false)
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  render(<ReadingAudioProvider><ListenButton rhythm={mixed} label="리듬" /></ReadingAudioProvider>)
  const button = screen.getByRole('button', { name: '리듬' })
  await act(async () => { fireEvent.click(button) })
  if (failure === 'pending') {
    await act(async () => { await jest.advanceTimersByTimeAsync(3999) })
    expect(screen.getByRole('status', { name: '소리 준비 상태' })).toBeInTheDocument()
    await act(async () => { await jest.advanceTimersByTimeAsync(1) })
  }
  expect(button.nextElementSibling).toHaveTextContent('소리를 재생하지 못했어요')
  expect(button.nextElementSibling).toHaveAttribute('role', 'status')
  expect(screen.queryByRole('status', { name: '소리 준비 상태' })).toBeNull()
  expect(screen.getByRole('status', { name: '리듬 재생 차례' })).toHaveTextContent('1/4 · 8분음표')
  for (const [milliseconds, label] of [[375, '2/4 · 8분음표'], [375, '3/4 · 4분쉼표'], [750, '4/4 · 2분쉼표']] as const) {
    await act(async () => { await jest.advanceTimersByTimeAsync(milliseconds) })
    expect(screen.getByRole('status', { name: '리듬 재생 차례' })).toHaveTextContent(label)
  }
  await act(async () => { await jest.advanceTimersByTimeAsync(1500) })
  expect(screen.queryByRole('status', { name: '리듬 재생 차례' })).toBeNull()
})
it('stops a late audio start without restarting the silent playback counter', async () => {
  let ready!: (value: boolean) => void
  startAudio.mockImplementationOnce(() => new Promise<boolean>(resolve => { ready = resolve }))
  render(<ReadingAudioProvider><ListenButton rhythm={mixed} label="리듬" /></ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '리듬' })) })
  await act(async () => { await jest.advanceTimersByTimeAsync(4750) })
  const stops = stopAudio.mock.calls.length
  await act(async () => { ready(true) })
  expect(stopAudio).toHaveBeenCalledTimes(stops + 1)
  expect(screen.getByRole('status', { name: '리듬 재생 차례' })).toHaveTextContent('3/4 · 4분쉼표')
})
it.each(['switch', 'repeat', 'unmount'])('clears a pending audio-start deadline on %s', async action => {
  startAudio.mockImplementation(() => new Promise<boolean>(() => {}))
  const { unmount } = render(<ReadingAudioProvider><ListenButton rhythm={mixed} label="리듬" /><ListenButton midis={[60]} label="음높이" /></ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '리듬' })) })
  await act(async () => { await jest.advanceTimersByTimeAsync(1000) })
  if (action === 'unmount') unmount()
  else await act(async () => { fireEvent.click(screen.getByRole('button', { name: action === 'repeat' ? '리듬' : '음높이' })) })
  await act(async () => { await jest.advanceTimersByTimeAsync(3000) })
  expect(screen.queryByText(/소리를 재생하지 못했어요/)).toBeNull()
  expect(screen.queryByRole('status', { name: '리듬 재생 차례' })).toBeNull()
  if (action !== 'repeat') expect(jest.getTimerCount()).toBe(0)
})
it.each([
  ['음높이', '리듬'], ['리듬', '음높이'], ['리듬', '다른 리듬'],
  ['음높이', '음높이'], ['리듬', '리듬'],
])('cancels both the timer and sounding voices when %s changes to %s', async (from, to) => {
  const timers = jest.spyOn(globalThis, 'setTimeout')
  const clear = jest.spyOn(globalThis, 'clearTimeout')
  const { unmount } = render(<ReadingAudioProvider>
    <ListenButton midis={[60, 62]} label="음높이" />
    <ListenButton rhythm={mixed} label="리듬" />
    <ListenButton rhythm={RHYTHM_EXAMPLES.find(item => item.id === 'meter-six')!} label="다른 리듬" />
  </ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: from })) })
  const delay = from === '음높이' ? 1200 : 50
  const pending = timers.mock.results[timers.mock.calls.findLastIndex(([, ms]) => ms === delay)].value
  const stops = stopAudio.mock.calls.length
  const taps = stopTappedNotes.mock.calls.length
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: to })) })
  expect(clear).toHaveBeenCalledWith(pending)
  expect(stopAudio).toHaveBeenCalledTimes(stops + 1)
  expect(stopTappedNotes).toHaveBeenCalledTimes(taps + 1)
  unmount()
})

it('does not revive an old preparation after another example starts', async () => {
  let ready!: (value: boolean) => void
  startAudio.mockImplementationOnce(() => new Promise<boolean>(resolve => { ready = resolve }))
  render(<ReadingAudioProvider><ListenButton rhythm={mixed} label="리듬" /><ListenButton midis={[60]} label="음높이" /></ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '리듬' })) })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '음높이' })) })
  await act(async () => { ready(true); await jest.advanceTimersByTimeAsync(5000) })
  expect(stopAudio).toHaveBeenCalled()
  expect(screen.queryByRole('status', { name: '소리 준비 상태' })).toBeNull()
  expect(screen.queryByRole('status', { name: '리듬 재생 차례' })).toBeNull()
})
it.each([
  ['meter-three', [0.85, 0.45, 0.65, 0.45, 0.65, 0.45]],
  ['meter-six', [0.85, 0.45, 0.45, 0.65, 0.45, 0.45]],
])('passes the audible group accents into the scheduler for %s', async (id, velocities) => {
  render(<ReadingAudioProvider><ListenButton rhythm={RHYTHM_EXAMPLES.find(item => item.id === id)!} label="리듬" /></ReadingAudioProvider>)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '리듬' })) })
  expect(startAudio.mock.calls[0][0].map((note: { velocity: number }) => note.velocity)).toEqual(velocities)
})
