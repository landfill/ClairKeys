import { annotationNotesFor, audibleNotesFor, hasBothHands, isPracticedNote, otherHand } from '../handPractice'
import type { FallingNote } from '@/types/fallingNotes'

const right: FallingNote = { midi: 72, start: 0, duration: 1, hand: 'R' }
const left: FallingNote = { midi: 48, start: 0, duration: 1, hand: 'L' }
const unassigned: FallingNote = { midi: 60, start: 1, duration: 1 }
const notes = [right, left, unassigned]

describe('hand practice selection', () => {
  it('offers a hand choice only when the score really has both hands', () => {
    expect(hasBothHands(notes)).toBe(true)
    expect(hasBothHands([right, unassigned])).toBe(false)
    expect(hasBothHands([])).toBe(false)
  })

  it('names the hand that is not being practised', () => {
    expect(otherHand('both')).toBeNull()
    expect(otherHand('R')).toBe('L')
    expect(otherHand('L')).toBe('R')
  })

  it('keeps unassigned notes in every practice mode', () => {
    expect(isPracticedNote(unassigned, 'R')).toBe(true)
    expect(isPracticedNote(unassigned, 'L')).toBe(true)
    expect(isPracticedNote(left, 'R')).toBe(false)
    expect(isPracticedNote(right, 'R')).toBe(true)
    expect(isPracticedNote(left, 'both')).toBe(true)
  })

  it('returns the very same array when nothing is silenced, so audio is not restarted', () => {
    expect(audibleNotesFor(notes, 'both', false)).toBe(notes)
    expect(audibleNotesFor(notes, 'R', true)).toBe(notes)
  })

  it('drops only the other hand when its sound is switched off', () => {
    expect(audibleNotesFor(notes, 'R', false)).toEqual([right, unassigned])
    expect(audibleNotesFor(notes, 'L', false)).toEqual([left, unassigned])
  })

  it('treats a hand the converter only guessed as unassigned', () => {
    const guessed: FallingNote = { midi: 50, start: 2, duration: 1, hand: 'L', handSource: 'inferred' }
    expect(isPracticedNote(guessed, 'R')).toBe(true)
    expect(audibleNotesFor([right, guessed], 'R', false)).toEqual([right, guessed])
    // Guesses alone never make a score "two-handed".
    expect(hasBothHands([right, guessed])).toBe(false)
  })

  it('strips fingering of the other hand for the score, keeping every note and its index', () => {
    const fingered = [{ ...right, finger: 2 as const }, { ...left, finger: 4 as const }, unassigned]
    expect(annotationNotesFor(fingered, 'both')).toBe(fingered)
    const annotated = annotationNotesFor(fingered, 'R')
    expect(annotated).toHaveLength(3)
    expect(annotated.map(note => note.finger)).toEqual([2, undefined, undefined])
    expect(annotated[1].midi).toBe(48)
  })
})
