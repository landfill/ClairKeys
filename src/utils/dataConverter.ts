import type { PianoAnimationData, PianoNote } from '@/types/animation'
import type { FallingNote } from '@/types/fallingNotes'

/**
 * Data Converter Utilities
 * Converts between different data formats for piano visualization
 */

/**
 * Convert note name to MIDI number
 * Examples: 'C4' -> 60, 'A0' -> 21, 'C8' -> 108
 */
export function noteToMidi(noteName: string): number {
  // Parse note name (e.g., 'C#4' -> ['C#', '4'])
  const match = noteName.match(/^([A-G]#?)(\d+)$/);
  if (!match) {
    console.warn(`Invalid note name: ${noteName}`);
    return 60; // Default to middle C
  }
  
  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  
  // Note to semitone mapping (C=0, C#=1, D=2, etc.)
  const noteMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
  };
  
  const semitone = noteMap[note];
  if (semitone === undefined) {
    console.warn(`Unknown note: ${note}`);
    return 60;
  }
  
  // MIDI formula: (octave + 1) * 12 + semitone
  // But we need to handle the fact that MIDI octave -1 starts at C
  const midi = (octave + 1) * 12 + semitone;
  
  // Clamp to valid piano range (A0=21 to C8=108)
  return Math.max(21, Math.min(108, midi));
}

/**
 * Convert MIDI number to note name
 * Examples: 60 -> 'C4', 21 -> 'A0', 108 -> 'C8'
 */
export function midiToNote(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // MIDI note 60 is C4 (middle C)
  const octave = Math.floor((midi - 12) / 12);
  const noteIndex = midi % 12;
  
  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Convert PianoAnimationData to FallingNote array
 */
export function convertToFallingNotes(animationData: PianoAnimationData): FallingNote[] {
  return animationData.notes.map(note => {
    // Convert note name to MIDI
    const midi = noteToMidi(note.note);
    
    // Convert hand designation
    let hand: "L" | "R" | undefined;
    if (note.hand === 'left') hand = 'L';
    else if (note.hand === 'right') hand = 'R';
    
    return {
      midi,
      start: note.startTime,
      duration: note.duration,
      hand,
      finger: note.finger as 1 | 2 | 3 | 4 | 5 | undefined,
      velocity: note.velocity
    };
  });
}

/**
 * Convert FallingNote array back to PianoNote array
 */
export function convertFromFallingNotes(
  fallingNotes: FallingNote[],
  metadata?: { title?: string; composer?: string; duration?: number; tempo?: number; timeSignature?: string }
): PianoNote[] {
  return fallingNotes.map(fallingNote => {
    // Convert MIDI to note name
    const note = midiToNote(fallingNote.midi);
    
    // Convert hand designation
    let hand: 'left' | 'right' | undefined;
    if (fallingNote.hand === 'L') hand = 'left';
    else if (fallingNote.hand === 'R') hand = 'right';
    
    return {
      note,
      startTime: fallingNote.start,
      duration: fallingNote.duration,
      velocity: fallingNote.velocity || 0.7,
      hand,
      finger: fallingNote.finger
    };
  });
}

/**
 * Validate that a note name is valid
 */
export function isValidNoteName(noteName: string): boolean {
  return /^[A-G]#?\d+$/.test(noteName);
}

/**
 * Validate that a MIDI number is in valid piano range
 */
export function isValidPianoMidi(midi: number): boolean {
  return midi >= 21 && midi <= 108 && Number.isInteger(midi);
}

/**
 * Get note statistics from falling notes array
 */
export function getNoteStatistics(notes: FallingNote[]): {
  totalNotes: number;
  leftHandNotes: number;
  rightHandNotes: number;
  unassignedNotes: number;
  midiRange: { min: number; max: number };
  timeRange: { start: number; end: number };
} {
  if (notes.length === 0) {
    return {
      totalNotes: 0,
      leftHandNotes: 0,
      rightHandNotes: 0,
      unassignedNotes: 0,
      midiRange: { min: 0, max: 0 },
      timeRange: { start: 0, end: 0 }
    };
  }
  
  let leftHandNotes = 0;
  let rightHandNotes = 0;
  let unassignedNotes = 0;
  
  let minMidi = notes[0].midi;
  let maxMidi = notes[0].midi;
  let minTime = notes[0].start;
  let maxTime = notes[0].start + notes[0].duration;
  
  for (const note of notes) {
    // Count hand assignments
    if (note.hand === 'L') leftHandNotes++;
    else if (note.hand === 'R') rightHandNotes++;
    else unassignedNotes++;
    
    // Track MIDI range
    minMidi = Math.min(minMidi, note.midi);
    maxMidi = Math.max(maxMidi, note.midi);
    
    // Track time range
    minTime = Math.min(minTime, note.start);
    maxTime = Math.max(maxTime, note.start + note.duration);
  }
  
  return {
    totalNotes: notes.length,
    leftHandNotes,
    rightHandNotes,
    unassignedNotes,
    midiRange: { min: minMidi, max: maxMidi },
    timeRange: { start: minTime, end: maxTime }
  };
}