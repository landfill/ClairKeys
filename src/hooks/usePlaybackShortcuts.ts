'use client'

import { useEffect, useRef } from 'react'

import { SEEK_STEP_SEC } from '@/utils/playbackShortcuts'
export { SEEK_STEP_SEC } from '@/utils/playbackShortcuts'

export type PlaybackShortcut = { type: 'toggle' } | { type: 'seek'; by: number }

interface ShortcutKey {
  key: string
  target: EventTarget | null
  repeat?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

/** Elements that already give space a meaning: activating, typing, or choosing. */
const SPACE_OWNERS = 'button, a[href], summary, input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="button"], [role="checkbox"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"]'

/** Elements that move their own value or caret with the arrows. */
const ARROW_OWNERS = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="slider"], [role="spinbutton"], [role="listbox"], [role="menu"], [role="radiogroup"], [role="tablist"]'

const ownedBy = (target: EventTarget | null, selector: string) =>
  target instanceof Element && target.closest(selector) !== null

/**
 * Maps a keydown to a playback action, or null when the key belongs to someone
 * else. A shortcut must never take a key from the control that has focus: space
 * on a focused button would otherwise fire twice, and the arrows would both
 * nudge a focused slider and jump the playhead.
 */
export function resolvePlaybackShortcut(event: ShortcutKey): PlaybackShortcut | null {
  // Shift+Space scrolls up and Shift+arrows extend a selection; every
  // modified key stays the browser's.
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return null

  if (event.key === ' ' || event.key === 'Spacebar') {
    // Holding space would otherwise flip play and pause on every auto-repeat.
    if (event.repeat || ownedBy(event.target, SPACE_OWNERS)) return null
    return { type: 'toggle' }
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    if (ownedBy(event.target, ARROW_OWNERS)) return null
    return { type: 'seek', by: event.key === 'ArrowLeft' ? -SEEK_STEP_SEC : SEEK_STEP_SEC }
  }

  return null
}

/**
 * Page-level playback keys for the sheet player: space plays or pauses, the
 * arrows move five seconds. Handlers are read through a ref so a new callback
 * identity on every playback frame does not re-register the listener.
 */
export function usePlaybackShortcuts({
  enabled = true,
  onToggle,
  onSeekBy,
}: {
  enabled?: boolean
  onToggle: () => void
  onSeekBy: (seconds: number) => void
}) {
  const handlers = useRef({ onToggle, onSeekBy })
  handlers.current = { onToggle, onSeekBy }

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const shortcut = resolvePlaybackShortcut(event)
      if (!shortcut) return
      // Space scrolls the page and the arrows scroll it sideways; neither is
      // wanted once the key has been taken as a playback command.
      event.preventDefault()
      if (shortcut.type === 'toggle') handlers.current.onToggle()
      else handlers.current.onSeekBy(shortcut.by)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}
