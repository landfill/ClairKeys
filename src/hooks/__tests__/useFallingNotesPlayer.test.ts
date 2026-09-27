import { act, renderHook } from '@testing-library/react'
import { useFallingNotesPlayer } from '../useFallingNotesPlayer'
import type { FallingNote } from '@/types/fallingNotes'

let mockClock = 0
const mockAudio = {
  startAudio: jest.fn(async (_notes: FallingNote[], offset: number, _tempo?: number, _mute?: boolean) => {
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

// A practice session is not the same thing as a sounding score. Pausing is a
// pause inside the session the reader is already in; only a stop — theirs or
// the end of the piece — returns them to setup.
describe('useFallingNotesPlayer practice session', () => {
  it('opens the session only once audio has actually started', async () => {
    const { result } = renderHook(() => useFallingNotesPlayer(notes))
    expect(result.current.isSessionActive).toBe(false)

    mockAudio.startAudio.mockResolvedValueOnce(false)
    await act(async () => { await result.current.play() })
    expect(result.current.isSessionActive).toBe(false)

    await act(async () => { await result.current.play() })
    expect(result.current.isSessionActive).toBe(true)
  })

  it('keeps the session open across a pause', async () => {
    const { result } = renderHook(() => useFallingNotesPlayer(notes))
    await act(async () => { await result.current.play() })
    act(() => result.current.pause())

    expect(result.current.isPlaying).toBe(false)
    expect(result.current.isSessionActive).toBe(true)
  })

  it('closes the session when the reader stops', async () => {
    const { result } = renderHook(() => useFallingNotesPlayer(notes))
    await act(async () => { await result.current.play() })
    act(() => result.current.stop())

    expect(result.current.isSessionActive).toBe(false)
  })

  it('closes the session when the score runs out', async () => {
    const { result } = renderHook(() => useFallingNotesPlayer(notes))
    await act(async () => { await result.current.play() })

    // The auto-stop is a stop like any other: the playhead is back at zero and
    // there is nothing left to resume.
    await frameAt(13)

    expect(result.current.isPlaying).toBe(false)
    expect(result.current.isSessionActive).toBe(false)
    expect(result.current.currentTime).toBe(0)
  })

  it('leaves the session alone when audio cannot restart mid-piece', async () => {
    const { result } = await playingLoop()
    mockAudio.startAudio.mockResolvedValueOnce(false)
    await frameAt(4.1)

    // A failed restart is not a decision to leave the piece. The reader stays
    // where they were, paused, with the transport still under their thumb.
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.isSessionActive).toBe(true)
  })
})

describe('useFallingNotesPlayer wait mode', () => {
  const piece: FallingNote[] = [
    { midi: 60, start: 1, duration: 0.5 },
    { midi: 64, start: 2, duration: 0.5 },
    { midi: 67, start: 2, duration: 0.5 },
    { midi: 72, start: 3, duration: 0.5 },
  ]
  const waitSteps = [{ time: 1, pitches: [60] }, { time: 2, pitches: [64, 67] }, { time: 3, pitches: [72] }]
  const setup = () => renderHook(() => useFallingNotesPlayer(piece, { waitSteps }))

  it('runs the clock silently and stops on the next step until its keys are pressed', async () => {
    const hook = setup()
    await act(async () => { await hook.result.current.play() })
    expect(mockAudio.startAudio.mock.calls[0][3]).toBe(true) // muted: the reader makes the sound

    await frameAt(0.5)
    expect(hook.result.current.waitingFor).toBeNull()
    await frameAt(1.2)
    expect(hook.result.current.waitingFor).toEqual([60])
    expect(hook.result.current.currentTime).toBe(1)
    expect(hook.result.current.isPlaying).toBe(true)
    expect(mockAudio.stopAudio).toHaveBeenCalled()

    // A wrong key changes nothing.
    mockAudio.startAudio.mockClear()
    await act(async () => { expect(await hook.result.current.pressKey(61)).toBe(false) })
    expect(hook.result.current.waitingFor).toEqual([60])
    await act(async () => { expect(await hook.result.current.pressKey(60)).toBe(true) })
    expect(hook.result.current.waitingFor).toBeNull()
    expect(mockAudio.startAudio).toHaveBeenCalledTimes(1)
    expect(mockAudio.startAudio.mock.calls[0][1]).toBe(1)
    expect(mockAudio.startAudio.mock.calls[0][3]).toBe(true)
  })

  it('waits for every key of a chord, in any order, and then moves to the next step', async () => {
    const hook = setup()
    await act(async () => { await hook.result.current.play() })
    await frameAt(1.1)
    await act(async () => { await hook.result.current.pressKey(60) })
    await frameAt(2.4)
    expect(hook.result.current.waitingFor).toEqual([64, 67])
    await act(async () => { await hook.result.current.pressKey(67) })
    expect(hook.result.current.waitingFor).toEqual([64])
    await act(async () => { await hook.result.current.pressKey(64) })
    expect(hook.result.current.waitingFor).toBeNull()
    await frameAt(2.5)
    expect(hook.result.current.waitingFor).toBeNull()
    await frameAt(3.1)
    expect(hook.result.current.waitingFor).toEqual([72])
  })

  it('waits for the same step again after a pause, and for the step at a seek target', async () => {
    const hook = setup()
    await act(async () => { await hook.result.current.play() })
    await frameAt(1.3)
    act(() => hook.result.current.pause())
    expect(hook.result.current.waitingFor).toBeNull()
    expect(hook.result.current.currentTime).toBe(1)
    await act(async () => { await hook.result.current.play() })
    await frameAt(1)
    expect(hook.result.current.waitingFor).toEqual([60])

    await act(async () => { await hook.result.current.seek(2) })
    expect(hook.result.current.waitingFor).toBeNull()
    await frameAt(2)
    expect(hook.result.current.waitingFor).toEqual([64, 67])
  })

  it('ignores key presses outside a wait', async () => {
    const hook = setup()
    await act(async () => { expect(await hook.result.current.pressKey(60)).toBe(false) })
    expect(mockAudio.startAudio).not.toHaveBeenCalled()
  })
})
