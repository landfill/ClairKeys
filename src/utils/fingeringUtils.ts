/**
 * Piano Fingering Utilities
 * Assigns realistic hand and finger numbers based on music theory
 */

import type { FallingNote, Hand, Finger } from '@/types/fallingNotes';

/**
 * MIDI note ranges for hand assignment
 */
const HAND_RANGES = {
  LEFT_HAND_MAX: 60, // Middle C (C4) - notes below this typically left hand
  RIGHT_HAND_MIN: 60, // Middle C (C4) - notes above this typically right hand
  CROSSOVER_ZONE_START: 57, // A3
  CROSSOVER_ZONE_END: 67, // G4
} as const;

/**
 * Finger assignment patterns for different hand positions
 */
const FINGER_PATTERNS = {
  LEFT_HAND: {
    // Common left hand fingering patterns (bass clef)
    LOW_RANGE: [5, 4, 3, 2, 1], // Lower notes: pinky to thumb
    MID_RANGE: [4, 3, 2, 1, 2], // Middle range: more thumb usage
    HIGH_RANGE: [3, 2, 1, 2, 3], // Higher notes in left hand
  },
  RIGHT_HAND: {
    // Common right hand fingering patterns (treble clef)
    LOW_RANGE: [1, 2, 3, 4, 5], // Lower notes: thumb to pinky
    MID_RANGE: [1, 2, 3, 1, 2], // Middle range: frequent thumb usage
    HIGH_RANGE: [2, 3, 4, 5, 4], // Higher notes: avoid thumb on black keys
  },
} as const;

/**
 * Assign hand based on MIDI note number and musical context
 */
export function assignHand(midi: number, context?: { prevHand?: Hand; chordNotes?: number[] }): Hand {
  // Simple range-based assignment
  if (midi < HAND_RANGES.CROSSOVER_ZONE_START) return "L";
  if (midi > HAND_RANGES.CROSSOVER_ZONE_END) return "R";
  
  // In crossover zone, consider context
  if (context?.prevHand) {
    // Prefer to maintain the same hand for smooth playing
    const distanceFromMiddleC = Math.abs(midi - 60);
    if (distanceFromMiddleC <= 3) {
      return context.prevHand;
    }
  }
  
  // Default assignment based on middle C
  return midi <= 60 ? "L" : "R";
}

/**
 * Assign finger based on hand, MIDI note, and musical context
 */
export function assignFinger(
  midi: number, 
  hand: Hand, 
  context?: { 
    prevFinger?: Finger; 
    isBlackKey?: boolean; 
    chordPosition?: number;
    scalePosition?: number;
  }
): Finger {
  const isBlackKey = context?.isBlackKey ?? isBlackKeyMidi(midi);
  
  if (hand === "L") {
    return assignLeftHandFinger(midi, isBlackKey, context);
  } else {
    return assignRightHandFinger(midi, isBlackKey, context);
  }
}

/**
 * Assign finger for left hand
 */
function assignLeftHandFinger(
  midi: number, 
  isBlackKey: boolean, 
  context?: { prevFinger?: Finger; chordPosition?: number; scalePosition?: number }
): Finger {
  // Avoid thumb (1) on black keys
  if (isBlackKey) {
    return [2, 3, 4][Math.floor(Math.random() * 3)] as Finger;
  }
  
  // Scale-based fingering
  if (context?.scalePosition !== undefined) {
    const scaleFingers = [5, 4, 3, 2, 1, 3, 2, 1]; // C major scale left hand
    return scaleFingers[context.scalePosition % scaleFingers.length] as Finger;
  }
  
  // Chord-based fingering
  if (context?.chordPosition !== undefined) {
    const chordFingers = [5, 3, 1]; // Common triad fingering
    return chordFingers[context.chordPosition % chordFingers.length] as Finger;
  }
  
  // Default pattern based on range
  if (midi < 36) return 5; // Very low notes - pinky
  if (midi < 48) return [4, 5][Math.floor(Math.random() * 2)] as Finger; // Low notes
  if (midi < 55) return [2, 3, 4][Math.floor(Math.random() * 3)] as Finger; // Mid-low
  return [1, 2, 3][Math.floor(Math.random() * 3)] as Finger; // Upper range
}

