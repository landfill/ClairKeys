import type { FallingNote, KeyLayout, KeyPosition } from '@/types/fallingNotes';

/**
 * Piano Layout Utilities
 * Handles calculation of piano key positions and layout for 88-key piano
 */

// Piano constants
export const A0_MIDI = 21;
export const C8_MIDI = 108;
export const TOTAL_KEYS = C8_MIDI - A0_MIDI + 1; // 88 keys
export const MAX_PLAYBACK_KEY_WIDTH = 24;

export type KeyboardRange = {
  minMidi: number;
  maxMidi: number;
};

// White key pitch classes (C, D, E, F, G, A, B)
const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);

/**
 * Check if a MIDI note corresponds to a black key
 */
export function isBlack(midi: number): boolean {
  return !WHITE_PCS.has(midi % 12);
}

/**
 * Convert MIDI note number to frequency in Hz
 */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Build complete piano keyboard layout
 * Returns positions for all 88 keys from A0 to C8
 */
export function buildKeyLayout(
  keyWidth: number,
  range: KeyboardRange = { minMidi: A0_MIDI, maxMidi: C8_MIDI }
): KeyLayout {
  const keys: Array<{ midi: number; black: boolean; x: number; w: number }> = [];
  let whiteIndex = 0;
  
  // First pass: position white keys
  for (let midi = range.minMidi; midi <= range.maxMidi; midi++) {
    const black = isBlack(midi);
    
    if (!black) {
      const x = whiteIndex * keyWidth;
      keys.push({ midi, black: false, x, w: keyWidth });
      whiteIndex++;
    }
  }
  
  // Second pass: position black keys
  for (let midi = range.minMidi; midi <= range.maxMidi; midi++) {
    const black = isBlack(midi);
    
    if (black) {
      const pitchClass = midi % 12 as 1 | 3 | 6 | 8 | 10;
      
      // Find the white key to the left
      const leftWhiteKeys = keys.filter(k => !k.black && k.midi < midi);
      const leftWhiteIndex = leftWhiteKeys.length - 1;
      const baseX = Math.max(0, leftWhiteIndex) * keyWidth;
      
      // Black key offsets relative to the white key on the left
      const offsets: Record<number, number> = {
        1: 0.65,  // C#
        3: 0.6,   // D#
        6: 0.65,  // F#
        8: 0.6,   // G#
        10: 0.6   // A#
      };
      
      const x = baseX + (offsets[pitchClass] ?? 0.5) * keyWidth;
      keys.push({ midi, black: true, x, w: keyWidth * 0.6 });
    }
  }
  
  // Calculate total width and create lookup map
  const whiteCount = keys.filter(k => !k.black).length; // Should be 52
  const totalWidth = whiteCount * keyWidth;
  
  const byMidi = new Map<number, KeyPosition>();
  for (const key of keys) {
    byMidi.set(key.midi, {
      x: key.x,
      w: key.w,
      black: key.black
    });
  }
  
  return { byMidi, totalWidth };
}

/**
 * Select the smallest keyboard range that contains a score, expanding only as
 * far as necessary to put each edge on a white key. Keeping the calculation
 * score-scoped makes a note's x position stable for the entire playback.
 */
export function snapRangeToWhiteKeys(notes: FallingNote[]): KeyboardRange {
  if (notes.length === 0) {
    return { minMidi: A0_MIDI, maxMidi: C8_MIDI };
  }

  let minMidi = Math.max(A0_MIDI, Math.min(...notes.map(note => note.midi)));
  let maxMidi = Math.min(C8_MIDI, Math.max(...notes.map(note => note.midi)));

  while (isBlack(minMidi) && minMidi > A0_MIDI) minMidi--;
  while (isBlack(maxMidi) && maxMidi < C8_MIDI) maxMidi++;

  return { minMidi, maxMidi };
}

/**
 * Build the score-scoped playback keyboard from its measured content width.
 * The 24px ceiling keeps narrow scores visually consistent with the established
 * desktop keyboard; any unused width becomes symmetric margin rather than
 * oversized keys.
 */
export function buildResponsiveKeyLayout(
  availableWidth: number,
  notes: FallingNote[]
): KeyLayout {
  const range = snapRangeToWhiteKeys(notes);
  const whiteKeyCount = Array.from(
    { length: range.maxMidi - range.minMidi + 1 },
    (_, index) => range.minMidi + index
  ).filter(midi => !isBlack(midi)).length;
  const safeWidth = Math.max(0, availableWidth);
  const keyWidth = Math.min(
    MAX_PLAYBACK_KEY_WIDTH,
    whiteKeyCount > 0 ? safeWidth / whiteKeyCount : MAX_PLAYBACK_KEY_WIDTH
  );
  const layout = buildKeyLayout(keyWidth, range);
  const horizontalInset = (safeWidth - layout.totalWidth) / 2;
  const byMidi = new Map<number, KeyPosition>();

  for (const [midi, position] of layout.byMidi) {
    byMidi.set(midi, { ...position, x: position.x + horizontalInset });
  }

  return { byMidi, totalWidth: safeWidth };
}
