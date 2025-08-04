/**
 * Piano utility functions for key calculations and conversions
 */

export const PIANO_KEYS = {
  TOTAL_KEYS: 88,
  WHITE_KEYS: 52,
  BLACK_KEYS: 36,
  FIRST_KEY: 'A0',
  LAST_KEY: 'C8'
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

/**
 * Convert key number (1-88) to note name with octave
 */
export function keyNumberToNote(keyNumber: number): string {
  if (keyNumber < 1 || keyNumber > 88) {
    throw new Error('Key number must be between 1 and 88')
  }
  
  // A0 is key 1, so we need to offset by 9 semitones to align with C-based octaves
  const noteIndex = (keyNumber + 8) % 12
  const octave = Math.floor((keyNumber + 8) / 12)
  const noteName = NOTE_NAMES[noteIndex]
  
  return `${noteName}${octave}`
}

/**
 * Convert note name with octave to key number (1-88)
 */
export function noteToKeyNumber(note: string): number {
  const match = note.match(/^([A-G]#?)(\d+)$/)
  if (!match) {
    throw new Error('Invalid note format. Expected format: C4, F#5, etc.')
  }
  
  const [, noteName, octaveStr] = match
  const octave = parseInt(octaveStr, 10)
  
  const noteIndex = NOTE_NAMES.indexOf(noteName)
  if (noteIndex === -1) {
    throw new Error(`Invalid note name: ${noteName}`)
  }
  
  // Calculate key number based on C-based octaves, then adjust for A0 start
  const keyNumber = (octave * 12) + noteIndex - 8
  
  if (keyNumber < 1 || keyNumber > 88) {
    throw new Error(`Note ${note} is outside the 88-key piano range`)
  }
  
  return keyNumber
}

/**
 * Check if a note is a black key
 */
export function isBlackKey(note: string): boolean {
  const noteName = note.replace(/\d+$/, '')
  return noteName.includes('#')
}

/**
 * Check if a note is a white key
 */
export function isWhiteKey(note: string): boolean {
  return !isBlackKey(note)
}

/**
 * Get all notes in a given octave
 */
export function getNotesInOctave(octave: number): string[] {
  return NOTE_NAMES.map(note => `${note}${octave}`)
}

/**
 * Get the frequency of a note (A4 = 440Hz)
 */
export function noteToFrequency(note: string): number {
  const keyNumber = noteToKeyNumber(note)
  // A4 is key 49, frequency = 440Hz
  const A4_KEY = 49
  const A4_FREQ = 440
  
  return A4_FREQ * Math.pow(2, (keyNumber - A4_KEY) / 12)
}

/**
 * Generate a sequence of notes for testing
 */
export function generateTestSequence(): string[] {
  return [
    'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5',
    'C#4', 'D#4', 'F#4', 'G#4', 'A#4'
  ]
}

/**
 * Get neighboring keys for a given note
 */
export function getNeighboringKeys(note: string): { prev: string | null, next: string | null } {
  try {
    const keyNumber = noteToKeyNumber(note)
    
    const prev = keyNumber > 1 ? keyNumberToNote(keyNumber - 1) : null
    const next = keyNumber < 88 ? keyNumberToNote(keyNumber + 1) : null
    
    return { prev, next }
  } catch {
    return { prev: null, next: null }
  }
}