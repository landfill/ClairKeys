import { 
  keyNumberToNote, 
  noteToKeyNumber, 
  isBlackKey, 
  isWhiteKey, 
  noteToFrequency,
  getNeighboringKeys 
} from '../piano'

describe('Piano Utilities', () => {
  describe('keyNumberToNote', () => {
    test('converts key numbers to correct notes', () => {
      expect(keyNumberToNote(1)).toBe('A0')
      expect(keyNumberToNote(4)).toBe('C1')
      expect(keyNumberToNote(49)).toBe('A4')
      expect(keyNumberToNote(88)).toBe('C8')
    })

    test('throws error for invalid key numbers', () => {
      expect(() => keyNumberToNote(0)).toThrow()
      expect(() => keyNumberToNote(89)).toThrow()
    })
  })

  describe('noteToKeyNumber', () => {
    test('converts notes to correct key numbers', () => {
      expect(noteToKeyNumber('A0')).toBe(1)
      expect(noteToKeyNumber('C1')).toBe(4)
      expect(noteToKeyNumber('A4')).toBe(49)
      expect(noteToKeyNumber('C8')).toBe(88)
    })

    test('handles sharp notes correctly', () => {
      expect(noteToKeyNumber('A#0')).toBe(2)
      expect(noteToKeyNumber('C#4')).toBe(41)
    })

    test('throws error for invalid note format', () => {
      expect(() => noteToKeyNumber('invalid')).toThrow()
      expect(() => noteToKeyNumber('H4')).toThrow()
    })
  })

  describe('isBlackKey and isWhiteKey', () => {
    test('correctly identifies black keys', () => {
      expect(isBlackKey('C#4')).toBe(true)
      expect(isBlackKey('F#5')).toBe(true)
      expect(isBlackKey('C4')).toBe(false)
      expect(isBlackKey('F5')).toBe(false)
    })

    test('correctly identifies white keys', () => {
      expect(isWhiteKey('C4')).toBe(true)
      expect(isWhiteKey('F5')).toBe(true)
      expect(isWhiteKey('C#4')).toBe(false)
      expect(isWhiteKey('F#5')).toBe(false)
    })
  })

  describe('noteToFrequency', () => {
    test('calculates correct frequency for A4', () => {
      expect(noteToFrequency('A4')).toBeCloseTo(440, 1)
    })

    test('calculates correct frequency for other notes', () => {
      expect(noteToFrequency('C4')).toBeCloseTo(261.63, 1)
      expect(noteToFrequency('A5')).toBeCloseTo(880, 1)
    })
  })

  describe('getNeighboringKeys', () => {
    test('returns correct neighboring keys', () => {
      const neighbors = getNeighboringKeys('C4')
      expect(neighbors.prev).toBe('B3')
      expect(neighbors.next).toBe('C#4')
    })

    test('handles edge cases', () => {
      const firstKey = getNeighboringKeys('A0')
      expect(firstKey.prev).toBe(null)
      expect(firstKey.next).toBe('A#0')

      const lastKey = getNeighboringKeys('C8')
      expect(lastKey.prev).toBe('B7')
      expect(lastKey.next).toBe(null)
    })
  })

  describe('round trip conversions', () => {
    test('key number to note and back', () => {
      for (let keyNumber = 1; keyNumber <= 88; keyNumber++) {
        const note = keyNumberToNote(keyNumber)
        const backToKeyNumber = noteToKeyNumber(note)
        expect(backToKeyNumber).toBe(keyNumber)
      }
    })
  })
})