import {
  beatUnitQuarters,
  beatsPerBar,
  beatsFromScoreArtifact,
  constantBeats,
  countInClicks,
  metronomeSource,
} from '../beatGrid'
import type { ScoreArtifact } from '@/types/scoreArtifact'

const artifact = (measures: ScoreArtifact['measures'], timingReferenceBpm = 60): ScoreArtifact => ({
  version: 1,
  musicxml: '<score-partwise/>',
  timingReferenceBpm,
  measures,
  notes: [],
})

const m = (measureIndex: number, start: number, end: number, startQuarter: number, endQuarter: number, partIndex = 0) =>
  ({ partIndex, measureIndex, start, end, startQuarter, endQuarter })

describe('meter', () => {
  it('beats in quarters for simple meters and dotted quarters for compound ones', () => {
    expect(beatUnitQuarters('4/4')).toBe(1)
    expect(beatUnitQuarters('3/4')).toBe(1)
    expect(beatUnitQuarters('2/2')).toBe(2)
    expect(beatUnitQuarters('3/8')).toBe(0.5)
    expect(beatUnitQuarters('6/8')).toBe(1.5)
    expect(beatUnitQuarters('9/8')).toBe(1.5)
    expect(beatUnitQuarters('12/8')).toBe(1.5)
    expect(beatUnitQuarters('nonsense')).toBe(1)
  })

  it('counts the beats a bar is felt in', () => {
    expect(beatsPerBar('4/4')).toBe(4)
    expect(beatsPerBar('3/4')).toBe(3)
    expect(beatsPerBar('9/8')).toBe(3)
    expect(beatsPerBar('6/8')).toBe(2)
    expect(beatsPerBar('nonsense')).toBe(4)
  })
})

describe('beatsFromScoreArtifact', () => {
  it('places beats inside each measure and accents the downbeat, following tempo changes', () => {
    // Two 4/4 bars: the second is twice as slow.
    const beats = beatsFromScoreArtifact(artifact([m(0, 0, 4, 0, 4), m(1, 4, 12, 4, 8)]), 60, '4/4')
    expect(beats.map(b => b.time)).toEqual([0, 1, 2, 3, 4, 6, 8, 10])
    expect(beats.map(b => b.accent)).toEqual([true, false, false, false, true, false, false, false])
  })

  it('reads only the first part and converts to the animation timing reference', () => {
    const beats = beatsFromScoreArtifact(
      artifact([m(0, 0, 4, 0, 4), m(0, 0, 4, 0, 4, 1)], 60),
      120,
      '4/4'
    )
    // Artifact seconds at 60 BPM become animation seconds at 120 BPM.
    expect(beats.map(b => b.time)).toEqual([0, 0.5, 1, 1.5])
  })

  it('counts a pickup bar from its virtual downbeat, so it carries no accent', () => {
    const beats = beatsFromScoreArtifact(artifact([m(0, 0, 1, 0, 1), m(1, 1, 5, 1, 5)]), 60, '4/4')
    expect(beats).toEqual([
      { time: 0, accent: false },
      { time: 1, accent: true },
      { time: 2, accent: false },
      { time: 3, accent: false },
      { time: 4, accent: false },
    ])
  })

  it('gives no clicks to a bar whose tempo changes partway, since its beats cannot be placed', () => {
    // Bar 2 turns 60 → 120 BPM after two quarters; its end points hide that.
    const xml = `<score-partwise version="4.0"><part id="P1">
      <measure number="1"><direction><sound tempo="60"/></direction><note><duration>4</duration></note></measure>
      <measure number="2"><note><duration>2</duration></note><direction><sound tempo="120"/></direction><note><duration>2</duration></note></measure>
      <measure number="3"><direction placement="above"><sound tempo="120"/></direction><note><duration>4</duration></note></measure>
    </part></score-partwise>`
    const beats = beatsFromScoreArtifact(
      { ...artifact([m(0, 0, 4, 0, 4), m(1, 4, 7, 4, 8), m(2, 7, 9, 8, 12)]), musicxml: xml },
      60,
      '4/4'
    )
    expect(beats.map(b => b.time)).toEqual([0, 1, 2, 3, 7, 7.5, 8, 8.5])
  })

  it('uses dotted-quarter beats in compound time', () => {
    const beats = beatsFromScoreArtifact(artifact([m(0, 0, 4.5, 0, 4.5)]), 60, '9/8')
    expect(beats.map(b => b.time)).toEqual([0, 1.5, 3])
  })
})

describe('constantBeats', () => {
  it('lays an unaccented grid from zero to the end at the reference tempo', () => {
    expect(constantBeats(2.1, 120, '4/4')).toEqual([
      { time: 0, accent: false },
      { time: 0.5, accent: false },
      { time: 1, accent: false },
      { time: 1.5, accent: false },
      { time: 2, accent: false },
    ])
  })
})

describe('metronomeSource', () => {
  it('prefers the score measures, whatever the tempo source', () => {
    expect(metronomeSource('score', true)).toBe('score')
    expect(metronomeSource('user', true)).toBe('score')
  })

  it('trusts a constant grid only where the seconds were baked at one tempo', () => {
    expect(metronomeSource('user', false)).toBe('constant')
    expect(metronomeSource('unknown', false)).toBe('constant')
    // A score-read tempo may change bar by bar (D-013); without measures the
    // clicks would drift away from the notes.
    expect(metronomeSource('score', false)).toBeNull()
  })
})

describe('countInClicks', () => {
  const grid = [0, 1, 2, 3, 4, 6, 8, 10].map((time, index) => ({ time, accent: index % 4 === 0 }))

  it('counts one bar in at the local beat length, ending where playback resumes', () => {
    expect(countInClicks(grid, 0, 4, 1)).toEqual([
      { time: -4, accent: true },
      { time: -3, accent: false },
      { time: -2, accent: false },
      { time: -1, accent: false },
    ])
    // Resuming in the slower bar counts in at its two-second beat.
    expect(countInClicks(grid, 6, 4, 1).map(c => c.time)).toEqual([-2, 0, 2, 4])
  })

  it('falls back to the reference beat when the grid is empty', () => {
    expect(countInClicks([], 5, 3, 0.5).map(c => c.time)).toEqual([3.5, 4, 4.5])
  })
})
