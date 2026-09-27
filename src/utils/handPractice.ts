import type { FallingNote, Hand } from '@/types/fallingNotes'

/** Which hand the reader is practising. `both` is ordinary playback. */
export type PracticeHand = 'both' | Hand

/** A hand choice only means something when the score assigns notes to both hands. */
export function hasBothHands(notes: FallingNote[]): boolean {
  let left = false
  let right = false
  for (const note of notes) {
    if (note.handSource === 'inferred') continue
    if (note.hand === 'L') left = true
    else if (note.hand === 'R') right = true
    if (left && right) return true
  }
  return false
}

export function otherHand(practice: PracticeHand): Hand | null {
  if (practice === 'both') return null
  return practice === 'L' ? 'R' : 'L'
}

/**
 * Notes without a hand from the score stay in every mode — including those
 * the player boundary filled with a guess: nobody knows whose they are, and
 * hiding them would drop music the reader may have to play.
 */
export function isPracticedNote(note: FallingNote, practice: PracticeHand): boolean {
  const other = otherHand(practice)
  return other === null || note.handSource === 'inferred' || note.hand !== other
}

/**
 * The notes the audio should schedule. The original array is returned whenever
 * nothing is silenced, so an unchanged choice never looks like a new set and
 * never restarts sounding audio.
 */
export function audibleNotesFor(
  notes: FallingNote[],
  practice: PracticeHand,
  otherHandAudible: boolean
): FallingNote[] {
  if (practice === 'both' || otherHandAudible) return notes
  return notes.filter(note => isPracticedNote(note, practice))
}

/**
 * The notes the score panel annotates. Its fingering is looked up by note
 * index, so the array keeps every note and only drops the other hand's finger.
 */
export function annotationNotesFor(notes: FallingNote[], practice: PracticeHand): FallingNote[] {
  if (practice === 'both') return notes
  return notes.map(note => (isPracticedNote(note, practice) ? note : { ...note, finger: undefined }))
}
