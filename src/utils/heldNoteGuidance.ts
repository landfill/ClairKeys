import type { FallingNote } from '@/types/fallingNotes'
import { maxReach } from './handReach'

// Canonical seconds are rounded to six decimals. A rounding sliver should not
// turn an ordinary release into a suggested pedal/sustaining passage.
const TIME_EPSILON = 0.00001

/**
 * Suggest when to free a previously occupied finger for a later onset. This is
 * a player-only articulation hint, not a change to musical duration or pedal
 * notation. The original finger assignments and their provenance stay intact.
 */
export function addKeyReleaseGuidance(notes: FallingNote[]): FallingNote[] {
  const result = notes.map(note => ({ ...note }))
  for (const hand of ['L', 'R']) {
    const events = new Map<number, FallingNote[]>()
    for (const note of result) {
      if (note.hand !== hand) continue
      const event = events.get(note.start) ?? []
      event.push(note)
      events.set(note.start, event)
    }
    let held: FallingNote[] = []
    for (const [start, incoming] of [...events.entries()].sort(([a], [b]) => a-b)) {
      held = held.filter(note => (note.keyRelease ?? note.start + note.duration) > start + TIME_EPSILON)
      for (const previous of held) {
        if (previous.start >= start - TIME_EPSILON) continue
        const conflict = incoming.some(note => previous.midi === note.midi || (
          previous.finger !== undefined && note.finger !== undefined
          && Math.abs(previous.midi - note.midi) > maxReach(previous.finger, note.finger)
        ))
        if (conflict) previous.keyRelease = start
      }
      held = held.filter(note => (note.keyRelease ?? note.start + note.duration) > start + TIME_EPSILON)
      held.push(...incoming)
    }
  }
  return result
}
