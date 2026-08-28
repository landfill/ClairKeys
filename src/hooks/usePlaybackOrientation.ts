'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

/**
 * Playback orientation for a device held upright.
 *
 * The two mobile platforms need opposite mechanisms. Android exposes
 * `screen.orientation.lock()`, which the spec allows only from fullscreen, so
 * playback turns the hardware itself. iOS ships the `ScreenOrientation`
 * interface without `lock()` — and without manifest `orientation` support — so
 * the only remaining lever is a CSS transform on the player.
 *
 * Both paths collapse into one condition. A successful lock makes the screen
 * genuinely landscape, which ends the portrait media query, which withdraws the
 * CSS rotation. The same query withdraws it when the user turns the device by
 * hand, so the double-rotation hazard has no separate branch to get wrong.
 */

const PORTRAIT_QUERY = '(orientation: portrait)'
const COARSE_POINTER_QUERY = '(pointer: coarse)'

/**
 * TypeScript's lib.dom declares `ScreenOrientation` without `lock()` — the very
 * gap this hook detects at runtime, since Safari has never shipped the method.
 * Declaring both members optional keeps the type honest about that.
 */
type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape') => Promise<void>
  unlock?: () => void
}

function screenOrientation(): LockableScreenOrientation | undefined {
  if (typeof window === 'undefined') return undefined
  return window.screen?.orientation as LockableScreenOrientation | undefined
}

function queryMatches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

/**
 * iOS answers true to `'orientation' in screen` and to `screen.orientation !=
 * null` — the interface is there since Safari 16.4 and only the method is
 * missing. Detecting anything other than the callable method silently routes
 * iOS into the Android path, where nothing happens at all.
 */
function canLockOrientation(): boolean {
  return typeof screenOrientation()?.lock === 'function'
}

export type PlaybackOrientation = {
  /** True while the player must stand in for a rotation the device will not perform. */
  rotate: boolean
  /** Call synchronously from the play click — fullscreen needs that activation. */
  enter: () => void
  /** Call when playback stops, or when the player goes away. */
  exit: () => void
}

export function usePlaybackOrientation(
  fullscreenTarget: RefObject<HTMLElement | null>
): PlaybackOrientation {
  const [engaged, setEngaged] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const lockedRef = useRef(false)
  // The browser answers requestFullscreen and lock() on its own schedule. A
  // reader can stop playback or leave the page while it is still deciding, and
  // a chain that completes after that would lock a screen with nothing left to
  // release it.
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const portrait = window.matchMedia(PORTRAIT_QUERY)
    const coarsePointer = window.matchMedia(COARSE_POINTER_QUERY)
    const syncPortrait = () => setIsPortrait(portrait.matches)
    const syncPointer = () => setIsTouchDevice(coarsePointer.matches)

    syncPortrait()
    syncPointer()
    portrait.addEventListener?.('change', syncPortrait)
    coarsePointer.addEventListener?.('change', syncPointer)

    return () => {
      portrait.removeEventListener?.('change', syncPortrait)
      coarsePointer.removeEventListener?.('change', syncPointer)
    }
  }, [])

  const release = useCallback(() => {
    if (lockedRef.current) {
      lockedRef.current = false
      try {
        screenOrientation()?.unlock?.()
      } catch {
        // Unlocking a screen that was never locked is not worth reporting.
      }
    }
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {
        // The user may have left fullscreen already; there is nothing to undo.
      })
    }
  }, [])

  const enter = useCallback(() => {
    const requestId = ++requestIdRef.current
    setEngaged(true)

    // A desktop window is not something the reader can turn, and putting a
    // desktop browser into fullscreen on play would be its own defect.
    if (!queryMatches(COARSE_POINTER_QUERY)) return
    if (!queryMatches(PORTRAIT_QUERY)) return

    // Without lock() there is nothing fullscreen can buy: iOS grants
    // Element.requestFullscreen to <video> alone, and the CSS rotation already
    // covers the screen. Asking would only produce a rejected promise.
    if (!canLockOrientation()) return

    const target = fullscreenTarget.current
    if (!target?.requestFullscreen) return

    const isCurrent = () => requestIdRef.current === requestId

    target
      .requestFullscreen()
      .then(() => {
        if (!isCurrent()) return undefined
        return screenOrientation()?.lock?.('landscape')
      })
      .then(() => {
        if (isCurrent()) {
          lockedRef.current = true
          return
        }
        // The session ended while the browser was deciding. Fullscreen may have
        // been granted anyway, and the release that would have undone it has
        // already run.
        release()
      })
      .catch(() => {
        // A device that refuses landscape keeps the CSS rotation, because the
        // portrait query never changed. Nothing else has to happen here.
      })
  }, [fullscreenTarget, release])

  const exit = useCallback(() => {
    requestIdRef.current += 1
    setEngaged(false)
    release()
  }, [release])

  // Leaving the page mid-playback must not strand a locked screen.
  useEffect(() => () => {
    requestIdRef.current += 1
    release()
  }, [release])

  // A fresh object every render re-runs any effect that lists it, and the
  // player lists it beside `isPlaying`. That churn is what let an exit() land
  // on the render that enter() had just caused.
  return useMemo(
    () => ({ rotate: engaged && isTouchDevice && isPortrait, enter, exit }),
    [engaged, isTouchDevice, isPortrait, enter, exit]
  )
}
