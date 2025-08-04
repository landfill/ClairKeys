// import pdf from 'pdf-parse' // Temporarily disabled due to library issues

export interface PianoNote {
  note: string // e.g., 'C4', 'D#5'
  startTime: number // seconds
  duration: number // seconds
  velocity: number // 0-1
}

export interface PianoAnimationData {
  version: string
  title: string
  composer: string
  duration: number // total duration in seconds
  tempo: number // BPM
  timeSignature: string // e.g., '4/4'
  notes: PianoNote[]
  metadata: {
    originalFileName: string
    fileSize: number
    processedAt: string
    extractedText?: string
  }
}

export class PDFParserService {
  /**
   * Parse PDF file and extract sheet music data
   */
  async parsePDF(fileBuffer: Buffer, metadata: {
    title: string
    composer: string
    originalFileName: string
    fileSize: number
  }): Promise<PianoAnimationData> {
    try {
      console.log('PDFParserService: Starting PDF parsing...')
      console.log('PDFParserService: Buffer length:', fileBuffer.length)
      
      // Parse PDF to extract text content
      let extractedText = ''
      
      // Temporarily skip PDF parsing due to library issues
      console.log('PDFParserService: Skipping PDF parsing, using demo data')
      extractedText = 'Demo data - PDF parsing temporarily disabled'
      
      // TODO: Re-enable PDF parsing once library issues are resolved
      /*
      try {
        console.log('PDFParserService: Calling pdf-parse...')
        const pdfData = await pdf(fileBuffer)
        extractedText = pdfData.text
        console.log('PDFParserService: PDF parsing successful, text length:', extractedText.length)
      } catch (pdfError) {
        console.error('PDFParserService: pdf-parse error:', pdfError)
        // Continue with empty text for now
        extractedText = 'PDF parsing failed, using demo data'
      }
      */

      // For now, we'll create a simple demo animation
      // In a real implementation, this would involve complex music notation parsing
      console.log('PDFParserService: Creating demo animation...')
      const animationData = this.createDemoAnimation(metadata, extractedText)
      console.log('PDFParserService: Demo animation created successfully')

      return animationData
    } catch (error) {
      console.error('PDFParserService: General error:', error)
      throw new Error('PDF 파싱 중 오류가 발생했습니다.')
    }
  }

  /**
   * Create a demo animation data structure
   * This is a placeholder for actual music notation parsing
   */
  private createDemoAnimation(metadata: {
    title: string
    composer: string
    originalFileName: string
    fileSize: number
  }, extractedText: string): PianoAnimationData {
    // Create a simple demo melody (C major scale)
    const demoNotes: PianoNote[] = [
      { note: 'C4', startTime: 0, duration: 0.5, velocity: 0.8 },
      { note: 'D4', startTime: 0.5, duration: 0.5, velocity: 0.8 },
      { note: 'E4', startTime: 1.0, duration: 0.5, velocity: 0.8 },
      { note: 'F4', startTime: 1.5, duration: 0.5, velocity: 0.8 },
      { note: 'G4', startTime: 2.0, duration: 0.5, velocity: 0.8 },
      { note: 'A4', startTime: 2.5, duration: 0.5, velocity: 0.8 },
      { note: 'B4', startTime: 3.0, duration: 0.5, velocity: 0.8 },
      { note: 'C5', startTime: 3.5, duration: 1.0, velocity: 0.8 },
    ]

    // Try to extract some basic information from the PDF text
    const detectedTempo = this.extractTempo(extractedText)
    const detectedTimeSignature = this.extractTimeSignature(extractedText)

    return {
      version: '1.0',
      title: metadata.title,
      composer: metadata.composer,
      duration: 4.5, // Total duration of demo melody
      tempo: detectedTempo,
      timeSignature: detectedTimeSignature,
      notes: demoNotes,
      metadata: {
        originalFileName: metadata.originalFileName,
        fileSize: metadata.fileSize,
        processedAt: new Date().toISOString(),
        extractedText: extractedText.substring(0, 500) // Store first 500 chars for debugging
      }
    }
  }

  /**
   * Attempt to extract tempo from PDF text
   */
  private extractTempo(text: string): number {
    // Look for common tempo markings
    const tempoPatterns = [
      /(\d+)\s*bpm/i,
      /♩\s*=\s*(\d+)/,
      /quarter\s*=\s*(\d+)/i,
      /tempo\s*(\d+)/i
    ]

    for (const pattern of tempoPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const tempo = parseInt(match[1], 10)
        if (tempo >= 40 && tempo <= 200) { // Reasonable tempo range
          return tempo
        }
      }
    }

    // Default tempo
    return 120
  }

  /**
   * Attempt to extract time signature from PDF text
   */
  private extractTimeSignature(text: string): string {
    // Look for common time signatures
    const timeSignaturePatterns = [
      /(\d+)\/(\d+)/g,
      /(\d+)\s*\/\s*(\d+)/g
    ]

    for (const pattern of timeSignaturePatterns) {
      const matches = Array.from(text.matchAll(pattern))
      for (const match of matches) {
        if (match[1] && match[2]) {
          const numerator = parseInt(match[1], 10)
          const denominator = parseInt(match[2], 10)
          
          // Check for common time signatures
          if ((numerator >= 2 && numerator <= 12) && 
              [2, 4, 8, 16].includes(denominator)) {
            return `${numerator}/${denominator}`
          }
        }
      }
    }

    // Default time signature
    return '4/4'
  }

  /**
   * Validate animation data structure
   */
  validateAnimationData(data: PianoAnimationData): boolean {
    try {
      // Check required fields
      if (!data.version || !data.title || !data.composer) {
        return false
      }

      // Check duration is positive
      if (data.duration <= 0) {
        return false
      }

      // Check tempo is reasonable
      if (data.tempo < 40 || data.tempo > 300) {
        return false
      }

      // Validate notes array
      if (!Array.isArray(data.notes)) {
        return false
      }

      // Validate each note
      for (const note of data.notes) {
        if (!this.isValidNote(note.note) || 
            note.startTime < 0 || 
            note.duration <= 0 || 
            note.velocity < 0 || 
            note.velocity > 1) {
          return false
        }
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Check if a note string is valid (e.g., 'C4', 'F#3', 'Bb5')
   */
  private isValidNote(note: string): boolean {
    const notePattern = /^[A-G][#b]?[0-8]$/
    return notePattern.test(note)
  }

  /**
   * Convert animation data to JSON string for storage
   */
  serializeAnimationData(data: PianoAnimationData): string {
    return JSON.stringify(data, null, 2)
  }

  /**
   * Parse animation data from JSON string
   */
  deserializeAnimationData(jsonString: string): PianoAnimationData {
    try {
      const data = JSON.parse(jsonString) as PianoAnimationData
      
      if (!this.validateAnimationData(data)) {
        throw new Error('Invalid animation data structure')
      }

      return data
    } catch (error) {
      throw new Error('Failed to parse animation data')
    }
  }
}

// Singleton instance
let pdfParserInstance: PDFParserService | null = null

/**
 * Get the singleton PDF parser service instance
 */
export function getPDFParserService(): PDFParserService {
  if (!pdfParserInstance) {
    pdfParserInstance = new PDFParserService()
  }
  return pdfParserInstance
}