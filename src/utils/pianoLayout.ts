import type { FallingNote, KeyLayout, KeyPosition } from '@/types/fallingNotes';

/**
 * Piano Layout Utilities
 * Handles calculation of piano key positions and layout for 88-key piano
 */

// Piano constants
export const A0_MIDI = 21;
export const C8_MIDI = 108;
export const TOTAL_KEYS = C8_MIDI - A0_MIDI + 1; // 88 keys
/**
 * The density a playback keyboard aims for. It is a floor to grow from, not a
 * ceiling to stop at: leftover width buys neighbouring keys at this width
 * before it buys wider ones. A narrower viewport still goes below it, because
 * the score's own range is never given up to keep it.
 */
export const BASE_PLAYBACK_KEY_WIDTH = 24;

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

export function countWhiteKeys(range: KeyboardRange): number {
  let count = 0;
  for (let midi = range.minMidi; midi <= range.maxMidi; midi++) {
    if (!isBlack(midi)) count++;
  }
  return count;
}

function nextWhiteKeyBelow(midi: number): number | null {
  for (let candidate = midi - 1; candidate >= A0_MIDI; candidate--) {
    if (!isBlack(candidate)) return candidate;
  }
  return null;
}

function nextWhiteKeyAbove(midi: number): number | null {
  for (let candidate = midi + 1; candidate <= C8_MIDI; candidate++) {
    if (!isBlack(candidate)) return candidate;
  }
  return null;
}

/**
 * Spend leftover width on neighbouring keys rather than on margin.
 *
 * The score's own range is the floor and is never touched, so no note can land
 * on a different key — the added keys lie outside the score entirely. Growth
 * stops as soon as one more key would push every key below the base width,
 * which is what keeps a narrow viewport behaving exactly as it did before.
 *
 * This is not the C-octave snapping D-017 rejected. That added up to eleven
 * semitones regardless of the measured width, which collapsed distinct scores
 * onto one window; this adds only what the width would otherwise waste, so two
 * scores on the same screen still differ and one score adapts per viewport.
 */
export function fillRangeToWidth(
  range: KeyboardRange,
  availableWidth: number,
  baseKeyWidth: number = BASE_PLAYBACK_KEY_WIDTH
): KeyboardRange {
  const affordableKeys = Math.floor(Math.max(0, availableWidth) / baseKeyWidth);
  let filled = { ...range };
  let count = countWhiteKeys(filled);
  // Alternating keeps the score near the middle instead of pinned to one edge.
  let extendLow = true;

  while (count < affordableKeys) {
    const low = nextWhiteKeyBelow(filled.minMidi);
    const high = nextWhiteKeyAbove(filled.maxMidi);
    if (low === null && high === null) break;

    const goLow = low !== null && (extendLow || high === null);
    if (goLow) {
      filled = { ...filled, minMidi: low };
    } else if (high !== null) {
      filled = { ...filled, maxMidi: high };
    }

    extendLow = !extendLow;
    count++;
  }

  return filled;
}

/**
 * Build the playback keyboard from its measured content width. The score sets
 * the range that must be there; the width decides how much more is worth
 * showing beside it. Playback time is not an input, so a note's x is fixed for
 * the whole performance.
 */
export function buildResponsiveKeyLayout(
  availableWidth: number,
  notes: FallingNote[]
): KeyLayout {
  const safeWidth = Math.max(0, availableWidth);
  const range = fillRangeToWidth(snapRangeToWhiteKeys(notes), safeWidth);
  const whiteKeyCount = countWhiteKeys(range);
  const keyWidth = whiteKeyCount > 0
    ? safeWidth / whiteKeyCount
    : BASE_PLAYBACK_KEY_WIDTH;
  const layout = buildKeyLayout(keyWidth, range);
  const horizontalInset = (safeWidth - layout.totalWidth) / 2;
  const byMidi = new Map<number, KeyPosition>();

  for (const [midi, position] of layout.byMidi) {
    byMidi.set(midi, { ...position, x: position.x + horizontalInset });
  }

  return { byMidi, totalWidth: safeWidth };
}
