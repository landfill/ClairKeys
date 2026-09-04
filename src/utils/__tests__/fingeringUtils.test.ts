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
import type { FallingNote } from '@/types/fallingNotes';

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
      expect(first.filter(note => note.hand === 'L').map(note => note.finger)).toEqual([5, 3, 2, 5]);
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
