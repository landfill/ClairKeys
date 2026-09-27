import { act, renderHook } from '@testing-library/react'
import { useFallingNotesAudio } from '../useFallingNotesAudio'

/** Wait mode sounds the keys a reader taps on screen at once, off the playback clock. */

jest.mock('@/utils/pianoSampleBank', () => ({
  getPianoSampleBank: jest.fn(() => ({
    voiceFor: () => ({ buffer: { duration: 6 } as AudioBuffer, playbackRate: 1 }),
    load: () => Promise.resolve({ status: 'ready', readyCount: 30, totalCount: 30 }),
  })),
  disposePianoSampleBank: jest.fn(),
}))

function makeContext(state: AudioContextState = 'running') {
  const noteStarts: number[] = []
  const gain = () => ({
    connect: jest.fn(),
    gain: { value: 0, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn(), cancelScheduledValues: jest.fn() },
  })
  const context: Record<string, unknown> = {
    state,
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
    createOscillator: jest.fn(),
    resume: jest.fn(async () => { context.state = 'running' }),
    close: jest.fn(() => Promise.resolve()),
  }
  Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: jest.fn(() => context) })
  return { noteStarts, context }
}

const originalAudioContext = window.AudioContext
afterEach(() => {
  Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: originalAudioContext })
})

describe('useFallingNotesAudio playNoteNow', () => {
  it('sounds a pressed key immediately without touching the playback clock', async () => {
    const { noteStarts } = makeContext()
    const { result, unmount } = renderHook(() => useFallingNotesAudio())
    await act(async () => { await result.current.playNoteNow(60) })
    expect(noteStarts).toHaveLength(1)
    expect(noteStarts[0]).toBeGreaterThanOrEqual(10)
    expect(noteStarts[0]).toBeLessThan(10.05)
    expect(result.current.getCurrentTime()).toBe(0)
    unmount()
  })

  it('wakes a suspended context from the tap that asked for the sound', async () => {
    const { noteStarts, context } = makeContext('suspended')
    const { result, unmount } = renderHook(() => useFallingNotesAudio())
    await act(async () => { await result.current.playNoteNow(62) })
    expect(context.resume).toHaveBeenCalled()
    expect(noteStarts).toHaveLength(1)
    unmount()
  })
})
