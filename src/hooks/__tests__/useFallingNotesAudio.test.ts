import { act, renderHook } from '@testing-library/react'
import {
  useFallingNotesAudio,
  DEFAULT_MASTER_GAIN,
  MAX_MASTER_GAIN,
} from '../useFallingNotesAudio'

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

const originalAudioContext = window.AudioContext
const originalWebkitAudioContext = (window as AudioWindow).webkitAudioContext

function makeAudioContext(state: AudioContextState): AudioContext {
  const gain = {
    value: 0,
  }
  const masterGain = {
    connect: jest.fn(),
    gain,
  }

  return {
    state,
    currentTime: 10,
    destination: {},
    createGain: jest.fn(() => masterGain),
    resume: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
  } as unknown as AudioContext
}

function setAudioContextConstructor(constructor?: typeof AudioContext) {
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    writable: true,
    value: constructor,
  })
  Object.defineProperty(window, 'webkitAudioContext', {
    configurable: true,
    writable: true,
    value: undefined,
  })
}

describe('useFallingNotesAudio', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    setAudioContextConstructor(originalAudioContext)
    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      writable: true,
      value: originalWebkitAudioContext,
    })
    jest.useRealTimers()
  })

  it('reports that playback cannot start when AudioContext is unavailable', async () => {
    setAudioContextConstructor(undefined)
    const { result } = renderHook(() => useFallingNotesAudio())
    let started: boolean | undefined

    await act(async () => {
      started = await result.current.startAudio([], 0, 1, false)
    })

    expect(started).toBe(false)
  })

  it('resumes a suspended AudioContext before using it as the playback clock', async () => {
    const context = makeAudioContext('suspended')
    ;(context.resume as jest.Mock).mockImplementation(async () => {
      Object.defineProperty(context, 'state', { value: 'running', configurable: true })
    })
    const constructor = jest.fn(() => context) as unknown as typeof AudioContext
    setAudioContextConstructor(constructor)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())
    let started: boolean | undefined

    await act(async () => {
      started = await result.current.startAudio([], 0, 1, false)
    })

    expect(started).toBe(true)
    expect(context.resume).toHaveBeenCalledTimes(1)

    unmount()
  })

  it('keeps playback stopped when a suspended AudioContext cannot resume', async () => {
    const context = makeAudioContext('suspended')
    ;(context.resume as jest.Mock).mockRejectedValue(new Error('resume denied'))
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    const constructor = jest.fn(() => context) as unknown as typeof AudioContext
    setAudioContextConstructor(constructor)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())
    let started: boolean | undefined

    await act(async () => {
      started = await result.current.startAudio([], 0, 1, false)
    })

    expect(started).toBe(false)
    expect(result.current.getTimingInfo().isPlaying).toBe(false)
    expect(warn).toHaveBeenCalledWith('AudioContext resume failed:', expect.any(Error))

    unmount()
    warn.mockRestore()
  })

  it('does not start after stop invalidates a pending resume request', async () => {
    const context = makeAudioContext('suspended')
    let finishResume: (() => void) | undefined
    ;(context.resume as jest.Mock).mockImplementation(() => new Promise<void>((resolve) => {
      finishResume = () => {
        Object.defineProperty(context, 'state', { value: 'running', configurable: true })
        resolve()
      }
    }))
    const constructor = jest.fn(() => context) as unknown as typeof AudioContext
    setAudioContextConstructor(constructor)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())
    let startPromise: Promise<boolean>

    act(() => {
      startPromise = result.current.startAudio([], 0, 1, false)
      result.current.stopAudio()
    })

    let started: boolean | undefined
    await act(async () => {
      finishResume?.()
      started = await startPromise!
    })

    expect(started).toBe(false)
    expect(result.current.getTimingInfo().isPlaying).toBe(false)

    unmount()
  })
  it('keeps a velocity-0 note silent through every scheduled gain event', async () => {
    // The canonical animation contract allows an explicit velocity of 0, and
    // PR #26 switched `||` to `??` specifically so such a note stays silent.
    // The piano-timbre envelope then reintroduced a floor: `exponentialRamp`
    // cannot land on zero, so the decay target was clamped to 1e-4 — and the
    // release scheduled that floor unconditionally, giving a silent note an
    // audible tail. This asserts on every value ever written to the note's gain.
    const scheduled: number[] = []

    const makeGainNode = () => ({
      connect: jest.fn(),
      gain: {
        value: 0,
        setValueAtTime: jest.fn((v: number) => scheduled.push(v)),
        linearRampToValueAtTime: jest.fn((v: number) => scheduled.push(v)),
        exponentialRampToValueAtTime: jest.fn((v: number) => scheduled.push(v)),
        cancelScheduledValues: jest.fn(),
      },
    })

    let gainCalls = 0
    const context = {
      state: 'running' as AudioContextState,
      currentTime: 10,
      destination: {},
      // The first createGain is the master bus; later ones belong to notes.
      createGain: jest.fn(() => {
        gainCalls += 1
        return gainCalls === 1
          ? { connect: jest.fn(), gain: { value: 0 } }
          : makeGainNode()
      }),
      createOscillator: jest.fn(() => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        frequency: { value: 0 },
        type: 'sine',
        setPeriodicWave: jest.fn(),
      })),
      createBiquadFilter: jest.fn(() => ({
        connect: jest.fn(),
        type: 'lowpass',
        frequency: { value: 0 },
        Q: { value: 0 },
      })),
      createPeriodicWave: jest.fn(() => ({})),
      resume: jest.fn(() => Promise.resolve()),
      close: jest.fn(() => Promise.resolve()),
    } as unknown as AudioContext

    const constructor = jest.fn(() => context) as unknown as typeof AudioContext
    setAudioContextConstructor(constructor)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    await act(async () => {
      await result.current.startAudio(
        [{ midi: 21, start: 0, duration: 1, hand: 'L', velocity: 0 }],
        0,
        1,
        false
      )
    })

    expect(scheduled.length).toBeGreaterThan(0)
    for (const value of scheduled) {
      expect(value).toBe(0)
    }

    unmount()
  })

  it('applies the default master gain and retunes it live within the safe ceiling', () => {
    // The runtime volume control writes to the master bus so a listener can find
    // the level to lock in as DEFAULT_MASTER_GAIN, and it must clamp to the
    // headroom ceiling rather than let a drag drive the bus into clipping.
    const targets: number[] = []
    const masterGain = {
      connect: jest.fn(),
      gain: {
        value: 0,
        setTargetAtTime: jest.fn((v: number) => targets.push(v)),
      },
    }
    const context = {
      state: 'running' as AudioContextState,
      currentTime: 3,
      destination: {},
      createGain: jest.fn(() => masterGain),
      resume: jest.fn(() => Promise.resolve()),
      close: jest.fn(() => Promise.resolve()),
    } as unknown as AudioContext

    const constructor = jest.fn(() => context) as unknown as typeof AudioContext
    setAudioContextConstructor(constructor)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    act(() => {
      // startAudio initialises the context; the bus should open at the default.
      result.current.startAudio([], 0, 1, false)
    })
    expect(masterGain.gain.value).toBe(DEFAULT_MASTER_GAIN)

    // A mid-range value passes through unchanged, and the applied value is
    // returned so the UI can store what the bus is actually at.
    let applied: number | undefined
    act(() => {
      applied = result.current.setVolume(0.3)
    })
    expect(targets[targets.length - 1]).toBeCloseTo(0.3)
    expect(applied).toBeCloseTo(0.3)

    // Above the ceiling: both the bus and the returned value clamp.
    act(() => {
      applied = result.current.setVolume(999)
    })
    expect(targets[targets.length - 1]).toBe(MAX_MASTER_GAIN)
    expect(applied).toBe(MAX_MASTER_GAIN)

    // Below zero: clamps to 0 both ways.
    act(() => {
      applied = result.current.setVolume(-5)
    })
    expect(targets[targets.length - 1]).toBe(0)
    expect(applied).toBe(0)

    unmount()
  })

  // A voice that outlives the transport is the regression this change is most
  // likely to introduce: `stopAudioNodes` walks handles the scheduler pushed, so
  // any new kind of source node has to end up in the same list. These pin the
  // guarantee against the pre-existing oscillator path so the sampler inherits
  // a test that already passes rather than one written to fit it.
  function makeRecordingContext() {
    const sources: Array<{ start: jest.Mock; stop: jest.Mock }> = []

    const makeGain = () => ({
      connect: jest.fn(),
      gain: {
        value: 0,
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
        setTargetAtTime: jest.fn(),
        cancelScheduledValues: jest.fn(),
      },
    })

    const context = {
      state: 'running' as AudioContextState,
      currentTime: 10,
      destination: {},
      createGain: jest.fn(makeGain),
      createOscillator: jest.fn(() => {
        const node = {
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          frequency: { value: 0 },
          type: 'sine',
          setPeriodicWave: jest.fn(),
          context: null as unknown,
        }
        node.context = context
        sources.push(node)
        return node
      }),
      createBiquadFilter: jest.fn(() => ({
        connect: jest.fn(),
        type: 'lowpass',
        frequency: { value: 0 },
        Q: { value: 0 },
      })),
      createPeriodicWave: jest.fn(() => ({})),
      resume: jest.fn(() => Promise.resolve()),
      close: jest.fn(() => Promise.resolve()),
    }

    return { context: context as unknown as AudioContext, sources }
  }

  /** Assert each voice was cut short near `now` rather than left to run out. */
  function expectCutShort(
    sources: Array<{ stop: jest.Mock }>,
    before: number[],
    now: number
  ) {
    expect(sources.length).toBeGreaterThan(0)
    sources.forEach((source, i) => {
      expect(source.stop.mock.calls.length).toBeGreaterThan(before[i])
      const lastStopAt = source.stop.mock.calls[source.stop.mock.calls.length - 1][0]
      expect(lastStopAt).toBeLessThanOrEqual(now + 0.05)
    })
  }

  it('cuts every sounding voice short when playback stops', async () => {
    const { context, sources } = makeRecordingContext()
    setAudioContextConstructor(jest.fn(() => context) as unknown as typeof AudioContext)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    // A 30-second note: its scheduled stop is far in the future, so only the
    // teardown path can end it.
    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 0, duration: 30, hand: 'R', velocity: 0.8 }],
        0,
        1,
        false
      )
    })

    const before = sources.map((s) => s.stop.mock.calls.length)

    act(() => {
      result.current.stopAudio()
    })

    expectCutShort(sources, before, context.currentTime)

    unmount()
  })

  it('cuts the previous voices short when seeking to a new position', async () => {
    const { context, sources } = makeRecordingContext()
    setAudioContextConstructor(jest.fn(() => context) as unknown as typeof AudioContext)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    const notes = [{ midi: 60, start: 0, duration: 30, hand: 'R' as const, velocity: 0.8 }]

    await act(async () => {
      await result.current.startAudio(notes, 0, 1, false)
    })

    const seekedFrom = sources.slice()
    const before = seekedFrom.map((s) => s.stop.mock.calls.length)

    // Seeking funnels through startAudio, which must tear the old schedule down
    // before anchoring the new one — otherwise the pre-seek note keeps sounding
    // over the post-seek audio.
    await act(async () => {
      await result.current.startAudio(notes, 12, 1, false)
    })

    expectCutShort(seekedFrom, before, context.currentTime)

    unmount()
  })
})
