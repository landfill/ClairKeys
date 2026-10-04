import { execFileSync } from 'child_process'
import { COURSE_PIECES, getCoursePiece } from '../course'
import { canonicalToFallingNotes } from '@/utils/dataConverter'

it('regenerates the committed assets from MusicXML without OMR or a database', () => {
  expect(() => execFileSync(process.env.PYTHON_BIN || 'python3', ['scripts/build-learn-course.py', '--check'], { timeout: 30000, stdio: 'pipe' })).not.toThrow()
})

it.each([
  ['right-hand', [60, 62, 64, 65, 67, 64, 62, 60], 'R', [1, 2, 3, 4, 5, 3, 2, 1]],
  ['left-hand', [48, 50, 52, 53, 55, 52, 50, 48], 'L', [5, 4, 3, 2, 1, 3, 4, 5]],
] as const)('%s matches the authored pitches, seconds, hand and fingers', (slug, pitches, hand, fingers) => {
  const piece = getCoursePiece(slug)!
  expect(piece.data.tempoSource).toBe('score')
  expect(piece.data.notes.map(note => [note.midi, note.start, note.duration, note.hand, note.finger]))
    .toEqual(pitches.map((midi, index) => [midi, index, 1, hand, fingers[index]]))
  expect(canonicalToFallingNotes(piece.data).every(note => note.fingerSource === 'source' && note.handSource === 'source')).toBe(true)
})

it('preserves simultaneous hands and sustained left notes in the final piece', () => {
  const notes = getCoursePiece('both-hands')!.data.notes
  expect(notes.filter(note => note.hand === 'R').map(note => [note.midi, note.start, note.duration, note.finger]))
    .toEqual([60,62,64,65,67,64,62,60].map((midi, i) => [midi, i, 1, [1,2,3,4,5,3,2,1][i]]))
  expect(notes.filter(note => note.hand === 'L').map(note => [note.midi, note.start, note.duration, note.finger]))
    .toEqual([[48, 0, 4, 5], [55, 4, 4, 1]])
  expect(COURSE_PIECES).toHaveLength(3)
  expect(getCoursePiece('missing')).toBeUndefined()
})
