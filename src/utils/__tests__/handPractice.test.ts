import { audibleNotesFor, hasBothHands, isPracticedNote, otherHand } from '../handPractice'
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
})
