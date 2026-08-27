import { act, renderHook } from '@testing-library/react'
import { useFallingNotesAudio, SAMPLE_LOAD_WAIT_MS } from '../useFallingNotesAudio'
import { SAMPLE_PEAK_GAIN, damperReleaseSec } from '@/utils/pianoSamples'

/**
 * The recorded-sample branch of the playback path.
 *
 * Kept out of `useFallingNotesAudio.test.ts` because it needs the sample bank
 * replaced wholesale: that file's AudioContext doubles deliberately expose no
 * `decodeAudioData`, which is what keeps them on the synthesised fallback.
 */

const mockPlaybackRate = 1.5
const mockBufferDuration = 6
let mockVoiceFor: jest.Mock
let mockLoad: jest.Mock

jest.mock('@/utils/pianoSampleBank', () => ({
  getPianoSampleBank: jest.fn(() => ({
    voiceFor: (midi: number) => mockVoiceFor(midi),
    load: () => mockLoad(),
  })),
  disposePianoSampleBank: jest.fn(),
}))

interface RecordedGain {
  setValueAtTime: jest.Mock
  linearRampToValueAtTime: jest.Mock
  exponentialRampToValueAtTime: jest.Mock
}

function makeSampleContext() {
  const noteGains: RecordedGain[] = []
  const sources: Array<{
    start: jest.Mock
    stop: jest.Mock
    playbackRate: { value: number }
    buffer: AudioBuffer | null
  }> = []

  let gainCalls = 0
  const context = {
    state: 'running' as AudioContextState,
    currentTime: 10,
    destination: {},
    // Present so the hook's capability guard opens the sample path.
    decodeAudioData: jest.fn(),
    createGain: jest.fn(() => {
      gainCalls += 1
      const gain = {
        value: 0,
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
        setTargetAtTime: jest.fn(),
        cancelScheduledValues: jest.fn(),
      }
      // The first createGain is the master bus; the rest belong to notes.
      if (gainCalls > 1) noteGains.push(gain)
      return { connect: jest.fn(), gain }
    }),
    createBufferSource: jest.fn(() => {
      const node = {
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        playbackRate: { value: 1 },
        buffer: null as AudioBuffer | null,
        context: null as unknown,
      }
      node.context = context
      sources.push(node)
      return node
    }),
    createOscillator: jest.fn(),
    createBiquadFilter: jest.fn(),
    createPeriodicWave: jest.fn(),
    resume: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
  }

  return { context: context as unknown as AudioContext, noteGains, sources, raw: context }
}

function useContext(context: AudioContext) {
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    writable: true,
    value: jest.fn(() => context),
  })
  Object.defineProperty(window, 'webkitAudioContext', {
    configurable: true,
    writable: true,
    value: undefined,
  })
}

const originalAudioContext = window.AudioContext

