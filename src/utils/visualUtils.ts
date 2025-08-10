import type { FallingNote, VisualNote, KeyLayout } from '@/types/fallingNotes';

/**
 * Visual Utilities
 * Handles conversion of musical data to visual representations
 */

/**
 * Convert notes to visual representations with precise timing synchronization
 */
export function notesToVisualNotes(
  notes: FallingNote[],
  nowSec: number,
  pxPerSec: number,
  height: number,
  layout: KeyLayout
): VisualNote[] {
  const visualNotes: VisualNote[] = [];
  
  // Pre-calculate timing values for performance
  const currentTime = nowSec;
  const visibleTimeStart = currentTime - 1; // 1 second buffer for smooth animation
  const visibleTimeEnd = currentTime + (height / pxPerSec) + 1; // Look ahead based on height
  
  for (const note of notes) {
    // Skip notes outside visible time range for performance
    const noteEnd = note.start + note.duration;
    if (noteEnd < visibleTimeStart || note.start > visibleTimeEnd) continue;
    
    // Calculate note height based on duration with minimum visibility
    const noteHeight = Math.max(3, note.duration * pxPerSec);
    
    // Calculate precise position: bottom of note hits the hit line at exact timing
    // Hit line is at the bottom of the falling area (y = height)
    const timeToHit = note.start - currentTime;
    const bottom = height - timeToHit * pxPerSec;
    const y = bottom - noteHeight;
    
    // Enhanced off-screen culling with buffer
    const cullBuffer = 100; // pixels
    if (bottom < -cullBuffer || y > height + cullBuffer) continue;
    
    // Get key position for this MIDI note
    const keyPos = layout.byMidi.get(note.midi);
    if (!keyPos) continue; // Skip invalid MIDI numbers
    
    // Calculate visual properties
    const x = keyPos.x + (keyPos.black ? keyPos.w * 0.2 : 0);
    const width = keyPos.black ? keyPos.w * 0.75 : keyPos.w * 0.92;
    const color = note.hand === "L" ? "#3b82f6" : "#ef4444"; // Blue for left, red for right
    const zIndex = keyPos.black ? 30 : 20; // Black key notes on top
    
    visualNotes.push({
      x,
      y,
      h: Math.max(3, noteHeight), // Minimum height for visibility
      w: width,
      color,
      z: zIndex
    });
  }
  
  return visualNotes;
}

/**
 * Calculate the total duration of a song
 */
export function calculateSongLength(notes: FallingNote[]): number {
  return notes.reduce((max, note) => Math.max(max, note.start + note.duration), 0);
}

/**
 * Filter notes that are currently active (playing) at a given time
 */
export function getActiveNotes(notes: FallingNote[], currentTime: number): FallingNote[] {
  return notes.filter(note => 
    note.start <= currentTime && 
    currentTime <= note.start + note.duration
  );
}

/**
 * Get notes that should be visible in the falling animation
 */
export function getVisibleNotes(
  notes: FallingNote[], 
  currentTime: number, 
  lookAheadSec: number
): FallingNote[] {
  const startTime = currentTime;
  const endTime = currentTime + lookAheadSec;
  
  return notes.filter(note => {
    const noteEnd = note.start + note.duration;
    // Note is visible if it overlaps with the visible time range
    return note.start <= endTime && noteEnd >= startTime;
  });
}

/**
 * Color constants for hand visualization
 */
export const HAND_COLORS = {
  L: "#3b82f6", // Blue for left hand
  R: "#ef4444", // Red for right hand
  DEFAULT: "#6b7280" // Gray for unassigned
} as const;

/**
 * Z-index constants for layering
 */
export const Z_INDICES = {
  WHITE_KEY: 10,
  BLACK_KEY: 40,
  WHITE_KEY_NOTE: 20,
  BLACK_KEY_NOTE: 30,
  HIT_LINE: 50
} as const;

/**
 * Check if playback should auto-stop based on current position and song length
 */
export function shouldAutoStop(
  currentTime: number, 
  songLength: number, 
  bufferSec: number = 2
): boolean {
  return currentTime > songLength + bufferSec;
}

/**
 * Calculate playback progress as a percentage
 */
export function getPlaybackProgress(
  currentTime: number, 
  songLength: number
): number {
  if (songLength <= 0) return 0;
  return Math.min(100, Math.max(0, (currentTime / songLength) * 100));
}

/**
 * Get synchronization metrics for debugging
 */
export function getSyncMetrics(
  visualTime: number,
  audioTime: number,
  tempoScale: number
): {
  drift: number;
  driftMs: number;
  isInSync: boolean;
  tempoScale: number;
} {
  const drift = Math.abs(visualTime - audioTime);
  const driftMs = drift * 1000;
  const isInSync = drift < 0.05; // 50ms tolerance
  
  return {
    drift,
    driftMs,
    isInSync,
    tempoScale
  };
}