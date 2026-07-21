import type { FallingNote } from '@/types/fallingNotes'

/**
 * Rolling look-ahead audio scheduler helpers.
 *
 * The playback engine used to schedule audio exactly once, at play time, and
 * hard-capped scheduling to notes starting within 10 seconds of that point
 * (`relativeStart > 10` in the old `useFallingNotesAudio.scheduleAudio`). Since
 * the scheduler was never re-invoked while playing, every note past that window
 * was silently dropped even though the visualization kept running — the
 * "audio stops after ~10s but notes keep falling" defect (issue #18).
 *
 * The fix is the standard Web Audio pattern: a timer advances a cursor through
 * song time and repeatedly schedules the next small window of notes. The
 * decision of *which* notes belong to a given window is isolated here as a pure
 * function so it can be unit-tested without an AudioContext — the original bug
 * lived in code that fused this decision with oscillator creation and therefore
 * could not be tested in isolation.
 */

/**
 * Real seconds of audio kept scheduled ahead of the playhead.
 *
 * Sized above the ~1000ms floor browsers impose on `setInterval` in background
 * tabs: with a smaller look-ahead a throttled tick would let the queue drain and
 * the audio would stutter. 1.5s leaves a buffer even when ticks are delayed to
 * once per second. `stopAudio` flushes all scheduled nodes, so a larger buffer
 * has no cost on seek/pause/tempo/mute changes.
 */
export const SCHEDULE_AHEAD_SEC = 1.5

/** How often the rolling scheduler tops up the queue, in milliseconds. */
export const TICK_MS = 100

/** Maximum simultaneous scheduled voices, to bound node allocation. */
export const VOICE_LIMIT = 24

/**
 * Select the notes that belong to the schedule window `[fromSec, toSec)`,
 * expressed in song time (seconds from the start of the song).
 *
 * Selection rule:
 * - A note is selected when its start falls within `[fromSec, toSec)`.
 * - When `includeSounding` is true — used only for the first window right after
 *   play or seek — a note that started before `fromSec` but is still sounding at
 *   `fromSec` (`start + duration > fromSec`) is also selected, so seeking into
 *   the middle of a held note still articulates it.
 *
 * The result is sorted by start time so downstream voice allocation is
 * deterministic regardless of the caller's note ordering.
 */
export function selectNotesInWindow(
  notes: FallingNote[],
  fromSec: number,
  toSec: number,
  includeSounding = false
): FallingNote[] {
  if (toSec <= fromSec) return []

  const selected = notes.filter((note) => {
    const startsInWindow = note.start >= fromSec && note.start < toSec
    if (startsInWindow) return true

    if (includeSounding) {
      return note.start < fromSec && note.start + note.duration > fromSec
    }

    return false
  })

  return selected.sort((a, b) => a.start - b.start)
}

/**
 * Advance a rolling schedule cursor by one tick and report the window that
 * should be scheduled next.
 *
 * Given the current song time and the cursor (the song time already scheduled
 * up to), returns the `[from, to)` window still needing notes and the new
 * cursor. The look-ahead is scaled by tempo so a faster playback rate keeps the
 * same amount of *real* audio queued. Returns `null` when the cursor already
 * covers the look-ahead horizon, so the caller can skip an empty pass.
 *
 * If a tick is delayed past the look-ahead (main-thread stall or background-tab
 * throttling), the playhead can advance beyond the cursor. Scheduling the whole
 * stale `[cursor, songNow)` range would clamp every overdue note to "now" and
 * fire them in one audible burst, so `from` is clamped forward to the current
 * playhead — the missed range is dropped. `skippedStale` reports this so the
 * caller can re-articulate a note still sounding at the new playhead.
 */
export function nextScheduleWindow(
  songNowSec: number,
  cursorSec: number,
  tempoScale: number,
  scheduleAheadSec: number = SCHEDULE_AHEAD_SEC
): { from: number; to: number; cursor: number; skippedStale: boolean } | null {
  const target = songNowSec + scheduleAheadSec * Math.max(tempoScale, 0)
  const from = Math.max(cursorSec, songNowSec)
  if (target <= from) return null

  return { from, to: target, cursor: target, skippedStale: from > cursorSec }
}