/**
 * Assign finger for right hand
 */
function assignRightHandFinger(
  midi: number, 
  isBlackKey: boolean, 
  context?: { prevFinger?: Finger; chordPosition?: number; scalePosition?: number }
): Finger {
  // Avoid thumb (1) on black keys
  if (isBlackKey) {
    return [2, 3, 4][Math.floor(Math.random() * 3)] as Finger;
  }
  
  // Scale-based fingering
  if (context?.scalePosition !== undefined) {
    const scaleFingers = [1, 2, 3, 1, 2, 3, 4, 5]; // C major scale right hand
    return scaleFingers[context.scalePosition % scaleFingers.length] as Finger;
  }
  
  // Chord-based fingering
  if (context?.chordPosition !== undefined) {
    const chordFingers = [1, 3, 5]; // Common triad fingering
    return chordFingers[context.chordPosition % chordFingers.length] as Finger;
  }
  
  // Default pattern based on range
  if (midi > 84) return 5; // Very high notes - pinky
  if (midi > 76) return [4, 5][Math.floor(Math.random() * 2)] as Finger; // High notes
  if (midi > 67) return [2, 3, 4][Math.floor(Math.random() * 3)] as Finger; // Mid-high
  return [1, 2, 3][Math.floor(Math.random() * 3)] as Finger; // Lower range
}

/**
 * Check if a MIDI note number represents a black key
 */
export function isBlackKeyMidi(midi: number): boolean {
  const noteInOctave = midi % 12;
  return [1, 3, 6, 8, 10].includes(noteInOctave); // C#, D#, F#, G#, A#
}

/**
 * Enhance notes with realistic hand and finger assignments
 */
export function addFingeringToNotes(notes: FallingNote[]): FallingNote[] {
  const enhancedNotes: FallingNote[] = [];
  let prevHand: Hand | undefined;
  let prevFinger: Finger | undefined;
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const isBlackKey = isBlackKeyMidi(note.midi);
    
    // Assign hand
    const hand = assignHand(note.midi, { prevHand });
    
    // Assign finger
    const finger = assignFinger(note.midi, hand, { 
      prevFinger, 
      isBlackKey 
    });
    
    enhancedNotes.push({
      ...note,
      hand,
      finger
    });
    
    prevHand = hand;
    prevFinger = finger;
  }
  
  return enhancedNotes;
}

/**
 * Generate sample data with realistic fingering for testing
 */
export function generateSampleNotesWithFingering(): FallingNote[] {
  const sampleNotes: FallingNote[] = [
    // Simple C major scale - right hand
    { midi: 60, start: 0, duration: 0.5 }, // C4
    { midi: 62, start: 0.5, duration: 0.5 }, // D4
    { midi: 64, start: 1, duration: 0.5 }, // E4
    { midi: 65, start: 1.5, duration: 0.5 }, // F4
    { midi: 67, start: 2, duration: 0.5 }, // G4
    { midi: 69, start: 2.5, duration: 0.5 }, // A4
    { midi: 71, start: 3, duration: 0.5 }, // B4
    { midi: 72, start: 3.5, duration: 0.5 }, // C5
    
    // Simple bass notes - left hand
    { midi: 48, start: 0, duration: 1 }, // C3
    { midi: 43, start: 1, duration: 1 }, // G2
    { midi: 45, start: 2, duration: 1 }, // A2
    { midi: 47, start: 3, duration: 1 }, // B2
    
    // Simple chord - both hands
    { midi: 60, start: 4, duration: 1 }, // C4 - right hand
    { midi: 64, start: 4, duration: 1 }, // E4 - right hand
    { midi: 67, start: 4, duration: 1 }, // G4 - right hand
    { midi: 36, start: 4, duration: 1 }, // C2 - left hand
  ];
  
  return addFingeringToNotes(sampleNotes);
}