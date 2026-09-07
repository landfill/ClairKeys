/**
 * Tests for visual utilities with finger enhancements
 */

import { 
  getHandColor, 
  getFingerBadgePosition, 
  shouldShowFingerBadge,
  notesToVisualNotes,
  calculateSongLength,
  getActiveNotes,
  getVisibleNotes
} from '../visualUtils';
import { buildKeyLayout } from '../pianoLayout';
import { HAND_COLORS } from '@/types/fallingNotes';
import type { FallingNote, VisualNote, KeyLayout } from '@/types/fallingNotes';

// Mock keyboard layout for testing
const mockLayout: KeyLayout = {
  byMidi: new Map([
    [60, { x: 100, w: 20, black: false }], // C4
    [61, { x: 110, w: 12, black: true }],  // C#4
    [62, { x: 120, w: 20, black: false }], // D4
    [64, { x: 140, w: 20, black: false }], // E4
    [67, { x: 170, w: 20, black: false }]  // G4
  ]),
  totalWidth: 200,
  keyWidth: 20,
};

describe('visualUtils with fingering', () => {
  describe('getHandColor', () => {
    it('should return correct colors for hands', () => {
      expect(getHandColor('L')).toBe(HAND_COLORS.L);
      expect(getHandColor('R')).toBe(HAND_COLORS.R);
      expect(getHandColor()).toBe(HAND_COLORS.DEFAULT);
      expect(getHandColor(undefined)).toBe(HAND_COLORS.DEFAULT);
    });
  });

  describe('getFingerBadgePosition', () => {
    it('should calculate centered position within note', () => {
      const note: VisualNote = {
        x: 100,
        y: 50,
        w: 20,
        h: 30,
        color: '#ff0000',
        z: 10,
        finger: 1,
        hand: 'R'
      };

      const position = getFingerBadgePosition(note);
      
      expect(position.x).toBeGreaterThanOrEqual(100);
      expect(position.x).toBeLessThanOrEqual(120);
      expect(position.y).toBeGreaterThanOrEqual(50);
      expect(position.y).toBeLessThanOrEqual(80);
      expect(position.size).toBeGreaterThanOrEqual(12);
      expect(position.size).toBeLessThanOrEqual(16);
    });

    it('should handle small notes appropriately', () => {
      const smallNote: VisualNote = {
        x: 0,
        y: 0,
        w: 8,
        h: 8,
        color: '#ff0000',
        z: 10,
        finger: 2,
        hand: 'L'
      };

      const position = getFingerBadgePosition(smallNote);
      expect(position.size).toBeLessThanOrEqual(smallNote.h);
    });

    it('should handle large notes appropriately', () => {
      const largeNote: VisualNote = {
        x: 0,
        y: 0,
        w: 40,
        h: 60,
        color: '#ff0000',
        z: 10,
        finger: 3,
        hand: 'R'
      };

      const position = getFingerBadgePosition(largeNote);
      expect(position.size).toBe(20); // Maximum size
    });
  });

  describe('shouldShowFingerBadge', () => {
    it('should show badge for notes with finger and adequate size', () => {
      const note: VisualNote = {
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#ff0000',
        z: 10,
        finger: 1,
        hand: 'R'
      };

      expect(shouldShowFingerBadge(note)).toBe(true);
    });

    it('should not show badge for notes without finger', () => {
      const note: VisualNote = {
        x: 0,
        y: 0,
        w: 20,
        h: 20,
        color: '#ff0000',
        z: 10,
        hand: 'R'
      };

      expect(shouldShowFingerBadge(note)).toBe(false);
    });

    it('should omit labels that cannot fit at readable size', () => {
      const note: VisualNote = {
        x: 0,
        y: 0,
        w: 8,
        h: 8,
        color: '#ff0000',
        z: 10,
        finger: 1,
        hand: 'R'
      };

      expect(shouldShowFingerBadge(note)).toBe(false);
    });
  });

  describe('notesToVisualNotes with fingering', () => {
    it('should preserve finger and hand information', () => {
      const notes: FallingNote[] = [
        { 
          midi: 60, 
          start: 0, 
          duration: 1, 
          hand: 'R', 
          finger: 1 
        }
      ];

      const visualNotes = notesToVisualNotes(notes, 0, 100, 400, mockLayout);
      
      expect(visualNotes).toHaveLength(1);
      expect(visualNotes[0].finger).toBe(1);
      expect(visualNotes[0].hand).toBe('R');
      expect(visualNotes[0].color).toBe(HAND_COLORS.R);
    });

    it('should handle notes without fingering', () => {
      const notes: FallingNote[] = [
        { 
          midi: 60, 
          start: 0, 
          duration: 1 
        }
      ];

      const visualNotes = notesToVisualNotes(notes, 0, 100, 400, mockLayout);
      
      expect(visualNotes).toHaveLength(1);
      expect(visualNotes[0].finger).toBeUndefined();
      expect(visualNotes[0].hand).toBeUndefined();
      expect(visualNotes[0].color).toBe(HAND_COLORS.DEFAULT);
    });

    it('should use different colors for left and right hands', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 1, hand: 'L', finger: 5 },
        { midi: 67, start: 0, duration: 1, hand: 'R', finger: 1 }
      ];

      const visualNotes = notesToVisualNotes(notes, 0, 100, 400, mockLayout);
      
      expect(visualNotes).toHaveLength(2);
      expect(visualNotes[0].color).toBe(HAND_COLORS.L);
      expect(visualNotes[1].color).toBe(HAND_COLORS.R);
    });
  });

  describe('calculateSongLength', () => {
    it('should calculate correct song length', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 2, hand: 'R', finger: 1 },
        { midi: 64, start: 1, duration: 3, hand: 'R', finger: 3 },
        { midi: 67, start: 3, duration: 1, hand: 'R', finger: 5 }
      ];

      expect(calculateSongLength(notes)).toBe(4); // start 1 + duration 3 = 4
    });
  });

  describe('getActiveNotes', () => {
    it('should return notes playing at current time', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 2, hand: 'R', finger: 1 },
        { midi: 64, start: 1, duration: 1, hand: 'R', finger: 3 },
        { midi: 67, start: 3, duration: 1, hand: 'R', finger: 5 }
      ];

      const activeAt1_5 = getActiveNotes(notes, 1.5);
      expect(activeAt1_5).toHaveLength(2); // First two notes are active
      expect(activeAt1_5[0].midi).toBe(60);
      expect(activeAt1_5[1].midi).toBe(64);
    });
  });

  describe('getVisibleNotes', () => {
    it('should return notes in visible time range', () => {
      const notes: FallingNote[] = [
        { midi: 60, start: 0, duration: 1, hand: 'R', finger: 1 },
        { midi: 64, start: 2, duration: 1, hand: 'R', finger: 3 },
        { midi: 67, start: 5, duration: 1, hand: 'R', finger: 5 }
      ];

      const visible = getVisibleNotes(notes, 1, 3); // Current time 1, look ahead 3 seconds
      expect(visible).toHaveLength(2); // First two notes should be visible
      expect(visible[0].midi).toBe(60);
      expect(visible[1].midi).toBe(64);
    });
  });
});


