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
  {
    // Bar 3 of the corpus, and the passage issue #130 was opened about. It has
    // to be here: a set built only from scales validates a metric on passages
    // where the defect does not occur. Two candidate metrics passed this file
    // until this entry was added, and both inverted on it immediately.
    name: 'LH bar 3 arpeggio, wider than the hand',
    hand: 'L',
    midis: [40, 47, 56, 59, 66],
    good: [[5, 4, 2, 1, 2], [5, 3, 2, 1, 3]],
    bad: [[5, 1, 2, 1, 2]],
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

/** Passages where a metric actually separates the good fingerings from the bad. */
function discriminations(score: (notes: FallingNote[]) => number): string[] {
  const found: string[] = [];
  for (const passage of PASSAGES) {
    const worstGood = Math.max(...passage.good.map(f => score(build(passage.midis, f, passage.hand))));
    const bestBad = Math.min(...passage.bad.map(f => score(build(passage.midis, f, passage.hand))));
    if (worstGood < bestBad) found.push(passage.name);
  }
  return found;
}

describe('what the motion measures do and do not describe', () => {
  const twoNotes = (gapAfterFirst: number): FallingNote[] => [
    // One finger, an octave apart: impossible to slide, trivial to re-strike.
    { midi: 48, start: 0, duration: 1, hand: 'L', finger: 5 },
    { midi: 60, start: 1 + gapAfterFirst, duration: 1, hand: 'L', finger: 5 },
  ];

  it('counts a finger asked to slide an octave when the notes abut', () => {
    const m = measureFingering(twoNotes(0));
    expect(m.melodicTransitions).toBe(1);
    expect(m.sameFingerLeaps).toHaveLength(1);
    expect(m.wastedHandTravel).toHaveLength(1);
  });

  it('counts nothing across a rest, because the hand simply moves', () => {
    // The corpus was counting a transition separated by fifteen seconds, which
    // is a different passage rather than a fingering defect.
    const m = measureFingering(twoNotes(0.5));
    expect(m.melodicTransitions).toBe(0);
    expect(m.sameFingerLeaps).toEqual([]);
    expect(m.wastedHandTravel).toEqual([]);
  });

  it('still counts notes that overlap, which are held rather than released', () => {
    const overlapping: FallingNote[] = [
      { midi: 48, start: 0, duration: 2, hand: 'L', finger: 5 },
      { midi: 60, start: 1, duration: 1, hand: 'L', finger: 5 },
    ];
    expect(measureFingering(overlapping).melodicTransitions).toBe(1);
  });

  it('reports zero rather than dividing by nothing on a degenerate score', () => {
    for (const notes of [[], [{ midi: 60, start: 0, duration: 1, hand: 'R' as const, finger: 1 as Finger }]]) {
      const m = measureFingering(notes);
      expect(m.melodicTransitions).toBe(0);
      expect(m.monotoneRunEvents).toBe(0);
      expect(m.chordPairs).toBe(0);
      expect(m.longestRepetitionRun).toBe(0);
      expect(m.sameFingerLeaps).toEqual([]);
      expect(m.wastedHandTravel).toEqual([]);
    }
  });

  it('ignores a note with no finger rather than guessing one', () => {
    const partial: FallingNote[] = [
      { midi: 48, start: 0, duration: 1, hand: 'L', finger: 5 },
      { midi: 60, start: 1, duration: 1, hand: 'L' },
    ];
    expect(measureFingering(partial).melodicTransitions).toBe(0);
  });
});

/** The measures admitted as optimisation targets. */
const ADMITTED = ['sameFingerLeaps', 'longestRepetitionRun', 'pitchChangingRepetitionRuns'];

describe('metric validity against conventional fingerings', () => {
  it.each(ADMITTED)('%s never prefers a defective fingering', name => {
    expect(inversions(CANDIDATES[name])).toEqual([]);
  });

  it.each(ADMITTED)('%s can actually tell a good fingering from a bad one', name => {
    // Not-inverting is not enough. A measure that returns the same number for
    // both is useless as a target and passes an inversion check trivially —
    // `wastedHandTravel` scored 0 for good and bad alike on every scale here,
    // which is how it was admitted before this test existed.
    expect(discriminations(CANDIDATES[name]).length).toBeGreaterThan(0);
  });

  it('records that wastedHandTravel is disqualified as a target', () => {
    // It inverts on the arpeggio — the very passage issue #130 is about. The
    // model's `5 1 2 1 2` scores 2 of 4 while both conventional answers score 3,
    // and an exhaustive search over all 5^5 fingerings puts `1 4 1 4 1` on top
    // at 1 of 4, which no one would play. Kept as a descriptive measure.
    expect(inversions(CANDIDATES.wastedHandTravel))
      .toEqual(['LH bar 3 arpeggio, wider than the hand: good 3 > bad 2']);
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
