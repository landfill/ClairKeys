import type { FallingNote, VisualNote, KeyLayout, Hand } from '@/types/fallingNotes';
import { HAND_COLORS } from '@/types/fallingNotes';

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
    const color = getHandColor(note.hand);
    const zIndex = keyPos.black ? 30 : 20; // Black key notes on top
    
    visualNotes.push({
      x,
      y,
      h: Math.max(3, noteHeight), // Minimum height for visibility
      w: width,
      color,
      z: zIndex,
      finger: note.finger,
      hand: note.hand
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
 * Get color for a given hand assignment
 */
export function getHandColor(hand?: Hand): string {
  if (hand === "L") return HAND_COLORS.L;
  if (hand === "R") return HAND_COLORS.R;
  return HAND_COLORS.DEFAULT;
}

/**
 * Calculate optimal finger badge position within a note
 */
export function getFingerBadgePosition(note: VisualNote): { x: number; y: number; size: number } {
  const badgeSize = Math.min(20, Math.max(14, note.w * 0.7)); // Increased size for better visibility
  const x = note.x + (note.w - badgeSize) / 2; // Center horizontally
  const y = note.y + note.h - badgeSize - 4; // Near bottom of note with padding
  
  return { x, y, size: badgeSize };
}

/**
 * Check if a finger badge should be displayed based on note size
 */
export function shouldShowFingerBadge(note: VisualNote): boolean {
  return note.w >= 12 && note.h >= 12 && note.finger !== undefined;
}

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