import { act, renderHook } from '@testing-library/react'
import { useFallingNotesPlayer } from '../useFallingNotesPlayer'
import type { FallingNote } from '@/types/fallingNotes'

let mockClock = 0
const mockAudio = {
  startAudio: jest.fn(async (_notes: FallingNote[], offset: number) => {
    mockClock = offset
    return true
  }),
  stopAudio: jest.fn(),
  getCurrentTime: jest.fn(() => mockClock),
  updateTempoScale: jest.fn(),
  setOffsetTime: jest.fn((time: number) => { mockClock = time }),
  setVolume: jest.fn((value: number) => value),
  sampleStatus: 'ready',
  reset: jest.fn(() => { mockClock = 0 }),
}

jest.mock('../useFallingNotesAudio', () => ({
  DEFAULT_MASTER_GAIN: 0.8,
  // Match the real hook's stable callbacks: new mocks per render would restart
  // the effect and conceal the missing frame after a successful seek.
  useFallingNotesAudio: () => mockAudio,
}))

const notes: FallingNote[] = [{ midi: 60, start: 0, duration: 10 }]
const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 0

beforeEach(() => {
  jest.clearAllMocks()
  mockClock = 0
  frames.clear()
  nextFrame = 0
  mockAudio.startAudio.mockImplementation(async (_notes, offset) => {
    mockClock = offset
    return true
  })
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++nextFrame, callback)
    return nextFrame
  })
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
})

afterEach(() => { jest.restoreAllMocks() })

async function frameAt(time: number) {
  await act(async () => {
    mockClock = time
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach(callback => callback(0))
  })
}

async function playingLoop() {
  const hook = renderHook(() => useFallingNotesPlayer(notes))
  await act(async () => { await hook.result.current.seek(2) })
  act(() => hook.result.current.markLoopStart())
  await act(async () => { await hook.result.current.seek(4) })
  act(() => hook.result.current.markLoopEnd())
  await act(async () => { await hook.result.current.seek(2) })
  await act(async () => { await hook.result.current.play() })
  return hook
}

describe('useFallingNotesPlayer loop lifecycle', () => {
  it('commits B only when it makes a valid A-B interval', async () => {
    const { result } = renderHook(() => useFallingNotesPlayer(notes))
    await act(async () => { await result.current.seek(4) })
    act(() => result.current.markLoopStart())
    act(() => result.current.markLoopEnd())
    expect(result.current.loopEnd).toBeNull()
    await act(async () => { await result.current.seek(6) })
    act(() => result.current.markLoopEnd())
    expect(result.current.loopEnd).toBe(6)
  })

  it('keeps one frame loop and follows the audio clock through repeated wraps', async () => {
    const { result } = await playingLoop()
    for (let cycle = 0; cycle < 3; cycle++) {
      await frameAt(4.1)
      expect(result.current.currentTime).toBe(2)
      expect(frames.size).toBe(1)
      await frameAt(2.5)
      expect(result.current.currentTime).toBe(2.5)
    }
    expect(mockAudio.startAudio).toHaveBeenCalledTimes(4)
    expect(result.current.isPlaying).toBe(true)
  })

  it('waits for a delayed seek before scheduling the next frame', async () => {
    await playingLoop()
    let finish!: (started: boolean) => void
    mockAudio.startAudio.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await frameAt(4.1)
    expect(frames.size).toBe(0)
    await frameAt(4.2)
    expect(mockAudio.startAudio).toHaveBeenCalledTimes(2)
    await act(async () => { finish(true) })
    expect(frames.size).toBe(1)
  })

  it.each(['pause', 'stop', 'unmount'] as const)(
    'does not resurrect a pending wrap after %s', async action => {
      const hook = await playingLoop()
      let finish!: (started: boolean) => void
      mockAudio.startAudio.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
      await frameAt(4.1)
      act(() => {
        if (action === 'unmount') hook.unmount()
        else hook.result.current[action]()
      })
      await act(async () => { finish(true) })
      expect(frames.size).toBe(0)
      if (action !== 'unmount') expect(hook.result.current.isPlaying).toBe(false)
    },
  )

  it('does not add a second frame loop when markers change during a pending wrap', async () => {
    const { result } = await playingLoop()
    let finish!: (started: boolean) => void
    mockAudio.startAudio.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await frameAt(4.1)
    act(() => result.current.clearLoop())
    expect(frames.size).toBe(1)
    await act(async () => { finish(true) })
    expect(frames.size).toBe(1)
  })

  it('stops the frame loop when audio cannot restart', async () => {
    const { result } = await playingLoop()
    mockAudio.startAudio.mockResolvedValueOnce(false)
    await frameAt(4.1)
    expect(result.current.isPlaying).toBe(false)
    expect(frames.size).toBe(0)
  })
})