describe('useFallingNotesAudio - recorded samples', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockLoad = jest.fn(() => Promise.resolve({
      status: 'ready',
      readyCount: 30,
      totalCount: 30,
    }))
    mockVoiceFor = jest.fn(() => ({
      buffer: { duration: mockBufferDuration } as AudioBuffer,
      playbackRate: mockPlaybackRate,
    }))
  })

  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: originalAudioContext,
    })
    jest.useRealTimers()
  })

  it('plays a sampled note through a buffer source at the transposed rate', async () => {
    const { context, sources, raw } = makeSampleContext()
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 0, duration: 1, hand: 'R', velocity: 0.8 }],
        0,
        1,
        false
      )
    })

    expect(sources).toHaveLength(1)
    expect(sources[0].buffer).not.toBeNull()
    expect(sources[0].playbackRate.value).toBe(mockPlaybackRate)
    expect(sources[0].start).toHaveBeenCalled()

    // A recording carries its own spectrum, so the synthesised path's oscillator
    // and its lowpass must not be built alongside it.
    expect(raw.createOscillator).not.toHaveBeenCalled()
    expect(raw.createBiquadFilter).not.toHaveBeenCalled()

    unmount()
  })

  it('applies only a damper release, never the synthesised decay', async () => {
    // The whole reason for sampling: the recording already decays. Scheduling
    // the exponential decay from `envelopeBreakpoints` on top would fade an
    // already-fading note, and it would die noticeably early.
    const { context, noteGains } = makeSampleContext()
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    const velocity = 0.5
    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 0, duration: 2, hand: 'R', velocity }],
        0,
        1,
        false
      )
    })

    expect(noteGains).toHaveLength(1)
    const gain = noteGains[0]

    expect(gain.exponentialRampToValueAtTime).not.toHaveBeenCalled()

    // Held flat at the velocity-scaled peak from the strike to the note's end.
    const expectedPeak = velocity * SAMPLE_PEAK_GAIN
    const holds = gain.setValueAtTime.mock.calls
    expect(holds).toHaveLength(2)
    for (const [value] of holds) {
      expect(value).toBeCloseTo(expectedPeak, 6)
    }
    const strikeAt = holds[0][1]
    const endAt = holds[1][1]
    expect(endAt).toBeGreaterThan(strikeAt)

    // Then a single ramp to silence, one damper-release long.
    expect(gain.linearRampToValueAtTime).toHaveBeenCalledTimes(1)
    const [target, silentAt] = gain.linearRampToValueAtTime.mock.calls[0]
    expect(target).toBe(0)
    expect(silentAt - endAt).toBeCloseTo(damperReleaseSec(60), 6)

    unmount()
  })

  it('keeps a velocity-0 sampled note silent', async () => {
    // The canonical animation contract allows velocity 0, and the synthesised
    // path guards it explicitly. The sample path must not reintroduce a floor.
    const { context, noteGains } = makeSampleContext()
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 0, duration: 1, hand: 'R', velocity: 0 }],
        0,
        1,
        false
      )
    })

    const gain = noteGains[0]
    const scheduled = [
      ...gain.setValueAtTime.mock.calls,
      ...gain.linearRampToValueAtTime.mock.calls,
      ...gain.exponentialRampToValueAtTime.mock.calls,
    ].map((call) => call[0])

    expect(scheduled.length).toBeGreaterThan(0)
    for (const value of scheduled) {
      expect(value).toBe(0)
    }

    unmount()
  })

  it('cuts sampled voices short when playback stops', async () => {
    // The same guarantee the oscillator path has: a buffer source scheduled to
    // run for another 30 seconds must be ended by the teardown, not left to
    // ring over whatever plays next.
    const { context, sources } = makeSampleContext()
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

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

    expect(sources.length).toBeGreaterThan(0)
    sources.forEach((source, i) => {
      expect(source.stop.mock.calls.length).toBeGreaterThan(before[i])
      const calls = source.stop.mock.calls
      expect(calls[calls.length - 1][0]).toBeLessThanOrEqual(context.currentTime + 0.05)
    })

    unmount()
  })

  it('falls back to synthesis for a note whose sample has not loaded', async () => {
    // Samples decode one at a time, so early in a session most notes have none.
    // Those must still sound, using the synthesised tone.
    mockVoiceFor = jest.fn(() => null)
    const { context, raw } = makeSampleContext()
    const oscillator = {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: { value: 0 },
      type: 'sine',
      setPeriodicWave: jest.fn(),
      context,
    }
    raw.createOscillator.mockReturnValue(oscillator)
    raw.createBiquadFilter.mockReturnValue({
      connect: jest.fn(),
      type: 'lowpass',
      frequency: { value: 0 },
      Q: { value: 0 },
    })
    raw.createPeriodicWave.mockReturnValue({})
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 0, duration: 1, hand: 'R', velocity: 0.8 }],
        0,
        1,
        false
      )
    })

    expect(raw.createBufferSource).not.toHaveBeenCalled()
    expect(oscillator.start).toHaveBeenCalled()

    unmount()
  })

  it('starts a note from the beginning of its recording', async () => {
    const { context, sources } = makeSampleContext()
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 0, duration: 1, hand: 'R', velocity: 0.8 }],
        0,
        1,
        false
      )
    })

    const [, offset] = sources[0].start.mock.calls[0]
    expect(offset).toBe(0)

    unmount()
  })

  it('resumes mid-recording when seeking into a note already sounding', async () => {
    // Without the offset the recorded hammer strike replays on every seek into a
    // held note. That was inaudible with the synthesised path's 4 ms attack and
    // is not with a real one.
    const { context, sources } = makeSampleContext()
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    // The note began at song second 4; playback starts at second 5, one second
    // into it.
    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 4, duration: 10, hand: 'R', velocity: 0.8 }],
        5,
        1,
        false
      )
    })

    expect(sources).toHaveLength(1)
    const [startAt, offset] = sources[0].start.mock.calls[0]

    // Output time maps to buffer position by the playback rate.
    const skipped = startAt - (context.currentTime + 0.05 - 1)
    expect(offset).toBeCloseTo(skipped * mockPlaybackRate, 6)
    expect(offset).toBeGreaterThan(0)

    unmount()
  })

  it('never seeks past the end of a recording', async () => {
    // `start` throws on an offset beyond the buffer, which would drop the note.
    const { context, sources } = makeSampleContext()
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    // Seek 30 seconds into a note whose recording is only 6 seconds long.
    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 0, duration: 60, hand: 'R', velocity: 0.8 }],
        30,
        1,
        false
      )
    })

    const [, offset] = sources[0].start.mock.calls[0]
    expect(offset).toBe(mockBufferDuration)

    unmount()
  })

  it('waits for the sample set before sounding the first note', async () => {
    // Measured in a real browser: without this the opening notes synthesise
    // while the bank decodes, and the instrument changes a second into the
    // piece. Playback must not anchor its clock until the samples are there.
    let finishLoad: (() => void) | undefined
    mockLoad = jest.fn(
      () => new Promise((resolve) => {
        finishLoad = () => resolve({
          status: 'ready',
          readyCount: 30,
          totalCount: 30,
        })
      })
    )

    const { context, sources } = makeSampleContext()
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    let started: boolean | undefined
    let startPromise: Promise<boolean>
    act(() => {
      startPromise = result.current.startAudio(
        [{ midi: 60, start: 0, duration: 1, hand: 'R', velocity: 0.8 }],
        0,
        1,
        false
      )
      void startPromise.then((value) => {
        started = value
      })
    })

    // Still loading: nothing has been scheduled and the caller is still waiting.
    await act(async () => {
      await Promise.resolve()
    })
    expect(sources).toHaveLength(0)
    expect(started).toBeUndefined()
    expect(result.current.sampleStatus).toBe('loading')

    await act(async () => {
      finishLoad?.()
      started = await startPromise!
    })

    expect(started).toBe(true)
    expect(sources).toHaveLength(1)
    expect(result.current.sampleStatus).toBe('ready')

    unmount()
  })

  it('starts anyway when the sample set does not load in time', async () => {
    // A bad network must delay the first note, never withhold it. The
    // synthesised fallback covers whatever has not arrived.
    mockLoad = jest.fn(() => new Promise<void>(() => {}))
    mockVoiceFor = jest.fn(() => null)

    const { context, raw } = makeSampleContext()
    const oscillator = {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: { value: 0 },
      type: 'sine',
      setPeriodicWave: jest.fn(),
      context,
    }
    raw.createOscillator.mockReturnValue(oscillator)
    raw.createBiquadFilter.mockReturnValue({
      connect: jest.fn(),
      type: 'lowpass',
      frequency: { value: 0 },
      Q: { value: 0 },
    })
    raw.createPeriodicWave.mockReturnValue({})
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    let startPromise: Promise<boolean>
    act(() => {
      startPromise = result.current.startAudio(
        [{ midi: 60, start: 0, duration: 1, hand: 'R', velocity: 0.8 }],
        0,
        1,
        false
      )
    })

    let started: boolean | undefined
    await act(async () => {
      jest.advanceTimersByTime(SAMPLE_LOAD_WAIT_MS)
      started = await startPromise!
    })

    expect(started).toBe(true)
    expect(oscillator.start).toHaveBeenCalled()
    expect(result.current.sampleStatus).toBe('degraded')

    unmount()
  })

  it('uses synthesis for the whole playback when only part of the set loaded', async () => {
    mockLoad = jest.fn(() => Promise.resolve({
      status: 'degraded',
      readyCount: 29,
      totalCount: 30,
    }))

    const { context, raw } = makeSampleContext()
    const oscillator = {
      connect: jest.fn(), start: jest.fn(), stop: jest.fn(),
      frequency: { value: 0 }, type: 'sine', setPeriodicWave: jest.fn(), context,
    }
    raw.createOscillator.mockReturnValue(oscillator)
    raw.createBiquadFilter.mockReturnValue({
      connect: jest.fn(), type: 'lowpass', frequency: { value: 0 }, Q: { value: 0 },
    })
    raw.createPeriodicWave.mockReturnValue({})
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 0, duration: 1, hand: 'R', velocity: 0.8 }],
        0, 1, false
      )
    })

    // A decoded buffer exists for this note, but partial readiness freezes this
    // playback to synthesis so the instrument cannot change midway through it.
    expect(mockVoiceFor).not.toHaveBeenCalled()
    expect(raw.createBufferSource).not.toHaveBeenCalled()
    expect(oscillator.start).toHaveBeenCalled()
    expect(result.current.sampleStatus).toBe('degraded')

    unmount()
  })

  it('keeps playback working and reports failed when no samples loaded', async () => {
    mockLoad = jest.fn(() => Promise.resolve({
      status: 'failed',
      readyCount: 0,
      totalCount: 30,
    }))

    const { context, raw } = makeSampleContext()
    const oscillator = {
      connect: jest.fn(), start: jest.fn(), stop: jest.fn(),
      frequency: { value: 0 }, type: 'sine', setPeriodicWave: jest.fn(), context,
    }
    raw.createOscillator.mockReturnValue(oscillator)
    raw.createBiquadFilter.mockReturnValue({
      connect: jest.fn(), type: 'lowpass', frequency: { value: 0 }, Q: { value: 0 },
    })
    raw.createPeriodicWave.mockReturnValue({})
    useContext(context)
    const { result, unmount } = renderHook(() => useFallingNotesAudio())

    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 0, duration: 1, hand: 'R', velocity: 0.8 }],
        0, 1, false
      )
    })

    expect(oscillator.start).toHaveBeenCalled()
    expect(result.current.sampleStatus).toBe('failed')

    unmount()
  })
})
