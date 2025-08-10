import type { KeyLayout, KeyPosition } from '@/types/fallingNotes';

/**
 * Piano Layout Utilities
 * Handles calculation of piano key positions and layout for 88-key piano
 */

// Piano constants
export const A0_MIDI = 21;
export const C8_MIDI = 108;
export const TOTAL_KEYS = C8_MIDI - A0_MIDI + 1; // 88 keys

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
export function buildKeyLayout(keyWidth: number): KeyLayout {
  const keys: Array<{ midi: number; black: boolean; x: number; w: number }> = [];
  let whiteIndex = 0;
  
  // First pass: position white keys
  for (let midi = A0_MIDI; midi <= C8_MIDI; midi++) {
    const black = isBlack(midi);
    
    if (!black) {
      const x = whiteIndex * keyWidth;
      keys.push({ midi, black: false, x, w: keyWidth });
      whiteIndex++;
    }
  }
  
  // Second pass: position black keys
  for (let midi = A0_MIDI; midi <= C8_MIDI; midi++) {
    const black = isBlack(midi);
    
    if (black) {
      const pitchClass = midi % 12 as 1 | 3 | 6 | 8 | 10;
      
      // Find the white key to the left
      const leftWhiteKeys = keys.filter(k => !k.black && k.midi < midi);
      const leftWhiteIndex = leftWhiteKeys.length - 1;
      const baseX = Math.max(0, leftWhiteIndex) * keyWidth;
      
      // Black key offset patterns within each octave
      const offsets: Record<number, number> = {
        1: 0.65,  // C#
        3: 1.6,   // D#
        6: 3.65,  // F#
        8: 4.6,   // G#
        10: 5.6   // A#
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