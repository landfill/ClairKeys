import { PDFParserService, PianoAnimationData } from '../pdfParser'

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation((buffer: Buffer) => {
    // Mock different PDF content based on buffer content
    const content = buffer.toString()
    
    if (content.includes('tempo-test')) {
      return Promise.resolve({
        text: 'This is a test PDF with tempo marking: ♩ = 140 BPM and time signature 3/4'
      })
    }
    
    if (content.includes('error-test')) {
      return Promise.reject(new Error('PDF parsing failed'))
    }
    
    return Promise.resolve({
      text: 'This is a sample PDF content with some musical notation text.'
    })
  })
})

describe('PDFParserService', () => {
  let pdfParser: PDFParserService

  beforeEach(() => {
    pdfParser = new PDFParserService()
  })

  describe('parsePDF', () => {
    it('should parse PDF and create animation data', async () => {
      const mockBuffer = Buffer.from('test pdf content')
      const metadata = {
        title: 'Test Song',
        composer: 'Test Composer',
        originalFileName: 'test.pdf',
        fileSize: 1024
      }

      const result = await pdfParser.parsePDF(mockBuffer, metadata)

      expect(result).toBeDefined()
      expect(result.title).toBe('Test Song')
      expect(result.composer).toBe('Test Composer')
      expect(result.version).toBe('1.0')
      expect(result.duration).toBeGreaterThan(0)
      expect(result.tempo).toBeGreaterThan(0)
      expect(result.timeSignature).toBeDefined()
      expect(Array.isArray(result.notes)).toBe(true)
      expect(result.metadata.originalFileName).toBe('test.pdf')
      expect(result.metadata.fileSize).toBe(1024)
      expect(result.metadata.processedAt).toBeDefined()
    })

    it('should extract tempo and time signature from PDF text', async () => {
      const mockBuffer = Buffer.from('tempo-test')
      const metadata = {
        title: 'Test Song',
        composer: 'Test Composer',
        originalFileName: 'test.pdf',
        fileSize: 1024
      }

      const result = await pdfParser.parsePDF(mockBuffer, metadata)

      expect(result.tempo).toBe(140)
      expect(result.timeSignature).toBe('3/4')
    })

    it('should handle PDF parsing errors', async () => {
      const mockBuffer = Buffer.from('error-test')
      const metadata = {
        title: 'Test Song',
        composer: 'Test Composer',
        originalFileName: 'test.pdf',
        fileSize: 1024
      }

      await expect(pdfParser.parsePDF(mockBuffer, metadata))
        .rejects.toThrow('PDF 파싱 중 오류가 발생했습니다.')
    })
  })

  describe('validateAnimationData', () => {
    it('should validate correct animation data', () => {
      const validData: PianoAnimationData = {
        version: '1.0',
        title: 'Test Song',
        composer: 'Test Composer',
        duration: 10,
        tempo: 120,
        timeSignature: '4/4',
        notes: [
          { note: 'C4', startTime: 0, duration: 1, velocity: 0.8 }
        ],
        metadata: {
          originalFileName: 'test.pdf',
          fileSize: 1024,
          processedAt: new Date().toISOString()
        }
      }

      expect(pdfParser.validateAnimationData(validData)).toBe(true)
    })

    it('should reject data with missing required fields', () => {
      const invalidData = {
        version: '1.0',
        // missing title
        composer: 'Test Composer',
        duration: 10,
        tempo: 120,
        timeSignature: '4/4',
        notes: [],
        metadata: {
          originalFileName: 'test.pdf',
          fileSize: 1024,
          processedAt: new Date().toISOString()
        }
      } as PianoAnimationData

      expect(pdfParser.validateAnimationData(invalidData)).toBe(false)
    })

    it('should reject data with invalid duration', () => {
      const invalidData: PianoAnimationData = {
        version: '1.0',
        title: 'Test Song',
        composer: 'Test Composer',
        duration: -5, // Invalid negative duration
        tempo: 120,
        timeSignature: '4/4',
        notes: [],
        metadata: {
          originalFileName: 'test.pdf',
          fileSize: 1024,
          processedAt: new Date().toISOString()
        }
      }

      expect(pdfParser.validateAnimationData(invalidData)).toBe(false)
    })

    it('should reject data with invalid tempo', () => {
      const invalidData: PianoAnimationData = {
        version: '1.0',
        title: 'Test Song',
        composer: 'Test Composer',
        duration: 10,
        tempo: 500, // Invalid tempo (too high)
        timeSignature: '4/4',
        notes: [],
        metadata: {
          originalFileName: 'test.pdf',
          fileSize: 1024,
          processedAt: new Date().toISOString()
        }
      }

      expect(pdfParser.validateAnimationData(invalidData)).toBe(false)
    })

    it('should reject data with invalid notes', () => {
      const invalidData: PianoAnimationData = {
        version: '1.0',
        title: 'Test Song',
        composer: 'Test Composer',
        duration: 10,
        tempo: 120,
        timeSignature: '4/4',
        notes: [
          { note: 'X9', startTime: 0, duration: 1, velocity: 0.8 } // Invalid note
        ],
        metadata: {
          originalFileName: 'test.pdf',
          fileSize: 1024,
          processedAt: new Date().toISOString()
        }
      }

      expect(pdfParser.validateAnimationData(invalidData)).toBe(false)
    })
  })

  describe('serializeAnimationData and deserializeAnimationData', () => {
    it('should serialize and deserialize animation data correctly', () => {
      const originalData: PianoAnimationData = {
        version: '1.0',
        title: 'Test Song',
        composer: 'Test Composer',
        duration: 10,
        tempo: 120,
        timeSignature: '4/4',
        notes: [
          { note: 'C4', startTime: 0, duration: 1, velocity: 0.8 },
          { note: 'D4', startTime: 1, duration: 1, velocity: 0.7 }
        ],
        metadata: {
          originalFileName: 'test.pdf',
          fileSize: 1024,
          processedAt: new Date().toISOString()
        }
      }

      const serialized = pdfParser.serializeAnimationData(originalData)
      expect(typeof serialized).toBe('string')

      const deserialized = pdfParser.deserializeAnimationData(serialized)
      expect(deserialized).toEqual(originalData)
    })

    it('should handle invalid JSON during deserialization', () => {
      const invalidJson = '{ invalid json }'

      expect(() => pdfParser.deserializeAnimationData(invalidJson))
        .toThrow('Failed to parse animation data')
    })

    it('should handle invalid data structure during deserialization', () => {
      const invalidData = JSON.stringify({ invalid: 'data' })

      expect(() => pdfParser.deserializeAnimationData(invalidData))
        .toThrow('Failed to parse animation data')
    })
  })

  describe('note validation', () => {
    it('should validate correct note formats', () => {
      const validNotes = ['C4', 'D#5', 'Bb3', 'F#7', 'A0', 'G8']
      
      validNotes.forEach(note => {
        const testData: PianoAnimationData = {
          version: '1.0',
          title: 'Test',
          composer: 'Test',
          duration: 1,
          tempo: 120,
          timeSignature: '4/4',
          notes: [{ note, startTime: 0, duration: 1, velocity: 0.8 }],
          metadata: {
            originalFileName: 'test.pdf',
            fileSize: 1024,
            processedAt: new Date().toISOString()
          }
        }
        
        expect(pdfParser.validateAnimationData(testData)).toBe(true)
      })
    })

    it('should reject invalid note formats', () => {
      const invalidNotes = ['H4', 'C9', 'C', '4', 'C#b4', 'Cb#4']
      
      invalidNotes.forEach(note => {
        const testData: PianoAnimationData = {
          version: '1.0',
          title: 'Test',
          composer: 'Test',
          duration: 1,
          tempo: 120,
          timeSignature: '4/4',
          notes: [{ note, startTime: 0, duration: 1, velocity: 0.8 }],
          metadata: {
            originalFileName: 'test.pdf',
            fileSize: 1024,
            processedAt: new Date().toISOString()
          }
        }
        
        expect(pdfParser.validateAnimationData(testData)).toBe(false)
      })
    })
  })
})