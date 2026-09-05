/**
 * Fingering measured against a real score rather than hand-built scales.
 *
 * The numbers below are a ratchet, not a target. They record what the inferrer
 * does to the corpus today, defects included, so that issue #130 can be worked
 * on one mechanism at a time with the effect of each change visible. Any change to the inferrer moves these numbers and must update them
 * deliberately — an improvement fails this test just as loudly as a regression,
 * which is the point.
 *
 * Run `npm run fingering:report` to see the individual bars behind each count.
 */

import fs from 'node:fs';
import path from 'node:path';
import { addFingeringToNotes } from '../fingeringUtils';
import { measureFingering } from '../../../scripts/lib/fingeringMetrics';
import type { FallingNote, Finger } from '@/types/fallingNotes';

const CORPUS = path.join(__dirname, '..', '..', '..', 'fixtures', 'fingering');

/**
 * Read a corpus score the way the player does, returning both the mapped notes
 * and the raw entries so a test can check what the mapping dropped.
 */
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
  it('records what the inferrer currently does, defects included', () => {
    const m = measureFingering(enhanced);

    // Defect 2 is fixed: `chordIsReachable` now prunes chord candidates, so no
    // chord is fingered with a pair that cannot span it. This must stay at 0.
    expect({
      unreachableChordPairs: m.reachViolations.length,
      chordPairs: m.chordPairs,
    }).toEqual({ unreachableChordPairs: 0, chordPairs: 154 });

    // Defect 1 is addressed by the directional budget: a run should not spend
    // the directional end of the hand in one jump and then oscillate.
    expect({
      repositions: m.repositionsInMonotoneRuns.length,
      overEvents: m.monotoneRunEvents,
    }).toEqual({ repositions: 61, overEvents: 171 });

    // Finger repetition is largely solved; both remaining runs are in the left
    // hand; one is a genuinely repeated-note group (B2 B2 B2).
    expect(m.repetitionRuns.map(r => `${r.hand} finger ${r.finger} x${r.length}`))
      .toEqual(['L finger 1 x3', 'L finger 1 x4']);
  });

  it('keeps directional room in the left hand at the start of the bar 3 arpeggio', () => {
    // E2 to B2 is a perfect fifth, so little finger and thumb imply the same
    // hand position. The directional budget makes spending all five spatial
    // fingers in that first step cost more than retaining an inner finger for
    // the continuing ascent. The resulting 5-2-2-1-2-1-2 sequence uses a
    // non-terminal finger on the opening fifth and avoids the old 5-1 opening
    // that left no directional room; every note remains a valid 1-5 hint.
    const bar3 = enhanced
      .filter(n => n.hand === 'L' && n.start >= 8 && n.start < 12)
      .sort((a, b) => a.start - b.start);
    expect(bar3.map(n => n.midi)).toEqual([40, 47, 56, 59, 66, 59, 56]);
    expect(bar3.map(n => n.finger)).toEqual([5, 2, 2, 1, 2, 1, 2]);
  });

  it('does not spend the whole hand on a fifth at the start of an ascending run', () => {
    const notes = [40, 47, 56, 59, 66].map((midi, index) => ({
      midi,
      start: index,
      duration: 0.5,
      hand: 'L' as const,
    }));

    const fingers = addFingeringToNotes(notes).map(note => note.finger);
    expect(fingers[0]).toBe(5);
    expect(fingers[1]).not.toBe(1);
    expect(fingers.slice(0, 2)).toEqual([5, 2]);
  });
});
