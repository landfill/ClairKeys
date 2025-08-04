/**
 * Tests for AnimationParserService
 */

import { AnimationParserService, getAnimationParserService } from '../animationParser'
import { PianoAnimationData, PianoNote } from '@/types/animation'

describe('AnimationParserService', () => {
  let parser: AnimationParserService

  beforeEach(() => {
    parser = new AnimationParserService()
  })

  describe('validate', () => {
    const validAnimationData: PianoAnimationData = {
      version: '1.0',
      title: 'Test Piece',
      composer: 'Test Composer',
      duration: 10.0,
      tempo: 120,
      timeSignature: '4/4',
      notes: [
        { note: 'C4', startTime: 0, duration: 1, velocity: 0.8 },
        { note: 'D4', startTime: 1, duration: 1, velocity: 0.7 }
      ],
      metadata: {
        originalFileName: 'test.pdf',
        fileSize: 1024,
        processedAt: '2023-01-01T00:00:00.000Z'
      }
    }

    it('should validate correct animation data', () => {
      const result = parser.validate(validAnimationData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject data without required fields', () => {
      const invalidData = { ...validAnimationData, title: '' }
      const result = parser.validate(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Title is required')
    })

    it('should reject invalid tempo', () => {
      const invalidData = { ...validAnimationData, tempo: 500 }
      const result = parser.validate(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Tempo must be between'))).toBe(true)
    })

    it('should reject invalid time signature', () => {
      const invalidData = { ...validAnimationData, timeSignature: 'invalid' }
      const result = parser.validate(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid time signature'))).toBe(true)
    })

    it('should reject invalid notes', () => {
      const invalidData = {
        ...validAnimationData,
        notes: [{ note: 'InvalidNote', startTime: 0, duration: 1, velocity: 0.8 }]
      }
      const result = parser.validate(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Invalid note name'))).toBe(true)
    })

    it('should reject notes with invalid velocity', () => {
      const invalidData = {
        ...validAnimationData,
        notes: [{ note: 'C4', startTime: 0, duration: 1, velocity: 1.5 }]
      }
      const result = parser.validate(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Velocity must be between'))).toBe(true)
    })

    it('should warn about overlapping notes', () => {
      const dataWithOverlap = {
        ...validAnimationData,
        notes: [
          { note: 'C4', startTime: 0, duration: 2, velocity: 0.8 },
          { note: 'C4', startTime: 1, duration: 1, velocity: 0.7 }
        ]
      }
      const result = parser.validate(dataWithOverlap)
      expect(result.warnings.some(w => w.includes('Overlapping notes'))).toBe(true)
    })
  })

  describe('serialize and deserialize', () => {
    const testData: PianoAnimationData = {
      version: '1.0',
      title: 'Test Piece',
      composer: 'Test Composer',
      duration: 5.0,
      tempo: 120,
      timeSignature: '4/4',
      notes: [
        { note: 'C4', startTime: 0, duration: 1, velocity: 0.8 },
        { note: 'E4', startTime: 1, duration: 1, velocity: 0.7 },
        { note: 'G4', startTime: 2, duration: 1, velocity: 0.9 }
      ],
      metadata: {
        originalFileName: 'test.pdf',
        fileSize: 2048,
        processedAt: '2023-01-01T00:00:00.000Z'
      }
    }

    it('should serialize valid data to JSON string', () => {
      const serialized = parser.serialize(testData)
      expect(typeof serialized).toBe('string')
      expect(() => JSON.parse(serialized)).not.toThrow()
    })

    it('should deserialize JSON string back to data', () => {
      const serialized = parser.serialize(testData)
      const deserialized = parser.deserialize(serialized)
      expect(deserialized).toEqual(testData)
    })

    it('should reject invalid JSON during deserialization', () => {
      expect(() => parser.deserialize('invalid json')).toThrow('Invalid JSON format')
    })

    it('should reject serialization of invalid data', () => {
      const invalidData = { ...testData, title: '' }
      expect(() => parser.serialize(invalidData)).toThrow()
    })
  })

  describe('parse', () => {
    it('should parse valid PianoAnimationData object', async () => {
      const validData: PianoAnimationData = {
        version: '1.0',
        title: 'Test',
        composer: 'Composer',
        duration: 3.0,
        tempo: 120,
        timeSignature: '4/4',
        notes: [{ note: 'C4', startTime: 0, duration: 1, velocity: 0.8 }],
        metadata: {
          originalFileName: 'test.pdf',
          fileSize: 1024,
          processedAt: '2023-01-01T00:00:00.000Z'
        }
      }

      const result = await parser.parse(validData)
      expect(result).toEqual(validData)
    })

    it('should parse JSON string', async () => {
      const validData: PianoAnimationData = {
        version: '1.0',
        title: 'Test',
        composer: 'Composer',
        duration: 3.0,
        tempo: 120,
        timeSignature: '4/4',
        notes: [{ note: 'C4', startTime: 0, duration: 1, velocity: 0.8 }],
        metadata: {
          originalFileName: 'test.pdf',
          fileSize: 1024,
          processedAt: '2023-01-01T00:00:00.000Z'
        }
      }

      const jsonString = JSON.stringify(validData)
      const result = await parser.parse(jsonString)
      expect(result).toEqual(validData)
    })

    it('should parse raw music data', async () => {
      const rawData = {
        title: 'Raw Test',
        composer: 'Raw Composer',
        tempo: 140,
        notes: [
          { note: 'C4', startTime: 0, duration: 0.5, velocity: 0.8 },
          { note: 'E4', startTime: 0.5, duration: 0.5, velocity: 0.7 }
        ],
        originalFileName: 'raw.pdf',
        fileSize: 512
      }

      const result = await parser.parse(rawData)
      expect(result.title).toBe('Raw Test')
      expect(result.composer).toBe('Raw Composer')
      expect(result.tempo).toBe(140)
      expect(result.notes).toHaveLength(2)
      expect(result.version).toBe('1.0')
    })

    it('should handle flat notation in raw data', async () => {
      const rawData = {
        title: 'Flat Test',
        notes: [
          { note: 'Db4', startTime: 0, duration: 1, velocity: 0.8 },
          { note: 'Eb4', startTime: 1, duration: 1, velocity: 0.8 }
        ],
        originalFileName: 'flat.pdf',
        fileSize: 256
      }

      const result = await parser.parse(rawData)
      expect(result.notes[0].note).toBe('C#4')
      expect(result.notes[1].note).toBe('D#4')
    })

    it('should skip invalid notes in raw data', async () => {
      const rawData = {
        title: 'Mixed Test',
        notes: [
          { note: 'C4', startTime: 0, duration: 1, velocity: 0.8 },
          { note: 'InvalidNote', startTime: 1, duration: 1, velocity: 0.8 },
          { note: 'E4', startTime: 2, duration: 1, velocity: 0.8 }
        ],
        originalFileName: 'mixed.pdf',
        fileSize: 256
      }

      const result = await parser.parse(rawData)
      expect(result.notes).toHaveLength(2)
      expect(result.notes[0].note).toBe('C4')
      expect(result.notes[1].note).toBe('E4')
    })

    it('should reject unsupported data format', async () => {
      await expect(parser.parse(123)).rejects.toThrow('Unsupported data format')
    })
  })

  describe('edge cases', () => {
    it('should handle empty notes array', () => {
      const dataWithEmptyNotes: PianoAnimationData = {
        version: '1.0',
        title: 'Empty',
        composer: 'Composer',
        duration: 1.0,
        tempo: 120,
        timeSignature: '4/4',
        notes: [],
        metadata: {
          originalFileName: 'empty.pdf',
          fileSize: 100,
          processedAt: '2023-01-01T00:00:00.000Z'
        }
      }

      const result = parser.validate(dataWithEmptyNotes)
      expect(result.isValid).toBe(true)
    })

    it('should handle various time signatures', () => {
      const validTimeSignatures = ['2/4', '3/4', '4/4', '6/8', '9/8', '12/8']
      
      validTimeSignatures.forEach(timeSignature => {
        const data: PianoAnimationData = {
          version: '1.0',
          title: 'Test',
          composer: 'Composer',
          duration: 1.0,
          tempo: 120,
          timeSignature,
          notes: [],
          metadata: {
            originalFileName: 'test.pdf',
            fileSize: 100,
            processedAt: '2023-01-01T00:00:00.000Z'
          }
        }

        const result = parser.validate(data)
        expect(result.isValid).toBe(true)
      })
    })

    it('should clamp tempo to valid range in raw data conversion', async () => {
      const rawDataWithInvalidTempo = {
        title: 'Tempo Test',
        tempo: 500, // Too high
        notes: [],
        originalFileName: 'tempo.pdf',
        fileSize: 100
      }

      const result = await parser.parse(rawDataWithInvalidTempo)
      expect(result.tempo).toBe(300) // Clamped to max
    })
  })

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getAnimationParserService()
      const instance2 = getAnimationParserService()
      expect(instance1).toBe(instance2)
    })
  })
})