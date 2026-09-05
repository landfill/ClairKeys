/**
 * The anatomy both the inferrer and its metrics read from.
 *
 * Worth testing on its own precisely because two things depend on it: an error
 * here is invisible to the metric, which is the one guard that would otherwise
 * catch the inferrer producing an impossible shape.
 */

import { NATURAL_SPAN, spatialFinger, impliedAnchor, maxReach, chordIsReachable } from '../handReach';
import type { Finger } from '@/types/fallingNotes';

const FINGERS: Finger[] = [1, 2, 3, 4, 5];

describe('spatialFinger', () => {
  it('numbers fingers by keyboard position, so both thumbs are not spatial 1', () => {
    expect(FINGERS.map(f => spatialFinger(f, 'R'))).toEqual([1, 2, 3, 4, 5]);
    // The left thumb is the hand's rightmost finger.
    expect(FINGERS.map(f => spatialFinger(f, 'L'))).toEqual([5, 4, 3, 2, 1]);
  });
});

describe('impliedAnchor', () => {
  it('puts the hand in the same place for a mirrored shape in either hand', () => {
    expect(impliedAnchor(60, 1, 'R')).toBe(60);
    expect(impliedAnchor(60, 5, 'L')).toBe(60);
  });

  it('makes a perfect fifth cost the hand nothing, which is what issue #130 turns on', () => {
    // The natural span is exactly seven semitones, so little finger and thumb a
    // fifth apart imply one position — the whole hand spent in a single step.
    expect(NATURAL_SPAN[4] - NATURAL_SPAN[0]).toBe(7);
    expect(impliedAnchor(67, 5, 'R')).toBe(impliedAnchor(60, 1, 'R'));
    expect(impliedAnchor(47, 1, 'L')).toBe(impliedAnchor(40, 5, 'L'));
  });
});

describe('maxReach', () => {
  it('gives no reach at all to a finger against itself', () => {
    FINGERS.forEach(f => expect(maxReach(f, f)).toBe(0));
  });

  it('is symmetric and defined for every pair', () => {
    FINGERS.forEach(a => FINGERS.forEach(b => {
      expect(maxReach(a, b)).toBe(maxReach(b, a));
      expect(Number.isFinite(maxReach(a, b))).toBe(true);
    }));
  });

  it('reaches furthest from the thumb and least between the long fingers', () => {
    expect(maxReach(1, 5)).toBeGreaterThan(maxReach(2, 5));
    expect(maxReach(3, 4)).toBeLessThan(maxReach(2, 4));
  });
});

describe('chordIsReachable', () => {
  it('accepts an octave held by the thumb and little finger', () => {
    expect(chordIsReachable([60, 72], [1, 5])).toBe(true);
  });

  it('rejects an octave held by the ring and little fingers', () => {
    // The shape `phrase-dp-v2` produced for E4 + E5 in bar 7 of the corpus.
    expect(chordIsReachable([64, 76], [4, 5])).toBe(false);
  });

  it('rejects two notes on one finger', () => {
    expect(chordIsReachable([60, 61], [3, 3])).toBe(false);
  });

  it('checks every pair, because the table is nowhere subadditive', () => {
    // All ten finger triples satisfy maxReach(a,b) + maxReach(b,c) > maxReach(a,c),
    // so neighbouring spans that both fit can still add up to an outer span that
    // does not. Assert the property itself, not one example of it.
    const triples: [Finger, Finger, Finger][] = [];
    FINGERS.forEach(a => FINGERS.forEach(b => FINGERS.forEach(c => {
      if (a < b && b < c) triples.push([a, b, c]);
    })));
    expect(triples).toHaveLength(10);
    const subadditive = triples.filter(([a, b, c]) => maxReach(a, b) + maxReach(b, c) <= maxReach(a, c));
    expect(subadditive).toEqual([]);

    // C4-A#4-D#5 on 1-2-3 sits exactly on both adjacent limits and fifteen
    // semitones past the outer one.
    expect(60 + maxReach(1, 2)).toBe(70);
    expect(70 + maxReach(2, 3)).toBe(75);
    expect(chordIsReachable([60, 70], [1, 2])).toBe(true);
    expect(chordIsReachable([70, 75], [2, 3])).toBe(true);
    expect(chordIsReachable([60, 70, 75], [1, 2, 3])).toBe(false);
  });
});