describe('issue 124 badge containment', () => {
  it.each([
    { keyWidth: 10.8, visible: [false, false] },
    { keyWidth: 11, visible: [true, false] },
    { keyWidth: 23, visible: [true, true] },
    { keyWidth: 24, visible: [true, true] },
    { keyWidth: 24.46, visible: [true, true] },
    { keyWidth: 36, visible: [true, true] },
  ])('contains white and black badges at $keyWidth px key width', ({ keyWidth, visible }) => {
    const layout = buildKeyLayout(keyWidth, { minMidi: 60, maxMidi: 64 });
    for (const duration of [0.01, 0.1, 1]) {
      const notes = notesToVisualNotes([
        { midi: 60, start: 1, duration, finger: 1, hand: 'R' },
        { midi: 61, start: 1, duration, finger: 2, hand: 'R' },
      ], 0, 140, 350, layout);
      for (const [index, note] of notes.entries()) {
        const badge = getFingerBadgePosition(note);
        expect(badge.x).toBeGreaterThanOrEqual(note.x);
        expect(badge.y).toBeGreaterThanOrEqual(note.y);
        expect(badge.x + badge.width).toBeLessThanOrEqual(note.x + note.w + 1e-9);
        expect(badge.y + badge.size).toBeLessThanOrEqual(note.y + note.h + 1e-9);
        // Explicit per-lane cases straddle the transformed white/black width thresholds.
        expect(shouldShowFingerBadge(note)).toBe(visible[index] && duration >= 0.1);
        if (shouldShowFingerBadge(note)) {
          expect(Number.isInteger(badge.fontSize)).toBe(true);
          expect(badge.fontSize).toBeGreaterThanOrEqual(12);
          expect(badge.fontSize).toBeLessThanOrEqual(badge.size);
        }
        expect(note.finger).toBeDefined();
      }
    }
  });

  it.each([[9.99, 14, false], [10, 13.99, false], [10, 14, true]])(
    'uses explicit width %s and height %s readability limits', (w, h, visible) => {
      expect(shouldShowFingerBadge({x: 0, y: 0, w: w as number, h: h as number,
        color: '#fff', z: 20, finger: 1})).toBe(visible);
    });
});
