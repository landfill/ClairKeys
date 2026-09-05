import fs from 'node:fs'
import path from 'node:path'
import { normalizeAnimationData } from '../animationContract'
import { canonicalToFallingNotes } from '../dataConverter'
import { chordIsReachable } from '../handReach'
import { getActiveNotes, notesToVisualNotes } from '../visualUtils'
import { addFingeringToNotes } from '../fingeringUtils'
import { addKeyReleaseGuidance } from '../heldNoteGuidance'

const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'fixtures/fingering/gymnopedie-283.json'), 'utf8'))
const score = normalizeAnimationData(raw)

describe('issue #135 held-note guidance', () => {
  it('releases the bass before a later unreachable chord without shortening the music', () => {
    const notes = canonicalToFallingNotes(score)
    expect(getActiveNotes(notes, 0.8).filter(n => n.hand === 'L').map(n => n.midi)).toEqual([59, 62, 66])
    expect(getActiveNotes(notes, 3.2).filter(n => n.hand === 'L').map(n => n.midi)).toEqual([57, 61, 66])
    expect(notes.map(n => [n.midi, n.start, n.duration])).toEqual(score.notes.map(n => [n.midi, n.start, n.duration]))
  })

  it('does not demand unreachable simultaneous finger holds anywhere in the real corpus', () => {
    const notes = canonicalToFallingNotes(score)
    for (const start of new Set(notes.map(n => n.start))) {
      for (const hand of ['L', 'R']) {
        const active = getActiveNotes(notes, start + 0.00001).filter(n => n.hand === hand).sort((a,b) => a.midi-b.midi)
        expect(chordIsReachable(active.map(n => n.midi), active.map(n => n.finger!))).toBe(true)
      }
    }
  })

  it('preserves a playable overlap and all source fingering', () => {
    const original = normalizeAnimationData({ ...raw, notes: [
      { midi: 60, start: 0, duration: 2, hand: 'R', finger: 1 },
      { midi: 64, start: 1, duration: 1, hand: 'R', finger: 3 },
    ] })
    const notes = canonicalToFallingNotes(original)
    expect(getActiveNotes(notes, 1.5)).toHaveLength(2)
    expect(notes.map(n => [n.finger, n.fingerSource])).toEqual([[1, 'source'], [3, 'source']])
  })

  it('keeps the original and all existing inferred fingers intact and is idempotent', () => {
    const before = JSON.stringify(score)
    const originalFingers = addFingeringToNotes(score.notes)
    const notes = canonicalToFallingNotes(score)
    expect(notes.map(n => [n.finger, n.fingerSource, n.fingeringAlgorithm]))
      .toEqual(originalFingers.map(n => [n.finger, n.fingerSource, n.fingeringAlgorithm]))
    expect(JSON.stringify(score)).toBe(before)
    expect(addKeyReleaseGuidance(notes)).toEqual(notes)
  })

  it('does not split a simultaneous chord or move releases across hands', () => {
    const notes = addKeyReleaseGuidance([
      { midi: 43, start: 0, duration: 3, hand: 'L', finger: 5 },
      { midi: 66, start: 0, duration: 3, hand: 'L', finger: 1 },
      { midi: 70, start: 1, duration: 1, hand: 'R', finger: 5 },
    ])
    expect(notes.every(note => note.keyRelease === undefined)).toBe(true)
  })

  it('draws the continuing sound separately without a second finger number', () => {
    const notes = canonicalToFallingNotes(score).filter(n => n.midi === 43 && n.start === 0)
    const layout = { byMidi: new Map([[43, { x: 0, w: 20, black: false }]]), totalWidth: 20, keyWidth: 20 }
    const visual = notesToVisualNotes(notes, 0, 100, 400, layout)
    expect(visual).toHaveLength(2)
    expect(visual.filter(n => n.finger !== undefined)).toHaveLength(1)
    expect(visual.reduce((sum,n) => sum+n.h, 0)).toBeCloseTo(236.8421, 4)
  })

  it('does not show an ended key as still pressed at the next exact onset', () => {
    expect(getActiveNotes([{ midi: 60, start: 0, duration: 1 }, { midi: 62, start: 1, duration: 1 }], 1).map(n => n.midi)).toEqual([62])
  })
})
