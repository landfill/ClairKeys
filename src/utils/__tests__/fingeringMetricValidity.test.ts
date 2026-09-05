/**
 * Does a metric actually rank a conventional fingering above a defective one?
 *
 * This file exists because issue #130 stage 3 was attempted twice against a
 * metric that does not. `repositionsInMonotoneRuns` scores the corpus's
 * defective left-hand arpeggio *better* than every conventional answer, so both
 * attempts spent their effort moving a number in a direction that makes the
 * fingering worse. Neither attempt was wrong about its own mechanism; the target
 * was wrong.
 *
 * So a metric is admitted as an optimisation target only after it is shown to
 * rank known-good fingerings at or below known-bad ones on this set. The set is
 * small and every entry is a fingering that can be defended out loud — that is
 * the point, not coverage.
 */

import { measureFingering } from '../../../scripts/lib/fingeringMetrics';
import type { FallingNote, Finger, Hand } from '@/types/fallingNotes';

interface Passage {
  name: string;
  hand: Hand;
  midis: number[];
  /** Fingerings a teacher would write. */
  good: Finger[][];
  /** Fingerings the inferrer has actually produced, and that are wrong. */
  bad: Finger[][];
}

const PASSAGES: Passage[] = [
  {
    name: 'RH C major octave ascending',
    hand: 'R',
    midis: [60, 62, 64, 65, 67, 69, 71, 72],
    good: [[1, 2, 3, 1, 2, 3, 4, 5], [1, 2, 3, 4, 1, 2, 3, 4]],
    bad: [[1, 1, 1, 2, 2, 3, 4, 5]],
  },
  {
    name: 'RH C major octave descending',
    hand: 'R',
    midis: [72, 71, 69, 67, 65, 64, 62, 60],
    good: [[5, 4, 3, 2, 1, 3, 2, 1]],
    bad: [[5, 4, 3, 2, 1, 1, 1, 1]],
  },
  {
    name: 'LH C major octave descending',
    hand: 'L',
    midis: [60, 59, 57, 55, 53, 52, 50, 48],
    good: [[1, 2, 3, 1, 2, 3, 4, 5]],
    bad: [[1, 1, 1, 1, 2, 3, 4, 5]],
  },
  {
    name: 'LH sixth then third, one finger cannot slide it',
    hand: 'L',
    midis: [40, 49, 52],
    good: [[5, 2, 1], [5, 3, 1]],
    bad: [[5, 5, 5]],
  },
];

const build = (midis: number[], fingers: Finger[], hand: Hand): FallingNote[] =>
  midis.map((midi, i) => ({ midi, start: i * 0.4, duration: 0.4, hand, finger: fingers[i] }));

/** Candidate targets, each reduced to a single number that should go down. */
const CANDIDATES: Record<string, (notes: FallingNote[]) => number> = {
  sameFingerLeaps: n => measureFingering(n).sameFingerLeaps.length,
  wastedHandTravel: n => measureFingering(n).wastedHandTravel.length,
  longestRepetitionRun: n => measureFingering(n).longestRepetitionRun,
  pitchChangingRepetitionRuns: n => measureFingering(n).pitchChangingRepetitionRuns,
  repositionsInMonotoneRuns: n => measureFingering(n).repositionsInMonotoneRuns.length,
};

/** Passages where a metric ranks a conventional fingering worse than a defective one. */
function inversions(score: (notes: FallingNote[]) => number): string[] {
  const found: string[] = [];
  for (const passage of PASSAGES) {
    const worstGood = Math.max(...passage.good.map(f => score(build(passage.midis, f, passage.hand))));
    const bestBad = Math.min(...passage.bad.map(f => score(build(passage.midis, f, passage.hand))));
    if (worstGood > bestBad) found.push(`${passage.name}: good ${worstGood} > bad ${bestBad}`);
  }
  return found;
}

describe('metric validity against conventional fingerings', () => {
  it.each([
    'sameFingerLeaps',
    'wastedHandTravel',
    'longestRepetitionRun',
    'pitchChangingRepetitionRuns',
  ])('%s never prefers a defective fingering', name => {
    expect(inversions(CANDIDATES[name])).toEqual([]);
  });

  it('records that repositionsInMonotoneRuns is disqualified as a target', () => {
    // Kept as a failing case on purpose. It is the metric two attempts at stage 3
    // were spent minimising, and this is the evidence that doing so pushes the
    // fingering the wrong way. If a later change makes this pass, that is news —
    // re-derive it before trusting it.
    expect(inversions(CANDIDATES.repositionsInMonotoneRuns).length).toBeGreaterThan(0);
  });

  it('ranks the corpus arpeggio the wrong way round under the disqualified metric', () => {
    // Bar 3 of the corpus: 26 semitones ascending, wider than the hand, so the
    // hand must relocate whatever the fingering. The conventional answers all
    // score worse than what the model produced.
    const midis = [40, 47, 56, 59, 66];
    const score = (f: Finger[]) =>
      measureFingering(build(midis, f, 'L')).repositionsInMonotoneRuns.length;

    expect(score([5, 1, 2, 1, 2])).toBe(2);
    expect(score([5, 4, 2, 1, 2])).toBe(3);
    expect(score([5, 3, 2, 1, 3])).toBe(3);
  });
});
