import { act, renderHook } from '@testing-library/react'
import { useFallingNotesAudio } from '../useFallingNotesAudio'
import { SAMPLE_PEAK_GAIN, damperReleaseSec } from '@/utils/pianoSamples'

/**
 * The recorded-sample branch of the playback path.
 *
 * Kept out of `useFallingNotesAudio.test.ts` because it needs the sample bank
 * replaced wholesale: that file's AudioContext doubles deliberately expose no
 * `decodeAudioData`, which is what keeps them on the synthesised fallback.
 */

const mockPlaybackRate = 1.5
let mockVoiceFor: jest.Mock

jest.mock('@/utils/pianoSampleBank', () => ({
  getPianoSampleBank: jest.fn(() => ({
    voiceFor: (midi: number) => mockVoiceFor(midi),
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
    mockVoiceFor = jest.fn(() => ({
      buffer: {} as AudioBuffer,
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
})
