/**
 * Golden-fixture comparison for the canonical animation contract (P0-A).
 *
 * Compares an *actual* animation document (e.g. a future converter's output)
 * against an *expected* golden document, with a float tolerance on timing. This
 * is the measurement tool P0-B/P0-C accuracy work will run against the golden
 * corpus in `fixtures/animation-contract/`.
 *
 * Pitch (`midi`), `hand`, `voice`, and `staff` are compared exactly; `start` and
 * `duration` within tolerance. Notes are matched positionally after both lists
 * are sorted by (start, midi, hand) so ordering differences do not cause false
 * mismatches.
 */

import type { CanonicalAnimationData, CanonicalNote } from '@/types/animationContract'

export interface CompareTolerance {
  /** Max allowed absolute onset difference, seconds. */
  onsetSec: number
  /** Max allowed absolute duration difference, seconds. */
  durationSec: number
}

export const DEFAULT_TOLERANCE: CompareTolerance = {
  onsetSec: 0.01,
  durationSec: 0.01,
}

export interface NoteDiff {
  /** Index into the sorted note lists. */
  index: number
  field: 'midi' | 'start' | 'duration' | 'hand' | 'voice' | 'staff' | 'missing' | 'extra'
  expected: unknown
  actual: unknown
}

export interface ComparisonResult {
  match: boolean
  expectedCount: number
  actualCount: number
  diffs: NoteDiff[]
}

function sameOrNull<T>(a: T | undefined, b: T | undefined): boolean {
  return (a ?? null) === (b ?? null)
}

/**
 * Find the best unmatched actual note for an expected note.
 *
 * Candidates must share the exact `midi`. When `requireTolerance` is set they
 * must also fall within the timing tolerance (pass 1 — clean matches). Among
 * candidates, the one matching the most of {hand, voice, staff} wins, then the
 * closest onset — so a chord's same-pitch notes are not mispaired across voices
 * and small onset jitter does not swap them.
 */
function findMatch(
  expectedNote: CanonicalNote,
  actualNotes: CanonicalNote[],
  used: Set<number>,
  tolerance: CompareTolerance,
  requireTolerance: boolean
): number {
  let best = -1
  let bestScore = Number.POSITIVE_INFINITY

  for (let j = 0; j < actualNotes.length; j++) {
    if (used.has(j)) continue
    const a = actualNotes[j]
    if (a.midi !== expectedNote.midi) continue

    const onsetDelta = Math.abs(a.start - expectedNote.start)
    if (requireTolerance) {
      if (onsetDelta > tolerance.onsetSec) continue
      if (Math.abs(a.duration - expectedNote.duration) > tolerance.durationSec) continue
    }

    // Prefer exact hand/voice/staff, then the nearest onset.
    const fieldMisses =
      (sameOrNull(a.hand, expectedNote.hand) ? 0 : 1) +
      (sameOrNull(a.voice, expectedNote.voice) ? 0 : 1) +
      (sameOrNull(a.staff, expectedNote.staff) ? 0 : 1)
    const score = fieldMisses * 1_000_000 + onsetDelta
    if (score < bestScore) {
      bestScore = score
      best = j
    }
  }

  return best
}

/**
 * Compare two canonical documents with tolerance-aware note matching. `match` is
 * true only when every expected note finds a partner within tolerance, no fields
 * differ, and there are no extra notes.
 *
 * Notes are matched by pitch + timing (not by array position), so a missing or
 * extra note does not cascade into every following note being reported wrong,
 * and equal-onset chord notes are paired by their exact fields rather than input
 * order. An expected note with the right pitch but out-of-tolerance timing is
 * still matched (pass 2) and its timing reported as a diff; a pitch with no
 * partner is reported `missing`.
 */
export function compareAnimationData(
  actual: CanonicalAnimationData,
  expected: CanonicalAnimationData,
  tolerance: CompareTolerance = DEFAULT_TOLERANCE
): ComparisonResult {
  const exp = expected.notes
  const act = actual.notes
  const used = new Set<number>()
  const diffs: NoteDiff[] = []

  for (let i = 0; i < exp.length; i++) {
    const e = exp[i]
    // Pass 1: a clean match within tolerance. Pass 2: same pitch, any timing.
    let j = findMatch(e, act, used, tolerance, true)
    if (j === -1) j = findMatch(e, act, used, tolerance, false)

    if (j === -1) {
      diffs.push({ index: i, field: 'missing', expected: e, actual: null })
      continue
    }

    used.add(j)
    const a = act[j]
    if (Math.abs(e.start - a.start) > tolerance.onsetSec) {
      diffs.push({ index: i, field: 'start', expected: e.start, actual: a.start })
    }
    if (Math.abs(e.duration - a.duration) > tolerance.durationSec) {
      diffs.push({ index: i, field: 'duration', expected: e.duration, actual: a.duration })
    }
    if (!sameOrNull(e.hand, a.hand)) diffs.push({ index: i, field: 'hand', expected: e.hand ?? null, actual: a.hand ?? null })
    if (!sameOrNull(e.voice, a.voice)) diffs.push({ index: i, field: 'voice', expected: e.voice ?? null, actual: a.voice ?? null })
    if (!sameOrNull(e.staff, a.staff)) diffs.push({ index: i, field: 'staff', expected: e.staff ?? null, actual: a.staff ?? null })
  }

  for (let j = 0; j < act.length; j++) {
    if (!used.has(j)) diffs.push({ index: j, field: 'extra', expected: null, actual: act[j] })
  }

  return {
    match: diffs.length === 0,
    expectedCount: exp.length,
    actualCount: act.length,
    diffs,
  }
}

/** Human-readable one-line-per-diff rendering, for test output and CLIs. */
export function formatComparison(result: ComparisonResult): string {
  if (result.match) return `match: ${result.expectedCount} notes`
  const lines = result.diffs.map(
    (d) => `  note[${d.index}] ${d.field}: expected ${JSON.stringify(d.expected)}, actual ${JSON.stringify(d.actual)}`
  )
  return `mismatch (expected ${result.expectedCount}, actual ${result.actualCount}):\n${lines.join('\n')}`
}
