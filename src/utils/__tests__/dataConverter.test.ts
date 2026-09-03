import { canonicalToFallingNotes } from '../dataConverter'
import type { CanonicalAnimationData } from '@/types/animationContract'

function animation(notes: CanonicalAnimationData['notes']): CanonicalAnimationData {
  return {
    version: '1.1',
    title: 'Fingering fixture',
    composer: 'Test',
    duration: 2,
    tempo: 120,
    tempoSource: 'score',
    timingReferenceBpm: 120,
    timeSignature: '4/4',
    notes,
  }
}

describe('canonicalToFallingNotes fingering boundary', () => {
  it('preserves source fingering and fills every missing finger deterministically', () => {
    const source = animation([
      { midi: 48, start: 0, duration: 0.5, hand: 'L', finger: 4 },
      { midi: 60, start: 0, duration: 0.5, hand: 'R', finger: 2 },
      { midi: 64, start: 0.5, duration: 0.5, hand: 'R' },
      { midi: 43, start: 1, duration: 0.5, hand: 'L' },
      { midi: 67, start: 1.5, duration: 0.5 },
    ])

    const first = canonicalToFallingNotes(source)
    const second = canonicalToFallingNotes(source)

    expect(first).toEqual(second)
    expect(first[0]).toMatchObject({ hand: 'L', finger: 4 })
    expect(first[1]).toMatchObject({ hand: 'R', finger: 2 })
    first.forEach((note) => {
      expect(note.hand).toMatch(/^[LR]$/)
      expect(note.finger).toBeGreaterThanOrEqual(1)
      expect(note.finger).toBeLessThanOrEqual(5)
    })
  })

  it('uses conventional outer fingers for a simultaneous triad in each hand', () => {
    const notes = canonicalToFallingNotes(animation([
      { midi: 48, start: 0, duration: 1, hand: 'L' },
      { midi: 52, start: 0, duration: 1, hand: 'L' },
      { midi: 55, start: 0, duration: 1, hand: 'L' },
      { midi: 60, start: 1, duration: 1, hand: 'R' },
      { midi: 64, start: 1, duration: 1, hand: 'R' },
      { midi: 67, start: 1, duration: 1, hand: 'R' },
    ]))

    expect(notes.slice(0, 3).map((note) => note.finger)).toEqual([5, 3, 1])
    expect(notes.slice(3).map((note) => note.finger)).toEqual([1, 3, 5])
  })
})
