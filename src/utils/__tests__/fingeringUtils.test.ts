/**
 * Tests for fingering utilities
 */

import { 
  assignHand, 
  assignFinger, 
  isBlackKeyMidi, 
  addFingeringToNotes,
  generateSampleNotesWithFingering,
  FINGERING_ALGORITHM_VERSION,
} from '../fingeringUtils';
import type { FallingNote, Finger, Hand } from '@/types/fallingNotes';
import { chordIsReachable } from '../handReach';

describe('fingeringUtils', () => {
  describe('isBlackKeyMidi', () => {
    it('should correctly identify black keys', () => {
      // Black keys: C#, D#, F#, G#, A#
      expect(isBlackKeyMidi(61)).toBe(true); // C#4
      expect(isBlackKeyMidi(63)).toBe(true); // D#4
      expect(isBlackKeyMidi(66)).toBe(true); // F#4
      expect(isBlackKeyMidi(68)).toBe(true); // G#4
      expect(isBlackKeyMidi(70)).toBe(true); // A#4
    });

    it('should correctly identify white keys', () => {
      // White keys: C, D, E, F, G, A, B
      expect(isBlackKeyMidi(60)).toBe(false); // C4
      expect(isBlackKeyMidi(62)).toBe(false); // D4
      expect(isBlackKeyMidi(64)).toBe(false); // E4
      expect(isBlackKeyMidi(65)).toBe(false); // F4
      expect(isBlackKeyMidi(67)).toBe(false); // G4
      expect(isBlackKeyMidi(69)).toBe(false); // A4
      expect(isBlackKeyMidi(71)).toBe(false); // B4
    });
  });

  describe('assignHand', () => {
    it('should assign left hand for low notes', () => {
      expect(assignHand(48)).toBe('L'); // C3
      expect(assignHand(36)).toBe('L'); // C2
    });

    it('should assign right hand for high notes', () => {
      expect(assignHand(72)).toBe('R'); // C5
      expect(assignHand(84)).toBe('R'); // C6
    });

    it('should handle middle range appropriately', () => {
      const middleC = assignHand(60); // C4
      expect(['L', 'R']).toContain(middleC);
    });

    it('should consider context when provided', () => {
      const prevHand = 'L';
      const result = assignHand(60, { prevHand });
      expect(['L', 'R']).toContain(result);
    });
  });

  describe('assignFinger', () => {
    it('should assign valid finger numbers', () => {
      const finger = assignFinger(60, 'R');
      expect(finger).toBeGreaterThanOrEqual(1);
      expect(finger).toBeLessThanOrEqual(5);
    });

    it('should avoid thumb (1) on black keys', () => {
      const leftFinger = assignFinger(61, 'L', { isBlackKey: true }); // C#4
      const rightFinger = assignFinger(61, 'R', { isBlackKey: true }); // C#4
      
      expect(leftFinger).not.toBe(1);
      expect(rightFinger).not.toBe(1);
      expect([2, 3, 4]).toContain(leftFinger);
      expect([2, 3, 4]).toContain(rightFinger);
    });

    it('should assign deterministic conventional fingers to black keys', () => {
      const random = jest.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('fingering must not use randomness');
      });

      try {
        const inputs: Array<[number, 'L' | 'R']> = [
          [61, 'L'], [63, 'L'], [66, 'R'], [68, 'R'], [70, 'R']
        ];
        inputs.forEach(([midi, hand]) => {
          const finger = assignFinger(midi, hand);
          expect([2, 3, 4]).toContain(finger);
          expect(assignFinger(midi, hand)).toBe(finger);
        });
      } finally {
        random.mockRestore();
      }
    });

    it('should handle scale positions correctly', () => {
      const right = Array.from({ length: 8 }, (_, position) =>
        assignFinger(60, 'R', { scalePosition: position })
      );
      const left = Array.from({ length: 8 }, (_, position) =>
        assignFinger(48, 'L', { scalePosition: position })
      );
      expect(right).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
      expect(left).toEqual([5, 4, 3, 2, 1, 3, 2, 1]);
    });

    it('should handle chord positions correctly', () => {
      expect([0, 1, 2].map(chordPosition =>
        assignFinger(60, 'R', { chordPosition })
      )).toEqual([1, 3, 5]);
      expect([0, 1, 2].map(chordPosition =>
        assignFinger(48, 'L', { chordPosition })
      )).toEqual([5, 3, 1]);
    });

    it('should be repeatable and use only valid fingers for fallback assignments', () => {
      const random = jest.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('fingering must not use randomness');
      });

      try {
        for (const hand of ['L', 'R'] as const) {
          for (const midi of [21, 36, 48, 54, 60, 67, 77, 84, 96]) {
            const first = assignFinger(midi, hand);
            expect(assignFinger(midi, hand)).toBe(first);
            expect(first).toBeGreaterThanOrEqual(1);
            expect(first).toBeLessThanOrEqual(5);
          }
        }
      } finally {
        random.mockRestore();
      }
    });
  });

  describe('addFingeringToNotes', () => {
    it('should add hand and finger to all notes', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 1 },
        { midi: 64, start: 1, duration: 1 },
        { midi: 67, start: 2, duration: 1 }
      ];

      const enhanced = addFingeringToNotes(notes);
      
      expect(enhanced).toHaveLength(3);
      enhanced.forEach(note => {
        expect(note.hand).toBeDefined();
        expect(note.finger).toBeDefined();
        expect(['L', 'R']).toContain(note.hand!);
        expect(note.finger).toBeGreaterThanOrEqual(1);
        expect(note.finger).toBeLessThanOrEqual(5);
      });
    });

    it('should preserve existing note properties', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 1, velocity: 0.8 }
      ];

      const enhanced = addFingeringToNotes(notes);
      
      expect(enhanced[0].midi).toBe(60);
      expect(enhanced[0].start).toBe(0);
      expect(enhanced[0].duration).toBe(1);
      expect(enhanced[0].velocity).toBe(0.8);
      expect(enhanced[0].hand).toBeDefined();
      expect(enhanced[0].finger).toBeDefined();
    });

    it('should preserve existing valid hand and finger assignments', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 1, hand: 'R', finger: 4 },
        { midi: 48, start: 1, duration: 1, hand: 'L', finger: 2 },
      ];

      expect(addFingeringToNotes(notes).map(({ hand, finger }) => ({ hand, finger }))).toEqual([
        { hand: 'R', finger: 4 },
        { hand: 'L', finger: 2 },
      ]);
    });

    it('should assign simultaneous notes conventional chord fingers by ascending pitch', () => {
      const notes: FallingNote[] = [
        { midi: 67, start: 0, duration: 1, hand: 'R' },
        { midi: 60, start: 0, duration: 1, hand: 'R' },
        { midi: 64, start: 0, duration: 1, hand: 'R' },
        { midi: 48, start: 0, duration: 1, hand: 'L' },
        { midi: 36, start: 0, duration: 1, hand: 'L' },
        { midi: 43, start: 0, duration: 1, hand: 'L' },
      ];

      const enhanced = addFingeringToNotes(notes);
      expect(enhanced.slice(0, 3).sort((a, b) => a.midi - b.midi).map(note => note.finger)).toEqual([1, 3, 5]);
      expect(enhanced.slice(3).sort((a, b) => a.midi - b.midi).map(note => note.finger)).toEqual([5, 3, 1]);
    });

    it('should preserve explicit chord fingers while filling the remaining notes deterministically', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 1, hand: 'R', finger: 2 },
        { midi: 64, start: 0, duration: 1, hand: 'R' },
        { midi: 67, start: 0, duration: 1, hand: 'R' },
      ];

      const enhanced = addFingeringToNotes(notes);
      expect(enhanced.map(note => note.finger)).toEqual([2, 3, 5]);
    });

    it('should keep fallback fingers valid for chords larger than five notes', () => {
      const notes: FallingNote[] = Array.from({ length: 7 }, (_, index) => ({
        midi: 60 + index * 2,
        start: 0,
        duration: 1,
        hand: 'R' as const,
      }));

      addFingeringToNotes(notes).forEach(note => {
        expect(note.finger).toBeGreaterThanOrEqual(1);
        expect(note.finger).toBeLessThanOrEqual(5);
      });
    });

    it('should apply the standard right-hand scale pattern to an ascending C-major run', () => {
      const notes: FallingNote[] = [60, 62, 64, 65, 67, 69, 71, 72].map((midi, index) => ({
        midi,
        start: index,
        duration: 1,
        hand: 'R' as const,
      }));

      expect(addFingeringToNotes(notes).map(note => note.finger)).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
    });

    it('should recognize a right-hand scale when left-hand accompaniment is interleaved', () => {
      const notes: FallingNote[] = [60, 48, 62, 43, 64, 45, 65, 47, 67, 48, 69, 43, 71, 45, 72, 47].map((midi, index) => ({
        midi,
        start: Math.floor(index / 2),
        duration: 1,
        hand: index % 2 === 0 ? 'R' as const : 'L' as const,
      }));

      const enhanced = addFingeringToNotes(notes);
      expect(enhanced.filter(note => note.hand === 'R').map(note => note.finger)).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
    });

    it('should apply the standard left-hand scale pattern to an ascending C-major run', () => {
      const notes: FallingNote[] = [36, 38, 40, 41, 43, 45, 47, 48].map((midi, index) => ({
        midi,
        start: index,
        duration: 1,
        hand: 'L' as const,
      }));

      expect(addFingeringToNotes(notes).map(note => note.finger)).toEqual([5, 4, 3, 2, 1, 3, 2, 1]);
    });

    it('uses mirrored five-finger positions for short ascending phrases', () => {
      const pitches = [60, 62, 64, 65, 67];
      const right = pitches.map((midi, start) => ({ midi, start, duration: 0.5, hand: 'R' as const }));
      const left = pitches.map((midi, start) => ({ midi: midi - 12, start, duration: 0.5, hand: 'L' as const }));

      expect(addFingeringToNotes(right).map(note => note.finger)).toEqual([1, 2, 3, 4, 5]);
      expect(addFingeringToNotes(left).map(note => note.finger)).toEqual([5, 4, 3, 2, 1]);
    });

    it('uses mirrored five-finger positions for short descending phrases', () => {
      const pitches = [67, 65, 64, 62, 60];
      const right = pitches.map((midi, start) => ({ midi, start, duration: 0.5, hand: 'R' as const }));
      const left = pitches.map((midi, start) => ({ midi: midi - 12, start, duration: 0.5, hand: 'L' as const }));

      expect(addFingeringToNotes(right).map(note => note.finger)).toEqual([5, 4, 3, 2, 1]);
      expect(addFingeringToNotes(left).map(note => note.finger)).toEqual([1, 2, 3, 4, 5]);
    });

    it('marks preserved and inferred fingers with distinct provenance', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 0.5, hand: 'R', finger: 2 },
        { midi: 62, start: 0.5, duration: 0.5, hand: 'R' },
      ];

      expect(addFingeringToNotes(notes).map(note => ({ finger: note.finger, source: note.fingerSource }))).toEqual([
        { finger: 2, source: 'source' },
        { finger: 3, source: 'inferred' },
      ]);
      expect(addFingeringToNotes(notes)[1].fingeringAlgorithm).toBe(FINGERING_ALGORITHM_VERSION);
    });

    it('keeps repeated notes on one finger inside a phrase', () => {
      const notes: FallingNote[] = [0, 0.5, 1].map(start => ({
        midi: 66,
        start,
        duration: 0.5,
        hand: 'R',
      }));

      const fingers = addFingeringToNotes(notes).map(note => note.finger);
      expect(new Set(fingers).size).toBe(1);
      expect(fingers[0]).not.toBe(1);
    });

    it('does not split a phrase while an earlier sustained note is still sounding', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 5, hand: 'R' },
        { midi: 62, start: 0.5, duration: 0.5, hand: 'R' },
        { midi: 64, start: 3, duration: 0.5, hand: 'R' },
        { midi: 65, start: 3.5, duration: 0.5, hand: 'R' },
      ];

      expect(addFingeringToNotes(notes).map(note => note.finger)).toEqual([1, 2, 3, 4]);
    });

    it('uses phrase context independently for two interleaved hands', () => {
      const notes: FallingNote[] = [0, 1, 2, 3, 4].flatMap(start => [
        { midi: 48 + [0, 2, 4, 5, 7][start], start, duration: 0.5, hand: 'L' as const },
        { midi: 60 + [0, 2, 4, 5, 7][start], start, duration: 0.5, hand: 'R' as const },
      ]);

      const enhanced = addFingeringToNotes(notes);
      expect(enhanced.filter(note => note.hand === 'L').map(note => note.finger)).toEqual([5, 4, 3, 2, 1]);
      expect(enhanced.filter(note => note.hand === 'R').map(note => note.finger)).toEqual([1, 2, 3, 4, 5]);
    });

    it('chooses compact non-thumb fingers for adjacent black-key dyads', () => {
      const repeatedDyads: FallingNote[] = [0, 0.5, 1].flatMap(start => [
        { midi: 66, start, duration: 0.5, hand: 'R' as const },
        { midi: 68, start, duration: 0.5, hand: 'R' as const },
      ]);

      expect(addFingeringToNotes(repeatedDyads).map(note => note.finger)).toEqual([2, 3, 2, 3, 2, 3]);
    });

    it('handles the production score opening as a deterministic hand phrase', () => {
      // An identifying-metadata-free excerpt from the 411-note issue #120 JSON:
      // bass hand movement interleaved with repeated RH black-key dyads.
      const excerpt: FallingNote[] = [
        { midi: 40, start: 0, duration: 2, hand: 'L' },
        { midi: 66, start: 0.5, duration: 0.5, hand: 'R' },
        { midi: 68, start: 0.5, duration: 0.5, hand: 'R' },
        { midi: 66, start: 1, duration: 0.5, hand: 'R' },
        { midi: 68, start: 1, duration: 0.5, hand: 'R' },
        { midi: 47, start: 2, duration: 1, hand: 'L' },
        { midi: 56, start: 3, duration: 1, hand: 'L' },
        { midi: 40, start: 4, duration: 2, hand: 'L' },
      ];

      const first = addFingeringToNotes(excerpt);
      expect(first).toEqual(addFingeringToNotes(excerpt));
      expect(first.every(note => note.fingerSource === 'inferred')).toBe(true);
      expect(first.every(note => note.fingeringAlgorithm === FINGERING_ALGORITHM_VERSION)).toBe(true);
      expect(first.filter(note => note.hand === 'R').map(note => note.finger)).toEqual([2, 3, 2, 3]);
      // `phrase-dp-v1` answered [5, 3, 2, 5] here and left the thumb unused across
      // a sixteen-semitone bass span. Under `phrase-dp-v2` the fifth E2->B2 is
      // exactly the natural hand span, so finger 5 and finger 1 imply the same
      // anchor (40) and the hand does not move at all — that is why the thumb
      // wins, and finger 3 does not. The following leap to G#3 is nine semitones,
      // past CROSSING_MAX_INTERVAL, so it is hand travel and not a crossing.
      expect(first.filter(note => note.hand === 'L').map(note => note.finger)).toEqual([5, 1, 2, 5]);
    });

    it('should not apply the CAGED crossing pattern to F-major right hand', () => {
      const midi = [65, 67, 69, 70, 72, 74, 76, 77];
      const notes: FallingNote[] = midi.map((pitch, index) => ({
        midi: pitch,
        start: index * 0.5,
        duration: 0.5,
        hand: 'R',
      }));

      expect(addFingeringToNotes(notes).map(note => note.finger)).not.toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
    });
  });

  // Issue #126 fixed the reproduction table recorded on the issue: outside the
  // ascending CAGED octave the model exhausted 5->1 and then repeated the thumb,
  // because a thumb crossing is by definition a finger move opposite to the pitch
  // direction and the old transition cost charged exactly that a flat penalty.
  describe('addFingeringToNotes hand motion and thumb crossings (issue #126)', () => {
    const run = (midis: number[], hand: Hand, gap = 0.4): (Finger | undefined)[] =>
      addFingeringToNotes(
        midis.map((midi, index) => ({ midi, start: index * gap, duration: gap, hand })),
      ).map(note => note.finger);

    /** Longest run of one finger repeated on consecutive events. */
    const longestSameFingerRun = (fingers: (Finger | undefined)[]): number => {
      let longest = 1;
      let current = 1;
      for (let index = 1; index < fingers.length; index += 1) {
        current = fingers[index] === fingers[index - 1] ? current + 1 : 1;
        longest = Math.max(longest, current);
      }
      return longest;
    };

    /**
     * Transitions where the finger number moves against the pitch direction.
     * A crossing needs both a finger move and a pitch move: without the pitch
     * guard, `Math.sign(0)` makes every finger change on a repeated note count.
     */
    const crossings = (midis: number[], fingers: (Finger | undefined)[]): number =>
      fingers.reduce((count, finger, index) => {
        if (index === 0) return count;
        const fingerDelta = (finger as number) - (fingers[index - 1] as number);
        const pitchDelta = midis[index] - midis[index - 1];
        if (fingerDelta === 0 || pitchDelta === 0) return count;
        return count + (Math.sign(fingerDelta) !== Math.sign(pitchDelta) ? 1 : 0);
      }, 0);

    const C_MAJOR_DESCENDING = [72, 71, 69, 67, 65, 64, 62, 60];
    const C_MAJOR_ASCENDING = [60, 62, 64, 65, 67, 69, 71, 72];

    it('crosses the thumb under instead of repeating it in a descending right-hand octave', () => {
      expect(run(C_MAJOR_DESCENDING, 'R')).toEqual([5, 4, 3, 2, 1, 3, 2, 1]);
    });

    it('crosses the thumb in a descending left-hand octave', () => {
      expect(run([60, 59, 57, 55, 53, 52, 50, 48], 'L')).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
    });

    it('keeps the CAGED octave result without a hardcoded scale pattern', () => {
      expect(run(C_MAJOR_ASCENDING, 'R')).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
      expect(run([36, 38, 40, 41, 43, 45, 47, 48], 'L')).toEqual([5, 4, 3, 2, 1, 3, 2, 1]);
    });

    it('places the F-major crossing so the thumb never lands on a black key', () => {
      const midis = [65, 67, 69, 70, 72, 74, 76, 77];
      const fingers = run(midis, 'R');
      expect(fingers).toEqual([1, 2, 3, 4, 1, 2, 3, 4]);
      midis.forEach((midi, index) => {
        if (isBlackKeyMidi(midi)) expect(fingers[index]).not.toBe(1);
      });
    });

    it('crosses more than once across a two-octave descending run', () => {
      const midis = [76, 74, 72, 71, 69, 67, 65, 64, 62, 60, 59, 57];
      const fingers = run(midis, 'R');
      expect(longestSameFingerRun(fingers)).toBeLessThan(3);
      expect(crossings(midis, fingers)).toBeGreaterThanOrEqual(2);
    });

    it('crosses rather than parking the pinky when an ascending run outlasts the hand', () => {
      const midis = [67, 69, 71, 72, 74, 76, 78, 79, 81];
      const fingers = run(midis, 'R');
      expect(longestSameFingerRun(fingers)).toBeLessThan(3);
      expect(crossings(midis, fingers)).toBeGreaterThanOrEqual(1);
    });

    it('moves the hand instead of stalling on one finger through descending thirds', () => {
      const midis = [72, 69, 65, 64, 60, 57];
      expect(longestSameFingerRun(run(midis, 'R'))).toBeLessThan(3);
    });

    it('reuses one finger across leaps no crossing can bridge', () => {
      // The documented exception to "no finger three times in a row". A crossing
      // only exists inside CROSSING_MAX_INTERVAL, so a descending octave leap has
      // none available: every candidate pays the same lifted-hand cost, and
      // re-using one finger is what a player actually does with a leaping figure.
      expect(run([84, 72, 60, 48], 'R')).toEqual([5, 1, 1, 1]);

      // Where a crossing does exist — stepwise motion — the rule still holds.
      expect(longestSameFingerRun(run([84, 83, 81, 79, 77, 76, 74, 72], 'R'))).toBeLessThan(3);
    });

    it('never repeats a finger three times in a non-CAGED or minor scale', () => {
      // F major and B major are the two keys the old CAGED pattern deliberately
      // excluded; the harmonic minor adds an augmented second the pattern layer
      // could never have matched.
      const scales: [string, number[], Hand][] = [
        ['F major ascending', [65, 67, 69, 70, 72, 74, 76, 77], 'R'],
        ['F major descending', [77, 76, 74, 72, 70, 69, 67, 65], 'R'],
        ['B major ascending', [59, 61, 63, 64, 66, 68, 70, 71], 'L'],
        ['B major descending', [71, 70, 68, 66, 64, 63, 61, 59], 'L'],
        ['A harmonic minor ascending', [69, 71, 72, 74, 76, 77, 80, 81], 'R'],
        ['A harmonic minor descending', [81, 80, 77, 76, 74, 72, 71, 69], 'R'],
      ];

      const offenders = scales
        .map(([name, midis, hand]) => `${name}: ${longestSameFingerRun(run(midis, hand))}`)
        .filter(entry => Number(entry.split(': ')[1]) >= 3);

      expect(offenders).toEqual([]);
    });

    it('alternates fingers on repeated notes only when they are fast', () => {
      // Two groupings tie on cost here (`3 2 1 3 2 1 3 2` and `3 2 1 3 2 1 2 1`),
      // so assert the shape a repeated-note group has rather than the tie-break:
      // no finger takes two strikes in a row, only the agile fingers take part,
      // and each group walks inward one finger at a time before resetting.
      const fast = run([64, 64, 64, 64, 64, 64, 64, 64], 'R', 0.1);
      expect(longestSameFingerRun(fast)).toBe(1);
      expect(fast.filter(finger => (finger as number) > 3)).toEqual([]);
      fast.forEach((finger, index) => {
        if (index === 0) return;
        const step = (finger as number) - (fast[index - 1] as number);
        expect(step === -1 || step > 0).toBe(true);
      });

      // A comfortable repeat stays planted: re-placing the hand is the cost, and
      // at half a second there is time to do nothing at all.
      const slow = run([64, 64, 64, 64], 'R', 0.5);
      expect(new Set(slow).size).toBe(1);
    });

    it('does not treat two different chords with the same centre as a repeated note', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 0.4, hand: 'R' },
        { midi: 68, start: 0, duration: 0.4, hand: 'R' },
        { midi: 62, start: 0.4, duration: 0.4, hand: 'R' },
        { midi: 66, start: 0.4, duration: 0.4, hand: 'R' },
      ];

      // Pinned rather than asserted by property on purpose. Both dyads centre on
      // 64, so a centre-comparing implementation routes them through the repeat
      // path instead of the anchor path — and it still produces ascending fingers
      // and a narrower second span, so the obvious property assertions pass under
      // the defect they are meant to catch. The exact result does not.
      expect(addFingeringToNotes(notes).map(note => note.finger)).toEqual([1, 4, 1, 3]);
    });

    it('keeps the thumb and the pinky off black keys', () => {
      const midis = [73, 71, 69, 68, 66];
      const fingers = run(midis, 'R');
      midis.forEach((midi, index) => {
        if (!isBlackKeyMidi(midi)) return;
        expect(fingers[index]).not.toBe(1);
        expect(fingers[index]).not.toBe(5);
      });
    });

    it('still never overwrites a finger the score supplied', () => {
      const notes: FallingNote[] = C_MAJOR_DESCENDING.map((midi, index) => ({
        midi,
        start: index * 0.4,
        duration: 0.4,
        hand: 'R' as const,
        ...(index % 3 === 0 ? { finger: 2 as Finger } : {}),
      }));

      const enhanced = addFingeringToNotes(notes);
      enhanced.forEach((note, index) => {
        if (index % 3 !== 0) return;
        expect(note.finger).toBe(2);
        expect(note.fingerSource).toBe('source');
      });
    });

    it('will not hand a chord to a finger pair that cannot span it', () => {
      // Reach is a hard constraint on candidate generation, not a cost. Before
      // issue #130 stage 2 the corpus's bar 7 octave E4 + E5 came out as 4 and 5,
      // because a run of cheap transitions could buy an impossible chord.
      const octave: FallingNote[] = [
        { midi: 64, start: 0, duration: 1, hand: 'R' },
        { midi: 76, start: 0, duration: 1, hand: 'R' },
      ];

      const fingers = addFingeringToNotes(octave).map(note => note.finger) as Finger[];
      expect(chordIsReachable([64, 76], fingers)).toBe(true);
      expect(fingers).toEqual([1, 5]);
    });

    it('keeps a chord no hand can hold rather than inventing a reachable one', () => {
      // A two-octave span in one hand is beyond every finger pair. There is no
      // right answer, so the score's own shape survives instead of being quietly
      // narrowed into something it did not ask for.
      const impossible: FallingNote[] = [
        { midi: 48, start: 0, duration: 1, hand: 'L' },
        { midi: 72, start: 0, duration: 1, hand: 'L' },
      ];

      const fingers = addFingeringToNotes(impossible).map(note => note.finger) as Finger[];
      expect(fingers).toHaveLength(2);
      fingers.forEach(finger => expect([1, 2, 3, 4, 5]).toContain(finger));
      expect(chordIsReachable([48, 72], fingers)).toBe(false);
    });

    it('still preserves a source fingering the hand cannot actually hold', () => {
      // Source annotations are truth even when they are not physically monotonic
      // (D-039 decision 4). Reach must not become a reason to overwrite one.
      const annotated: FallingNote[] = [
        { midi: 64, start: 0, duration: 1, hand: 'R', finger: 4 },
        { midi: 76, start: 0, duration: 1, hand: 'R', finger: 5 },
      ];

      expect(addFingeringToNotes(annotated).map(note => note.finger)).toEqual([4, 5]);
      expect(addFingeringToNotes(annotated).every(note => note.fingerSource === 'source')).toBe(true);
    });

    it('returns the same fingering on repeated runs of the same input', () => {
      const notes: FallingNote[] = C_MAJOR_DESCENDING.map((midi, index) => ({
        midi,
        start: index * 0.4,
        duration: 0.4,
        hand: 'R' as const,
      }));

      expect(addFingeringToNotes(notes)).toEqual(addFingeringToNotes(notes));
    });
  });

  describe('generateSampleNotesWithFingering', () => {
    it('should generate notes with fingering information', () => {
      const notes = generateSampleNotesWithFingering();
      
      expect(notes.length).toBeGreaterThan(0);
      notes.forEach(note => {
        expect(note.midi).toBeDefined();
        expect(note.start).toBeDefined();
        expect(note.duration).toBeDefined();
        expect(note.hand).toBeDefined();
        expect(note.finger).toBeDefined();
        expect(['L', 'R']).toContain(note.hand!);
        expect(note.finger).toBeGreaterThanOrEqual(1);
        expect(note.finger).toBeLessThanOrEqual(5);
      });
    });

    it('should include both left and right hand notes', () => {
      const notes = generateSampleNotesWithFingering();
      
      const leftHandNotes = notes.filter(note => note.hand === 'L');
      const rightHandNotes = notes.filter(note => note.hand === 'R');
      
      expect(leftHandNotes.length).toBeGreaterThan(0);
      expect(rightHandNotes.length).toBeGreaterThan(0);
    });
  });
});
