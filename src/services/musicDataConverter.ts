import { PianoAnimationData, PianoNote } from './pdfParser'

/**
 * New JSON format from sample-data folder
 */
interface MusicData {
  metadata: {
    title?: string
    composer?: string
    partCount: number
    measureCount: number
    duration: number
    totalNotes: number
    leftHandNotes: number
    rightHandNotes: number
  }
  notes: {
    midi: number // MIDI note number (21-108)
    start: number // start time in seconds
    duration: number // duration in seconds  
    hand: 'L' | 'R' // hand assignment
    velocity?: number // note velocity (0-1)
  }[]
}

/**
 * Convert MIDI number to note name
 * MIDI 60 = C4, 69 = A4, etc.
 */
function midiToNoteName(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  const noteIndex = midi % 12
  return `${noteNames[noteIndex]}${octave}`
}

/**
 * Convert new JSON format to PianoAnimationData format
 */
export function convertMusicDataToPianoAnimation(
  musicData: MusicData,
  originalFileName: string = 'sample.json'
): PianoAnimationData {
  // Convert notes from MIDI format to note name format
  const pianoNotes: PianoNote[] = musicData.notes.map(note => ({
    note: midiToNoteName(note.midi),
    startTime: note.start,
    duration: note.duration,
    velocity: note.velocity || 0.8, // default velocity if not specified
    // Add hand information as metadata (could be used later)
    hand: note.hand
  } as PianoNote & { hand: string }))

  // Create PianoAnimationData
  const pianoAnimationData: PianoAnimationData = {
    version: '1.0',
    title: musicData.metadata.title || 'Untitled',
    composer: musicData.metadata.composer || 'Unknown',
    duration: musicData.metadata.duration,
    tempo: 120, // Default tempo, could be calculated from timing
    timeSignature: '4/4', // Default time signature
    notes: pianoNotes,
    metadata: {
      originalFileName,
      fileSize: JSON.stringify(musicData).length,
      processedAt: new Date().toISOString(),
      extractedText: `Converted from JSON: ${musicData.metadata.totalNotes} notes`,
      pagesProcessed: 1,
      staffLinesDetected: musicData.metadata.partCount * 5, // Assume 5 lines per staff
      notesDetected: musicData.metadata.totalNotes
    }
  }

  return pianoAnimationData
}

/**
 * Validate MusicData format
 */
export function validateMusicData(data: any): data is MusicData {
  if (!data || typeof data !== 'object') {
    return false
  }

  // Check metadata
  if (!data.metadata || typeof data.metadata !== 'object') {
    return false
  }

  const metadata = data.metadata
  if (
    typeof metadata.partCount !== 'number' ||
    typeof metadata.measureCount !== 'number' ||
    typeof metadata.duration !== 'number' ||
    typeof metadata.totalNotes !== 'number' ||
    typeof metadata.leftHandNotes !== 'number' ||
    typeof metadata.rightHandNotes !== 'number'
  ) {
    return false
  }

  // Check notes array
  if (!Array.isArray(data.notes)) {
    return false
  }

  for (const note of data.notes) {
    if (
      typeof note.midi !== 'number' ||
      note.midi < 21 || note.midi > 108 ||
      typeof note.start !== 'number' ||
      typeof note.duration !== 'number' ||
      (note.hand !== 'L' && note.hand !== 'R')
    ) {
      return false
    }
  }

  return true
}