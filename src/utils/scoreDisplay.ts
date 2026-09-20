import type { ScoreArtifact } from '@/types/scoreArtifact'
import type { FallingNote } from '@/types/fallingNotes'

/** Render-time copy only: stored recognition output and playback notes stay intact. */
export function annotateScoreFingering(artifact: ScoreArtifact, notes: FallingNote[]): Document {
  if (/<!DOCTYPE|<!ENTITY/i.test(artifact.musicxml)) throw new Error('Unsafe MusicXML')
  const doc = new DOMParser().parseFromString(artifact.musicxml, 'application/xml')
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'score-partwise') throw new Error('Invalid MusicXML')
  // OSMD consumes XML as notation, never HTML. Remove external resource links.
  doc.querySelectorAll('image,link,opus').forEach(element => element.remove())
  doc.querySelectorAll('fingering').forEach(element => element.remove())
  const elements = new Map(Array.from(doc.querySelectorAll('note[id]')).map(element => [element.getAttribute('id'), element]))
  for (const mapping of artifact.notes) {
    const element = elements.get(mapping.xmlId)
    const finger = notes[mapping.noteIndex]?.finger
    if (!element || !finger) continue
    let notations = element.querySelector('notations')
    if (!notations) { notations = doc.createElement('notations'); element.appendChild(notations) }
    let technical = notations.querySelector('technical')
    if (!technical) { technical = doc.createElement('technical'); notations.appendChild(technical) }
    const fingering = doc.createElement('fingering')
    fingering.textContent = String(finger)
    technical.appendChild(fingering)
  }
  return doc
}

/** Saved tempo edits uniformly rescale canonical seconds; speed is already in the playhead. */
export function activeScoreMeasure(artifact: ScoreArtifact, currentTime: number, timingReferenceBpm: number): number {
  const time = currentTime * timingReferenceBpm / artifact.timingReferenceBpm
  const measures = artifact.measures.filter(measure => measure.partIndex === 0)
  if (!measures.length) return -1
  let low = 0
  let high = measures.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (measures[mid].start <= time) low = mid + 1
    else high = mid
  }
  return measures[Math.max(0, low - 1)].measureIndex
}
