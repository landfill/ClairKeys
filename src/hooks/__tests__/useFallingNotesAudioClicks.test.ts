import { act, renderHook } from '@testing-library/react'
import { useFallingNotesAudio } from '../useFallingNotesAudio'

/**
 * Metronome and count-in clicks ride the same anchor as the notes, so a click
 * at song time t sounds exactly where a note starting at t would.
 */

jest.mock('@/utils/pianoSampleBank', () => ({
  getPianoSampleBank: jest.fn(() => ({
    voiceFor: () => ({ buffer: { duration: 6 } as AudioBuffer, playbackRate: 1 }),
    load: () => Promise.resolve({ status: 'ready', readyCount: 30, totalCount: 30 }),
  })),
  disposePianoSampleBank: jest.fn(),
}))

function makeContext() {
  const oscillators: Array<{ start: jest.Mock; stop: jest.Mock; frequency: { value: number } }> = []
  const noteStarts: number[] = []
  const gain = () => ({
    connect: jest.fn(),
    gain: {
      value: 0,
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
      cancelScheduledValues: jest.fn(),
    },
  })
  const context: Record<string, unknown> = {
    state: 'running',
    currentTime: 10,
    destination: {},
    decodeAudioData: jest.fn(),
    createGain: jest.fn(gain),
    createBufferSource: jest.fn(() => ({
      connect: jest.fn(),
      start: jest.fn((when: number) => noteStarts.push(when)),
      stop: jest.fn(),
      playbackRate: { value: 1 },
      buffer: null,
      get context() { return context },
    })),
    createOscillator: jest.fn(() => {
      const node = {
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        frequency: { value: 0 },
        type: 'sine',
        get context() { return context },
      }
      oscillators.push(node)
      return node
    }),
    resume: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
  }
  Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: jest.fn(() => context) })
  return { oscillators, noteStarts }
}

const originalAudioContext = window.AudioContext
beforeEach(() => { jest.useFakeTimers() })
afterEach(() => {
  Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: originalAudioContext })
  jest.useRealTimers()
})

describe('useFallingNotesAudio clicks', () => {
  it('schedules clicks on the notes’ own clock, scaled by tempo', async () => {
    const { oscillators } = makeContext()
    const { result, unmount } = renderHook(() => useFallingNotesAudio())
    await act(async () => {
      await result.current.startAudio([], 0, 2, false, {
        clicks: [{ time: 0.5, accent: false }, { time: 1, accent: true }],
      })
    })

    // Anchor = currentTime 10 + 0.05 lead; song seconds are halved at 2x.
    expect(oscillators.map(o => o.start.mock.calls[0][0])).toEqual([10.3, 10.55])
    expect(oscillators[1].frequency.value).toBeGreaterThan(oscillators[0].frequency.value)
    unmount()
  })

  it('sounds the count-in but keeps notes before the resume point silent', async () => {
    const { oscillators, noteStarts } = makeContext()
    const { result, unmount } = renderHook(() => useFallingNotesAudio())
    await act(async () => {
      await result.current.startAudio(
        [{ midi: 60, start: 0.5, duration: 0.2 }, { midi: 62, start: 1.2, duration: 0.2 }],
        0,
        1,
        false,
        { clicks: [{ time: 0, accent: true }, { time: 0.5, accent: false }], notesFrom: 1 }
      )
    })

    expect(oscillators).toHaveLength(2)
    // Only the note at 1.2 s sounds: 10.05 + 1.2.
    expect(noteStarts).toEqual([11.25])
    unmount()
  })

  it('schedules no clicks while muted and stops them with the notes', async () => {
    const muted = makeContext()
    const first = renderHook(() => useFallingNotesAudio())
    await act(async () => {
      await first.result.current.startAudio([], 0, 1, true, { clicks: [{ time: 0.2, accent: true }] })
    })
    expect(muted.oscillators).toHaveLength(0)
    first.unmount()

    const { oscillators } = makeContext()
    const { result, unmount } = renderHook(() => useFallingNotesAudio())
    await act(async () => {
      await result.current.startAudio([], 0, 1, false, { clicks: [{ time: 0.2, accent: true }] })
    })
    act(() => result.current.stopAudio())
    expect(oscillators[0].stop).toHaveBeenCalled()
    unmount()
  })

  it('keeps topping up clicks as playback moves on', async () => {
    const { oscillators } = makeContext()
    const { result, unmount } = renderHook(() => useFallingNotesAudio())
    const clicks = Array.from({ length: 8 }, (_, k) => ({ time: k, accent: k % 4 === 0 }))
    await act(async () => {
      await result.current.startAudio([], 0, 1, false, { clicks })
    })
    const initial = oscillators.length
    expect(initial).toBeLessThan(clicks.length)
    expect(initial).toBeGreaterThan(0)
    await act(async () => { jest.advanceTimersByTime(0) })
    unmount()
  })
})
