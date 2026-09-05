/**
 * What a hand can physically do, independent of how fingering is chosen.
 *
 * These are anatomy, not scoring: how far apart the fingers sit in a relaxed
 * position, and how far each pair can still be pulled apart. Both the inferrer
 * and the metrics that judge it read from here, and neither imports the other.
 *
 * That third place matters. If the metrics asked the cost model whether a shape
 * was legal, a model that believed an octave between the ring and little finger
 * was fine would produce a metric that believed it too, and the measurement
 * could never contradict the thing it measures. If instead each kept its own
 * copy of the table, the two would drift apart silently. Sharing the anatomy —
 * and only the anatomy — avoids both.
 */

import type { Finger, Hand } from '@/types/fallingNotes';

/**
 * Semitones from the low edge of a natural hand position to each spatial
 * finger: the white-key C-D-E-F-G shape. Index 0 is the low finger — the right
 * thumb, the left little finger — so one table serves both hands.
 */
export const NATURAL_SPAN = [0, 2, 4, 5, 7] as const;

/**
 * A finger renumbered by where it sits on the keyboard rather than on the hand,
 * so that 1 is always the leftmost finger and 5 the rightmost. The right thumb
 * and the left little finger are both spatial 1.
 */
export function spatialFinger(finger: Finger, hand: Hand): number {
  return hand === 'R' ? finger : 6 - finger;
}

/**
 * Where a finger playing a pitch puts the hand, as a MIDI number.
 *
 * A finger and a pitch together pin the hand, which is why hand position never
 * has to be tracked separately: comparing implied anchors across two events
 * says how far the hand travelled between them.
 */
export function impliedAnchor(midi: number, finger: Finger, hand: Hand): number {
  return midi - NATURAL_SPAN[spatialFinger(finger, hand) - 1];
}

/**
 * Largest interval each finger pair can still take, in semitones, for an adult
 * hand, keyed low-finger-first. Deliberately generous: the boundary is "no
 * longer physically available", not "uncomfortable", so that nothing decided by
 * this table turns into an argument about hand size.
 *
 * Not sourced from Parncutt et al. (1997). That paper gives comfort and
 * practical ranges per pair and is the reference to adopt if these are ever
 * tightened — which is a separate decision from applying them at all.
 */
const MAX_REACH: Readonly<Record<string, number>> = {
  '1-2': 10, '1-3': 12, '1-4': 14, '1-5': 15,
  '2-3': 5, '2-4': 7, '2-5': 10,
  '3-4': 4, '3-5': 7,
  '4-5': 5,
};

/**
 * The widest interval this finger pair can still take, in semitones.
 *
 * Zero for one finger against itself: two notes cannot share a finger at any
 * distance. Never null for a valid pair — every combination is in the table.
 */
export function maxReach(a: Finger, b: Finger): number {
  if (a === b) return 0;
  const [low, high] = a < b ? [a, b] : [b, a];
  return MAX_REACH[`${low}-${high}`];
}

/**
 * Whether one hand can hold every note of a chord at once.
 *
 * Checked over every pair, not only neighbouring notes: the table is nowhere
 * subadditive — all ten finger triples have `maxReach(a,b) + maxReach(b,c)`
 * greater than `maxReach(a,c)`, by two to five semitones — so two legal adjacent
 * spans can add up to an outer span no hand can take.
 *
 * `midis` must be ascending, with `fingers` aligned to it.
 */
export function chordIsReachable(midis: readonly number[], fingers: readonly Finger[]): boolean {
  for (let low = 0; low < midis.length - 1; low += 1) {
    for (let high = low + 1; high < midis.length; high += 1) {
      if (midis[high] - midis[low] > maxReach(fingers[low], fingers[high])) return false;
    }
  }
  return true;
}

/** Widest interval a thumb crossing spans. Beyond it the hand simply leaps. */
const CROSSING_MAX_INTERVAL = 5;

/**
 * Whether two consecutive notes can be joined by passing the thumb under the
 * hand, or a finger over the thumb.
 *
 * One end must be the thumb — it is what passes under, and what the others pass
 * over — the other must be 2, 3 or 4, and the step must be small enough to tuck.
 * A crossing moves the hand without breaking contact, so it is the one
 * relocation that costs a line nothing.
 */
export function isThumbCrossing(
  fromMidi: number,
  fromFinger: Finger,
  toMidi: number,
  toFinger: Finger,
  hand: Hand,
): boolean {
  const pitchDelta = toMidi - fromMidi;
  if (pitchDelta === 0 || Math.abs(pitchDelta) > CROSSING_MAX_INTERVAL) return false;

  const other = fromFinger === 1 ? toFinger : toFinger === 1 ? fromFinger : 0;
  if (other === 0 || other === 5) return false;

  // The finger number must move against the pitch: that is what a crossing is.
  const spatialDelta = spatialFinger(toFinger, hand) - spatialFinger(fromFinger, hand);
  return spatialDelta !== 0 && Math.sign(spatialDelta) !== Math.sign(pitchDelta);
}
