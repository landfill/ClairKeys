/**
 * Fingering measured against a real score rather than hand-built scales.
 *
 * The numbers below are a ratchet, not a target. They record what
 * `phrase-dp-v2` does to the corpus today, defects included, so that issue #130
 * can be worked on one mechanism at a time with the effect of each change
 * visible. Any change to the inferrer moves these numbers and must update them
 * deliberately — an improvement fails this test just as loudly as a regression,
 * which is the point.
 *
 * Run `npm run fingering:report` to see the individual bars behind each count.
 */

import fs from 'node:fs';
import path from 'node:path';
import { addFingeringToNotes } from '../fingeringUtils';
import { measureFingering, maxReach, impliedAnchor } from '../../../scripts/lib/fingeringMetrics';
import type { FallingNote, Finger } from '@/types/fallingNotes';

const CORPUS = path.join(__dirname, '..', '..', '..', 'fixtures', 'fingering');

function loadCorpusScore(file: string): { notes: FallingNote[]; raw: Record<string, unknown>[] } {
  const doc = JSON.parse(fs.readFileSync(path.join(CORPUS, file), 'utf8'));
  return {
    raw: doc.notes,
    notes: doc.notes.map((n: Record<string, unknown>) => ({
      midi: n.midi as number,
      start: n.start as number,
      duration: n.duration as number,
      hand: n.hand as FallingNote['hand'],
      finger: n.finger as FallingNote['finger'],
    })),
  };
}

describe('fingering metrics', () => {
  it('treats a finger pair that cannot span an interval as unreachable', () => {
    expect(maxReach(4, 5)).toBe(5);
    expect(maxReach(1, 5)).toBe(15);
    // Two notes cannot share one finger at any distance.
    expect(maxReach(3, 3)).toBe(0);
    // The table is symmetric in the order the fingers are given.
    expect(maxReach(5, 2)).toBe(maxReach(2, 5));
  });

  it('derives the same hand position from either hand playing the same shape', () => {
    // A right-hand thumb and a left-hand little finger both sit at the low edge.
    expect(impliedAnchor(60, 1, 'R')).toBe(60);
    expect(impliedAnchor(60, 5, 'L')).toBe(60);
    // A perfect fifth is exactly the natural span, so the far finger implies the
    // same position — this is the mechanism issue #130 turns on.
    expect(impliedAnchor(67, 5, 'R')).toBe(60);
    expect(impliedAnchor(67, 1, 'L')).toBe(60);
  });
});

describe('love-affair-411 corpus score', () => {
  const { notes, raw } = loadCorpusScore('love-affair-411.json');
  const enhanced = addFingeringToNotes(notes);

  it('reaches the player with hands already assigned by staff, never by pitch range', () => {
    // `converter.py` maps staff 1 to the right hand and staff 2 and beyond to the
    // left, and `addFingeringToNotes` preserves a valid hand. The player's own
    // pitch-range fallback therefore never runs on this score — which matters,
    // because the left hand climbs above the right hand's lowest note here and a
    // range rule would misassign those notes.
    const mismatches = raw.filter((n, index) =>
      (n.staff === 1 && enhanced[index].hand !== 'R') || (n.staff === 2 && enhanced[index].hand !== 'L'));
    expect(mismatches).toHaveLength(0);

    const lowestRight = Math.min(...enhanced.filter(n => n.hand === 'R').map(n => n.midi));
    const leftAbove = enhanced.filter(n => n.hand === 'L' && n.midi > lowestRight);
    expect(leftAbove.length).toBeGreaterThan(0);
  });

  it('carries no source fingering, so every number on screen is inferred', () => {
    const supplied = notes.filter(n => [1, 2, 3, 4, 5].includes(n.finger as number));
    expect(supplied).toHaveLength(0);
    expect(enhanced.every(n => n.fingerSource === 'inferred')).toBe(true);
  });

  it('is deterministic', () => {
    expect(addFingeringToNotes(notes)).toEqual(enhanced);
  });

  it('assigns every note a finger in range', () => {
    expect(enhanced.filter(n => !([1, 2, 3, 4, 5] as Finger[]).includes(n.finger as Finger))).toHaveLength(0);
  });

  // --- the ratchet -------------------------------------------------------
  // Each number is a defect issue #130 is meant to reduce. Lower them as the
  // work lands; never raise one without saying why in the same commit.
  it('records what phrase-dp-v2 currently does, defects included', () => {
    const m = measureFingering(enhanced);

    // Defect 2: no absolute per-pair reach limit, so chords get finger pairs
    // that cannot span them. Target 0.
    expect({
      unreachableChordPairs: m.reachViolations.length,
      chordPairs: m.chordPairs,
    }).toEqual({ unreachableChordPairs: 23, chordPairs: 132 });

    // Defect 1: the hand relocates part-way through steady pitch motion because
    // the model spends its whole span in one step and then oscillates. Target is
    // roughly one reposition per octave of a run, far below this.
    expect({
      repositions: m.repositionsInMonotoneRuns.length,
      overEvents: m.monotoneRunEvents,
    }).toEqual({ repositions: 65, overEvents: 171 });

    // Finger repetition is largely solved; both remaining runs are in the left
    // hand, and one of them is a genuinely repeated note (B2 B2 B2).
    expect(m.repetitionRuns.map(r => `${r.hand} finger ${r.finger} x${r.length}`))
      .toEqual(['L finger 1 x3', 'L finger 1 x3']);
  });

  it('spends the whole left hand on the first step of the bar 3 arpeggio', () => {
    // The reported symptom, pinned exactly. E2 to B2 is a perfect fifth, so
    // little finger and thumb imply the same hand position and the step is free —
    // after which nothing is left and the fingering oscillates 2-1-2-1.
    const bar3 = enhanced
      .filter(n => n.hand === 'L' && n.start >= 8 && n.start < 12)
      .sort((a, b) => a.start - b.start);
    expect(bar3.map(n => n.midi)).toEqual([40, 47, 56, 59, 66, 59, 56]);
    expect(bar3.map(n => n.finger)).toEqual([5, 1, 2, 1, 2, 1, 2]);
    expect(impliedAnchor(40, 5, 'L')).toBe(impliedAnchor(47, 1, 'L'));
  });
});
