/**
 * Regression tests for the rolling look-ahead audio scheduler.
 *
 * These reproduce issue #18: the old one-shot scheduler dropped every note
 * starting more than 10 seconds after the play point. The tests exercise the
 * pure selection/window helpers so the "note past 10s gets scheduled" guarantee
 * is verified without an AudioContext.
 */

import {
  selectNotesInWindow,
  nextScheduleWindow,
  SCHEDULE_AHEAD_SEC,
} from '../audioScheduler'
import type { FallingNote } from '@/types/fallingNotes'

/** A 0–30s fixture: one note per second at C4, plus one held note. */
function makeFixture(): FallingNote[] {
  const notes: FallingNote[] = []
  for (let i = 0; i < 30; i++) {
    notes.push({ midi: 60 + (i % 12), start: i, duration: 0.5 })
  }
  return notes
}

describe('selectNotesInWindow', () => {
  it('selects notes whose start falls in [from, to)', () => {
    const notes: FallingNote[] = [
      { midi: 60, start: 0, duration: 0.5 },
      { midi: 62, start: 1, duration: 0.5 },
      { midi: 64, start: 2, duration: 0.5 },
    ]

    const selected = selectNotesInWindow(notes, 1, 2)

    expect(selected.map((n) => n.start)).toEqual([1])
  })

  it('is lower-inclusive and upper-exclusive at the window bounds', () => {
    const notes: FallingNote[] = [
      { midi: 60, start: 1, duration: 0.5 }, // exactly at `from` → included
      { midi: 62, start: 2, duration: 0.5 }, // exactly at `to`   → excluded
    ]

    const selected = selectNotesInWindow(notes, 1, 2)

    expect(selected.map((n) => n.start)).toEqual([1])
  })

  it('regression (issue #18): schedules a note starting well past 10 seconds', () => {
    const notes = makeFixture()

    // The old cap made a window past 10s impossible; the pure function must
    // happily select a note starting at 25s.
    const selected = selectNotesInWindow(notes, 25, 26)

    expect(selected).toHaveLength(1)
    expect(selected[0].start).toBe(25)
  })

  it('returns notes sorted by start regardless of input order', () => {
    const notes: FallingNote[] = [
      { midi: 64, start: 2.5, duration: 0.5 },
      { midi: 60, start: 2.1, duration: 0.5 },
      { midi: 62, start: 2.3, duration: 0.5 },
    ]

    const selected = selectNotesInWindow(notes, 2, 3)

    expect(selected.map((n) => n.start)).toEqual([2.1, 2.3, 2.5])
  })

  it('returns an empty array for a zero-width or inverted window', () => {
    const notes = makeFixture()

    expect(selectNotesInWindow(notes, 5, 5)).toEqual([])
    expect(selectNotesInWindow(notes, 6, 5)).toEqual([])
  })

  it('excludes an already-sounding note by default', () => {
    const notes: FallingNote[] = [{ midi: 60, start: 4, duration: 3 }] // sounds 4–7s

    // Window starts at 5s: the note started before the window and is not
    // re-triggered unless includeSounding is set.
    expect(selectNotesInWindow(notes, 5, 6)).toEqual([])
  })

  it('includes a note still sounding at `from` when includeSounding is set', () => {
    const notes: FallingNote[] = [
      { midi: 60, start: 4, duration: 3 }, // sounds 4–7s, straddles 5s
      { midi: 62, start: 1, duration: 1 }, // finished by 2s, must stay excluded
    ]

    const selected = selectNotesInWindow(notes, 5, 6, true)

    expect(selected.map((n) => n.start)).toEqual([4])
  })

  it('rolls across the whole song scheduling every note exactly once', () => {
    const notes = makeFixture()
    const seen = new Map<number, number>() // start → times scheduled

    // Simulate the tick loop: 0.25s cursor steps out to 30s. Each note must be
    // scheduled once and only once — no gaps (the 10s bug), no duplicates.
    let cursor = 0
    const step = 0.25
    for (let songNow = 0; songNow <= 32; songNow += step) {
      const win = nextScheduleWindow(songNow, cursor, 1)
      if (!win) continue
      for (const note of selectNotesInWindow(notes, win.from, win.to)) {
        seen.set(note.start, (seen.get(note.start) ?? 0) + 1)
      }
      cursor = win.cursor
    }

    expect(seen.size).toBe(notes.length)
    for (const note of notes) {
      expect(seen.get(note.start)).toBe(1)
    }
  })
})

describe('nextScheduleWindow', () => {
  it('opens a window from the cursor out to the tempo-scaled horizon', () => {
    const win = nextScheduleWindow(10, 10, 1)

    expect(win).not.toBeNull()
    expect(win!.from).toBe(10)
    expect(win!.to).toBeCloseTo(10 + SCHEDULE_AHEAD_SEC)
    expect(win!.cursor).toBe(win!.to)
  })

  it('keeps the same real look-ahead as tempo increases (more song time queued)', () => {
    const normal = nextScheduleWindow(10, 10, 1)!
    const fast = nextScheduleWindow(10, 10, 2)!

    // At 2x speed the same 0.5s of real audio spans twice the song time.
    expect(fast.to - fast.from).toBeCloseTo((normal.to - normal.from) * 2)
  })

  it('returns null when the cursor already covers the horizon', () => {
    // Cursor is far ahead of where the look-ahead would reach.
    expect(nextScheduleWindow(10, 20, 1)).toBeNull()
  })
})
