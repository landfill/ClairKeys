import { renderHook, act } from '@testing-library/react'
import { createRef } from 'react'
import { usePlaybackOrientation } from '../usePlaybackOrientation'

type QueryState = { matches: boolean; listeners: Set<() => void> }

const queries = new Map<string, QueryState>()

function setQuery(query: string, matches: boolean) {
  const existing = queries.get(query)
  if (existing) {
    existing.matches = matches
    existing.listeners.forEach(listener => listener())
    return
  }
  queries.set(query, { matches, listeners: new Set() })
}

function installMatchMedia() {
  // jest.setup.js already defines a non-configurable (but writable) matchMedia
  // whose queries never match, so this replaces the value rather than the
  // property descriptor.
  window.matchMedia = ((query: string) => {
    if (!queries.has(query)) queries.set(query, { matches: false, listeners: new Set() })
    const state = queries.get(query)!
    return {
      get matches() {
        return state.matches
      },
      media: query,
      addEventListener: (_type: string, listener: () => void) => {
        state.listeners.add(listener)
      },
      removeEventListener: (_type: string, listener: () => void) => {
        state.listeners.delete(listener)
      },
    }
  }) as unknown as typeof window.matchMedia
}

/** A phone held upright: touch input, portrait screen. */
function givenPortraitTouchDevice() {
  setQuery('(pointer: coarse)', true)
  setQuery('(orientation: portrait)', true)
}

/** A desktop browser: fine pointer, and usually already landscape. */
function givenDesktop() {
  setQuery('(pointer: coarse)', false)
  setQuery('(orientation: portrait)', false)
}

function givenScreenOrientation(value: unknown) {
  Object.defineProperty(window.screen, 'orientation', {
    writable: true,
    configurable: true,
    value,
  })
}

function makeTarget() {
  const target = document.createElement('div')
  const requestFullscreen = jest.fn().mockResolvedValue(undefined)
  Object.defineProperty(target, 'requestFullscreen', {
    writable: true,
    configurable: true,
    value: requestFullscreen,
  })
  const ref = createRef<HTMLElement>()
  ;(ref as { current: HTMLElement | null }).current = target
  return { target, ref, requestFullscreen }
}

const flush = () => act(async () => { await Promise.resolve() })

