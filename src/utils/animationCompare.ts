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

function sortNotes(notes: CanonicalNote[]): CanonicalNote[] {
  return [...notes].sort(
    (a, b) =>
      a.start - b.start ||
      a.midi - b.midi ||
      (a.hand ?? '').localeCompare(b.hand ?? '')
  )
}

/**
 * Compare two canonical documents note-by-note. Returns a structured result;
 * `match` is true only when counts agree and every note matches within tolerance.
 */
export function compareAnimationData(
  actual: CanonicalAnimationData,
  expected: CanonicalAnimationData,
  tolerance: CompareTolerance = DEFAULT_TOLERANCE
): ComparisonResult {
  const exp = sortNotes(expected.notes)
  const act = sortNotes(actual.notes)
  const diffs: NoteDiff[] = []

  const common = Math.min(exp.length, act.length)
  for (let i = 0; i < common; i++) {
    const e = exp[i]
    const a = act[i]

    if (e.midi !== a.midi) diffs.push({ index: i, field: 'midi', expected: e.midi, actual: a.midi })
    if (Math.abs(e.start - a.start) > tolerance.onsetSec) {
      diffs.push({ index: i, field: 'start', expected: e.start, actual: a.start })
    }
    if (Math.abs(e.duration - a.duration) > tolerance.durationSec) {
      diffs.push({ index: i, field: 'duration', expected: e.duration, actual: a.duration })
    }
    if ((e.hand ?? null) !== (a.hand ?? null)) {
      diffs.push({ index: i, field: 'hand', expected: e.hand ?? null, actual: a.hand ?? null })
    }
    if ((e.voice ?? null) !== (a.voice ?? null)) {
      diffs.push({ index: i, field: 'voice', expected: e.voice ?? null, actual: a.voice ?? null })
    }
    if ((e.staff ?? null) !== (a.staff ?? null)) {
      diffs.push({ index: i, field: 'staff', expected: e.staff ?? null, actual: a.staff ?? null })
    }
  }

  // Report length mismatches as missing/extra notes.
  for (let i = common; i < exp.length; i++) {
    diffs.push({ index: i, field: 'missing', expected: exp[i], actual: null })
  }
  for (let i = common; i < act.length; i++) {
    diffs.push({ index: i, field: 'extra', expected: null, actual: act[i] })
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
