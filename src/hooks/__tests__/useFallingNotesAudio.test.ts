import { act, renderHook } from '@testing-library/react'
import { useFallingNotesAudio } from '../useFallingNotesAudio'

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
})