describe('usePlaybackOrientation', () => {
  beforeEach(() => {
    queries.clear()
    installMatchMedia()
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      configurable: true,
      value: null,
    })
    Object.defineProperty(document, 'exitFullscreen', {
      writable: true,
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined),
    })
  })

  it('leaves a desktop browser alone — it never rotates and never asks for fullscreen', () => {
    givenDesktop()
    givenScreenOrientation({ lock: jest.fn().mockResolvedValue(undefined), unlock: jest.fn() })
    const { ref, requestFullscreen } = makeTarget()

    const { result } = renderHook(() => usePlaybackOrientation(ref))
    act(() => result.current.enter())

    expect(result.current.rotate).toBe(false)
    expect(requestFullscreen).not.toHaveBeenCalled()
  })

  it('rotates with CSS on iOS, where the interface exists but lock() does not', async () => {
    givenPortraitTouchDevice()
    // This is the trap the issue calls out: `'orientation' in screen` and
    // `screen.orientation != null` are both true on iOS. Only the method is missing.
    givenScreenOrientation({ type: 'portrait-primary', angle: 0 })
    const { ref, requestFullscreen } = makeTarget()

    const { result } = renderHook(() => usePlaybackOrientation(ref))
    act(() => result.current.enter())
    await flush()

    expect(result.current.rotate).toBe(true)
    // iOS grants Element.requestFullscreen to <video> only; asking here would
    // reject and buy nothing, since the CSS path already covers the screen.
    expect(requestFullscreen).not.toHaveBeenCalled()
  })

  it('locks the real screen on Android and stops rotating once it turns', async () => {
    givenPortraitTouchDevice()
    const lock = jest.fn().mockResolvedValue(undefined)
    givenScreenOrientation({ lock, unlock: jest.fn() })
    const { ref, requestFullscreen } = makeTarget()

    const { result } = renderHook(() => usePlaybackOrientation(ref))
    act(() => result.current.enter())

    // The CSS rotation covers the gap until the lock resolves, so playback is
    // never shown upright in portrait.
    expect(result.current.rotate).toBe(true)
    await flush()
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
    expect(lock).toHaveBeenCalledWith('landscape')

    // The lock makes the screen genuinely landscape; the CSS transform must go.
    act(() => setQuery('(orientation: portrait)', false))
    expect(result.current.rotate).toBe(false)
  })

  it('drops the CSS rotation the moment the user turns the device themselves', async () => {
    givenPortraitTouchDevice()
    givenScreenOrientation({ type: 'portrait-primary' })
    const { ref } = makeTarget()

    const { result } = renderHook(() => usePlaybackOrientation(ref))
    act(() => result.current.enter())
    await flush()
    expect(result.current.rotate).toBe(true)

    // Without this, a physical turn would apply 90 degrees twice.
    act(() => setQuery('(orientation: portrait)', false))
    expect(result.current.rotate).toBe(false)

    // Turning back must bring the stand-in rotation back while playback runs.
    act(() => setQuery('(orientation: portrait)', true))
    expect(result.current.rotate).toBe(true)
  })

  it('keeps the CSS rotation when the lock is refused', async () => {
    givenPortraitTouchDevice()
    const lock = jest.fn().mockRejectedValue(new Error('not supported on this device'))
    givenScreenOrientation({ lock, unlock: jest.fn() })
    const { ref } = makeTarget()

    const { result } = renderHook(() => usePlaybackOrientation(ref))
    act(() => result.current.enter())
    await flush()

    expect(result.current.rotate).toBe(true)
  })

  it('releases the lock and the fullscreen element when playback ends', async () => {
    givenPortraitTouchDevice()
    const unlock = jest.fn()
    givenScreenOrientation({ lock: jest.fn().mockResolvedValue(undefined), unlock })
    const { target, ref } = makeTarget()

    const { result } = renderHook(() => usePlaybackOrientation(ref))
    act(() => result.current.enter())
    await flush()
    ;(document as { fullscreenElement: Element | null }).fullscreenElement = target

    act(() => result.current.exit())
    await flush()

    expect(unlock).toHaveBeenCalledTimes(1)
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1)
    expect(result.current.rotate).toBe(false)
  })

  it('releases everything when the player unmounts mid-playback', async () => {
    givenPortraitTouchDevice()
    const unlock = jest.fn()
    givenScreenOrientation({ lock: jest.fn().mockResolvedValue(undefined), unlock })
    const { target, ref } = makeTarget()

    const { result, unmount } = renderHook(() => usePlaybackOrientation(ref))
    act(() => result.current.enter())
    await flush()
    ;(document as { fullscreenElement: Element | null }).fullscreenElement = target

    unmount()

    expect(unlock).toHaveBeenCalledTimes(1)
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1)
  })

  // The browser answers requestFullscreen and lock() on its own schedule, and a
  // reader can press stop or leave the page while it is still deciding.
  describe('requests that outlive their playback session', () => {
    function deferredFullscreen() {
      let resolveFullscreen: () => void = () => {}
      const requestFullscreen = jest.fn(
        () => new Promise<void>(resolve => { resolveFullscreen = resolve })
      )
      const target = document.createElement('div')
      Object.defineProperty(target, 'requestFullscreen', {
        writable: true,
        configurable: true,
        value: requestFullscreen,
      })
      const ref = createRef<HTMLElement>()
      ;(ref as { current: HTMLElement | null }).current = target
      return { ref, target, requestFullscreen, resolve: () => resolveFullscreen() }
    }

    it('does not lock a screen whose playback already stopped', async () => {
      givenPortraitTouchDevice()
      const lock = jest.fn().mockResolvedValue(undefined)
      givenScreenOrientation({ lock, unlock: jest.fn() })
      const { ref, target, resolve } = deferredFullscreen()

      const { result } = renderHook(() => usePlaybackOrientation(ref))
      act(() => result.current.enter())
      act(() => result.current.exit())
      ;(document as { fullscreenElement: Element | null }).fullscreenElement = target

      resolve()
      await flush()

      // Locking here would leave the screen turned with nothing left to turn it
      // back: exit() has already run its release.
      expect(lock).not.toHaveBeenCalled()
      expect(document.exitFullscreen).toHaveBeenCalled()
    })

    it('does not lock a screen whose player already unmounted', async () => {
      givenPortraitTouchDevice()
      const lock = jest.fn().mockResolvedValue(undefined)
      givenScreenOrientation({ lock, unlock: jest.fn() })
      const { ref, resolve } = deferredFullscreen()

      const { result, unmount } = renderHook(() => usePlaybackOrientation(ref))
      act(() => result.current.enter())
      unmount()

      resolve()
      await flush()

      expect(lock).not.toHaveBeenCalled()
    })
  })

  it('returns a stable object so consumers can depend on it in an effect', () => {
    givenDesktop()
    givenScreenOrientation({})
    const { ref } = makeTarget()

    const { result, rerender } = renderHook(() => usePlaybackOrientation(ref))
    const first = result.current
    rerender()

    // A fresh object every render re-runs any effect that lists it, which is how
    // an exit() ended up cancelling the enter() that had just been issued.
    expect(result.current).toBe(first)
  })
})
