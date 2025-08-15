/**
 * Tests for fingering utilities
 */

import { 
  assignHand, 
  assignFinger, 
  isBlackKeyMidi, 
  addFingeringToNotes,
  generateSampleNotesWithFingering 
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

    it('should handle scale positions correctly', () => {
      const finger = assignFinger(60, 'R', { scalePosition: 0 });
      expect(finger).toBeGreaterThanOrEqual(1);
      expect(finger).toBeLessThanOrEqual(5);
    });

    it('should handle chord positions correctly', () => {
      const finger = assignFinger(60, 'R', { chordPosition: 0 });
      expect(finger).toBeGreaterThanOrEqual(1);
      expect(finger).toBeLessThanOrEqual(5);
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