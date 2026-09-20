import { annotateScoreFingering, activeScoreMeasure } from '../scoreDisplay'
import type { ScoreArtifact } from '@/types/scoreArtifact'
const artifact: ScoreArtifact = {
  version: 1, timingReferenceBpm: 60,
  musicxml: '<score-partwise><part id="P1"><measure number="1"><note id="n0"><pitch><step>C</step><octave>4</octave></pitch><notations><technical><fingering>5</fingering></technical></notations></note></measure><measure number="2"><note id="n1"><pitch><step>C</step><octave>4</octave></pitch><tie type="stop"/></note></measure></part></score-partwise>',
  measures: [
    { partIndex: 0, measureIndex: 0, start: 0, end: 4, startQuarter: 0, endQuarter: 4 },
    { partIndex: 0, measureIndex: 1, start: 4, end: 6, startQuarter: 4, endQuarter: 8 },
  ],
  notes: [{ xmlId: 'n0', noteIndex: 0 }, { xmlId: 'n1', noteIndex: 0 }],
}
describe('score playback display', () => {
  it('uses the exact player finger on original and tied continuation, replacing source finger', () => {
    const doc = annotateScoreFingering(artifact, [{ midi: 60, start: 0, duration: 6, finger: 2, hand: 'R' }])
    expect(Array.from(doc.querySelectorAll('fingering')).map(n => n.textContent)).toEqual(['2', '2'])
    expect(doc.querySelector('tie')?.getAttribute('type')).toBe('stop')
  })
  it('preserves time map through pauses, seeks, end and saved tempo scaling', () => {
    expect(activeScoreMeasure(artifact, 3.999, 60)).toBe(0)
    expect(activeScoreMeasure(artifact, 4, 60)).toBe(1)
    expect(activeScoreMeasure(artifact, 2, 120)).toBe(1)
    expect(activeScoreMeasure(artifact, 3, 120)).toBe(1)
    expect(activeScoreMeasure(artifact, 0, 120)).toBe(0)
  })
  it('does not display unrelated source fingering when player lacks a matching note', () => {
    expect(annotateScoreFingering(artifact, []).querySelectorAll('fingering')).toHaveLength(0)
  })
  it('rejects malformed XML and external resource markup', () => {
    expect(() => annotateScoreFingering({ ...artifact, musicxml: '<score-partwise>' }, [])).toThrow()
    expect(() => annotateScoreFingering({ ...artifact, musicxml: '<!DOCTYPE score-partwise SYSTEM "https://x"><score-partwise/>' }, [])).toThrow()
  })
})
