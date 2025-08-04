/**
 * Animation Parser Service
 * Handles parsing, validation, and serialization of piano animation data
 */

import { 
  PianoAnimationData, 
  PianoNote, 
  AnimationParser, 
  ValidationResult 
} from '@/types/animation'
import { noteToKeyNumber } from '@/utils/piano'

export class AnimationParserService implements AnimationParser {
  private static readonly CURRENT_VERSION = '1.0'
  private static readonly MIN_TEMPO = 40
  private static readonly MAX_TEMPO = 300
  private static readonly MAX_DURATION = 3600 // 1 hour
  private static readonly MIN_DURATION = 0.1 // 0.1 seconds

  /**
   * Parse raw data into PianoAnimationData
   */
  async parse(data: any): Promise<PianoAnimationData> {
    try {
      // If data is already a valid PianoAnimationData object, validate and return
      if (this.isAnimationDataLike(data)) {
        const validationResult = this.validate(data)
        if (!validationResult.isValid) {
          throw new Error(`Invalid animation data: ${validationResult.errors.join(', ')}`)
        }
        return data as PianoAnimationData
      }

      // If data is a string, try to parse as JSON
      if (typeof data === 'string') {
        return this.deserialize(data)
      }

      // If data has raw music information, convert it
      if (this.isRawMusicData(data)) {
        return this.convertRawMusicData(data)
      }

      throw new Error('Unsupported data format for animation parsing')
    } catch (error) {
      throw new Error(`Failed to parse animation data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate animation data structure and content
   */
  validate(data: PianoAnimationData): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Check required fields
      if (!data.version) errors.push('Version is required')
      if (!data.title?.trim()) errors.push('Title is required')
      if (!data.composer?.trim()) errors.push('Composer is required')

      // Validate duration
      if (typeof data.duration !== 'number' || data.duration <= AnimationParserService.MIN_DURATION) {
        errors.push(`Duration must be a positive number greater than ${AnimationParserService.MIN_DURATION}`)
      }
      if (data.duration > AnimationParserService.MAX_DURATION) {
        warnings.push(`Duration is very long (${data.duration}s). Consider splitting into smaller pieces.`)
      }

      // Validate tempo
      if (typeof data.tempo !== 'number' || 
          data.tempo < AnimationParserService.MIN_TEMPO || 
          data.tempo > AnimationParserService.MAX_TEMPO) {
        errors.push(`Tempo must be between ${AnimationParserService.MIN_TEMPO} and ${AnimationParserService.MAX_TEMPO} BPM`)
      }

      // Validate time signature
      if (!this.isValidTimeSignature(data.timeSignature)) {
        errors.push('Invalid time signature format. Expected format: "4/4", "3/4", etc.')
      }

      // Validate notes array
      if (!Array.isArray(data.notes)) {
        errors.push('Notes must be an array')
      } else {
        const noteValidation = this.validateNotes(data.notes, data.duration)
        errors.push(...noteValidation.errors)
        warnings.push(...noteValidation.warnings)
      }

      // Validate metadata
      if (!data.metadata) {
        errors.push('Metadata is required')
      } else {
        if (!data.metadata.originalFileName) errors.push('Original filename is required in metadata')
        if (typeof data.metadata.fileSize !== 'number' || data.metadata.fileSize <= 0) {
          errors.push('Valid file size is required in metadata')
        }
        if (!data.metadata.processedAt) errors.push('Processed timestamp is required in metadata')
      }

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Serialize animation data to JSON string
   */
  serialize(data: PianoAnimationData): string {
    try {
      const validationResult = this.validate(data)
      if (!validationResult.isValid) {
        throw new Error(`Cannot serialize invalid data: ${validationResult.errors.join(', ')}`)
      }

      return JSON.stringify(data, null, 2)
    } catch (error) {
      throw new Error(`Failed to serialize animation data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Deserialize animation data from JSON string
   */
  deserialize(serialized: string): PianoAnimationData {
    try {
      const data = JSON.parse(serialized) as PianoAnimationData
      
      const validationResult = this.validate(data)
      if (!validationResult.isValid) {
        throw new Error(`Invalid deserialized data: ${validationResult.errors.join(', ')}`)
      }

      return data
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format')
      }
      throw new Error(`Failed to deserialize animation data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert raw music data to PianoAnimationData
   */
  private convertRawMusicData(rawData: any): PianoAnimationData {
    const notes: PianoNote[] = []
    let maxTime = 0

    // Convert raw notes to PianoNote format
    if (Array.isArray(rawData.notes)) {
      for (const rawNote of rawData.notes) {
        try {
          const note: PianoNote = {
            note: this.normalizeNoteName(rawNote.note || rawNote.pitch),
            startTime: Math.max(0, parseFloat(rawNote.startTime || rawNote.time || 0)),
            duration: Math.max(0.1, parseFloat(rawNote.duration || 0.5)),
            velocity: Math.max(0, Math.min(1, parseFloat(rawNote.velocity || 0.8))),
            finger: rawNote.finger ? parseInt(rawNote.finger) : undefined,
            hand: rawNote.hand === 'left' || rawNote.hand === 'right' ? rawNote.hand : undefined
          }

          // Validate note name
          noteToKeyNumber(note.note) // This will throw if invalid

          notes.push(note)
          maxTime = Math.max(maxTime, note.startTime + note.duration)
        } catch (error) {
          console.warn(`Skipping invalid note:`, rawNote, error)
        }
      }
    }

    // Sort notes by start time
    notes.sort((a, b) => a.startTime - b.startTime)

    return {
      version: AnimationParserService.CURRENT_VERSION,
      title: rawData.title || 'Untitled',
      composer: rawData.composer || 'Unknown',
      duration: Math.max(maxTime, rawData.duration || maxTime || 1),
      tempo: this.clampTempo(rawData.tempo || 120),
      timeSignature: this.normalizeTimeSignature(rawData.timeSignature || '4/4'),
      notes,
      metadata: {
        originalFileName: rawData.originalFileName || 'unknown.pdf',
        fileSize: rawData.fileSize || 0,
        processedAt: new Date().toISOString(),
        extractedText: rawData.extractedText,
        keySignature: rawData.keySignature,
        difficulty: rawData.difficulty
      }
    }
  }

  /**
   * Validate individual notes
   */
  private validateNotes(notes: PianoNote[], totalDuration: number): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i]
      const prefix = `Note ${i + 1}`

      // Validate note name
      try {
        noteToKeyNumber(note.note)
      } catch {
        errors.push(`${prefix}: Invalid note name "${note.note}"`)
        continue
      }

      // Validate timing
      if (typeof note.startTime !== 'number' || note.startTime < 0) {
        errors.push(`${prefix}: Start time must be a non-negative number`)
      }
      if (typeof note.duration !== 'number' || note.duration <= 0) {
        errors.push(`${prefix}: Duration must be a positive number`)
      }
      if (note.startTime + note.duration > totalDuration + 0.1) { // Allow small tolerance
        warnings.push(`${prefix}: Note extends beyond total duration`)
      }

      // Validate velocity
      if (typeof note.velocity !== 'number' || note.velocity < 0 || note.velocity > 1) {
        errors.push(`${prefix}: Velocity must be between 0 and 1`)
      }

      // Validate optional fields
      if (note.finger !== undefined && (typeof note.finger !== 'number' || note.finger < 1 || note.finger > 5)) {
        warnings.push(`${prefix}: Finger number should be between 1 and 5`)
      }
      if (note.hand !== undefined && note.hand !== 'left' && note.hand !== 'right') {
        warnings.push(`${prefix}: Hand should be 'left' or 'right'`)
      }
    }

    // Check for overlapping notes on same key
    const notesByKey = new Map<string, PianoNote[]>()
    for (const note of notes) {
      if (!notesByKey.has(note.note)) {
        notesByKey.set(note.note, [])
      }
      notesByKey.get(note.note)!.push(note)
    }

    for (const [key, keyNotes] of notesByKey) {
      if (keyNotes.length > 1) {
        // Sort by start time
        keyNotes.sort((a, b) => a.startTime - b.startTime)
        
        for (let i = 1; i < keyNotes.length; i++) {
          const prevNote = keyNotes[i - 1]
          const currentNote = keyNotes[i]
          
          if (currentNote.startTime < prevNote.startTime + prevNote.duration) {
            warnings.push(`Overlapping notes detected on key ${key}`)
            break
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * Check if data looks like PianoAnimationData
   */
  private isAnimationDataLike(data: any): boolean {
    return data && 
           typeof data === 'object' &&
           typeof data.title === 'string' &&
           typeof data.composer === 'string' &&
           typeof data.duration === 'number' &&
           Array.isArray(data.notes)
  }

  /**
   * Check if data is raw music data that can be converted
   */
  private isRawMusicData(data: any): boolean {
    return data && 
           typeof data === 'object' &&
           (data.title || data.composer || Array.isArray(data.notes))
  }

  /**
   * Validate time signature format
   */
  private isValidTimeSignature(timeSignature: string): boolean {
    const pattern = /^\d+\/\d+$/
    if (!pattern.test(timeSignature)) return false

    const [numerator, denominator] = timeSignature.split('/').map(Number)
    return numerator >= 1 && numerator <= 32 && [1, 2, 4, 8, 16, 32].includes(denominator)
  }

  /**
   * Normalize note name to standard format
   */
  private normalizeNoteName(note: string): string {
    if (!note || typeof note !== 'string') {
      throw new Error('Invalid note name')
    }

    // Convert flat notation to sharp notation
    const flatToSharp: { [key: string]: string } = {
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    }

    let normalized = note.trim().toUpperCase()
    
    // Handle flat notation
    for (const [flat, sharp] of Object.entries(flatToSharp)) {
      normalized = normalized.replace(flat.toUpperCase(), sharp)
    }

    return normalized
  }

  /**
   * Normalize time signature
   */
  private normalizeTimeSignature(timeSignature: string): string {
    const normalized = timeSignature.trim()
    return this.isValidTimeSignature(normalized) ? normalized : '4/4'
  }

  /**
   * Clamp tempo to valid range
   */
  private clampTempo(tempo: number): number {
    return Math.max(
      AnimationParserService.MIN_TEMPO, 
      Math.min(AnimationParserService.MAX_TEMPO, tempo)
    )
  }
}

// Singleton instance
let parserInstance: AnimationParserService | null = null

/**
 * Get the singleton animation parser service instance
 */
export function getAnimationParserService(): AnimationParserService {
  if (!parserInstance) {
    parserInstance = new AnimationParserService()
  }
  return parserInstance
}