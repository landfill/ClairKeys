import { annotateScoreFingering, activeScoreMeasure } from '../scoreDisplay'
import { isScoreArtifact, type ScoreArtifact } from '@/types/scoreArtifact'
import type { FallingNote } from '@/types/fallingNotes'

describe('Independent score review verification (Issue #125)', () => {
  const sampleArtifact: ScoreArtifact = {
    version: 1,
    timingReferenceBpm: 60,
    musicxml: `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part id="P1">
    <measure number="1">
      <note id="n1">
        <pitch><step>C</step><octave>4</octave></pitch>
        <notations><technical><fingering>1</fingering></technical></notations>
      </note>
      <note id="n2">
        <pitch><step>E</step><octave>4</octave></pitch>
      </note>
    </measure>
    <measure number="2">
      <note id="n3_tie_start">
        <pitch><step>G</step><octave>4</octave></pitch>
        <tie type="start"/>
        <notations><tied type="start"/><technical><fingering>3</fingering></technical></notations>
      </note>
    </measure>
    <measure number="3">
      <note id="n3_tie_stop">
        <pitch><step>G</step><octave>4</octave></pitch>
        <tie type="stop"/>
        <notations><tied type="stop"/></notations>
      </note>
    </measure>
  </part>
</score-partwise>`,
    measures: [
      { partIndex: 0, measureIndex: 0, start: 0, end: 4, startQuarter: 0, endQuarter: 4 },
      { partIndex: 0, measureIndex: 1, start: 4, end: 8, startQuarter: 4, endQuarter: 8 },
      { partIndex: 0, measureIndex: 2, start: 8, end: 12, startQuarter: 8, endQuarter: 12 },
    ],
    notes: [
      { xmlId: 'n1', noteIndex: 0 },
      { xmlId: 'n2', noteIndex: 1 },
      { xmlId: 'n3_tie_start', noteIndex: 2 },
      { xmlId: 'n3_tie_stop', noteIndex: 2 },
    ],
  }

  describe('MusicXML Security & Sanitization', () => {
    it('rejects MusicXML with DOCTYPE / entity injection attempts', () => {
      const maliciousPayloads = [
        '<!DOCTYPE score-partwise SYSTEM "http://malicious.org/xxe"><score-partwise><part id="P1"/></score-partwise>',
        '<!DOCTYPE score-partwise [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><score-partwise><part id="P1">&xxe;</part></score-partwise>',
        '<!ENTITY secret "stolen"><score-partwise><part id="P1"/></score-partwise>',
      ]

      for (const xml of maliciousPayloads) {
        expect(isScoreArtifact({ ...sampleArtifact, musicxml: xml })).toBe(false)
        expect(() => annotateScoreFingering({ ...sampleArtifact, musicxml: xml }, [])).toThrow('Unsafe MusicXML')
      }
    })

    it('strips external resource tags like image, link, and opus', () => {
      const xmlWithExternalResources = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part id="P1">
    <measure number="1">
      <image source="https://evil.example.com/pixel.png"/>
      <link href="javascript:alert(1)"/>
      <opus href="https://evil.example.com/sheet.xml"/>
      <note id="n1"><pitch><step>C</step><octave>4</octave></pitch></note>
    </measure>
  </part>
</score-partwise>`

      const doc = annotateScoreFingering({ ...sampleArtifact, musicxml: xmlWithExternalResources }, [
        { midi: 60, start: 0, duration: 1, finger: 5, hand: 'R' },
      ])

      expect(doc.querySelectorAll('image').length).toBe(0)
      expect(doc.querySelectorAll('link').length).toBe(0)
      expect(doc.querySelectorAll('opus').length).toBe(0)
      expect(doc.querySelector('note[id="n1"]')).not.toBeNull()
    })

    it('rejects non-partwise MusicXML root element such as score-timewise', () => {
      const timewise = `<score-timewise><part id="P1"/></score-timewise>`
      expect(isScoreArtifact({ ...sampleArtifact, musicxml: timewise })).toBe(false)
      expect(() => annotateScoreFingering({ ...sampleArtifact, musicxml: timewise }, [])).toThrow()
    })
  })

  describe('Computed Fingering Alignment & Tied Notes', () => {
    it('overrides source fingerings with player-computed fingerings', () => {
      const playerNotes: FallingNote[] = [
        { midi: 60, start: 0, duration: 2, finger: 2, hand: 'R' }, // Note n1 (source had finger 1)
        { midi: 64, start: 2, duration: 2, finger: 4, hand: 'R' }, // Note n2 (source had no finger)
        { midi: 67, start: 4, duration: 8, finger: 5, hand: 'R' }, // Note n3 tied across measures 2 & 3
      ]

      const doc = annotateScoreFingering(sampleArtifact, playerNotes)

      // n1 should have finger 2 (not original 1)
      const n1Finger = doc.querySelector('note[id="n1"] fingering')
      expect(n1Finger?.textContent).toBe('2')

      // n2 should have finger 4 added
      const n2Finger = doc.querySelector('note[id="n2"] fingering')
      expect(n2Finger?.textContent).toBe('4')

      // Tied notes: both tie start and tie stop should have finger 5
      const n3StartFinger = doc.querySelector('note[id="n3_tie_start"] fingering')
      const n3StopFinger = doc.querySelector('note[id="n3_tie_stop"] fingering')
      expect(n3StartFinger?.textContent).toBe('5')
      expect(n3StopFinger?.textContent).toBe('5')
    })

    it('does not insert fingering when player note has undefined finger', () => {
      const playerNotesWithoutFinger: FallingNote[] = [
        { midi: 60, start: 0, duration: 2, hand: 'R' }, // finger is undefined
      ]

      const doc = annotateScoreFingering(sampleArtifact, playerNotesWithoutFinger)
      const n1Finger = doc.querySelector('note[id="n1"] fingering')
      expect(n1Finger).toBeNull()
    })

    it('handles gap notes safely when mapping points beyond player notes array', () => {
      const doc = annotateScoreFingering(sampleArtifact, [])
      expect(doc.querySelectorAll('fingering').length).toBe(0)
    })
  })

  describe('Measure Navigation & Playback Timing Synchronization', () => {
    it('maps currentTime precisely across measures in 1x speed', () => {
      // 60 BPM -> 1 beat = 1 second
      // measure 0: 0s to 4s
      // measure 1: 4s to 8s
      // measure 2: 8s to 12s
      expect(activeScoreMeasure(sampleArtifact, 0, 60)).toBe(0)
      expect(activeScoreMeasure(sampleArtifact, 2.5, 60)).toBe(0)
      expect(activeScoreMeasure(sampleArtifact, 3.999, 60)).toBe(0)
      expect(activeScoreMeasure(sampleArtifact, 4.0, 60)).toBe(1)
      expect(activeScoreMeasure(sampleArtifact, 7.999, 60)).toBe(1)
      expect(activeScoreMeasure(sampleArtifact, 8.0, 60)).toBe(2)
      expect(activeScoreMeasure(sampleArtifact, 11.5, 60)).toBe(2)
      expect(activeScoreMeasure(sampleArtifact, 20.0, 60)).toBe(2) // past end stays at last measure
    })

    it('clamps negative currentTime to measure 0 safely', () => {
      expect(activeScoreMeasure(sampleArtifact, -2, 60)).toBe(0)
      expect(activeScoreMeasure(sampleArtifact, -0.001, 60)).toBe(0)
    })

    it('rescales time correctly when user saved tempo differs from timingReferenceBpm', () => {
      // artifact has timingReferenceBpm = 60
      // User saved tempo (animationData.timingReferenceBpm) = 120 (twice as fast in canonical time)
      // time = currentTime * 120 / 60 = currentTime * 2
      // At currentTime = 2.0s: time = 4.0s -> measure 1
      expect(activeScoreMeasure(sampleArtifact, 2.0, 120)).toBe(1)
      // At currentTime = 4.0s: time = 8.0s -> measure 2
      expect(activeScoreMeasure(sampleArtifact, 4.0, 120)).toBe(2)

      // Conversely, halved tempo = 30
      // time = currentTime * 30 / 60 = currentTime * 0.5
      // At currentTime = 6.0s: time = 3.0s -> measure 0
      expect(activeScoreMeasure(sampleArtifact, 6.0, 30)).toBe(0)
      // At currentTime = 8.0s: time = 4.0s -> measure 1
      expect(activeScoreMeasure(sampleArtifact, 8.0, 30)).toBe(1)
    })

    it('returns -1 when measures array has no partIndex === 0', () => {
      const artifactNoPart0: ScoreArtifact = {
        ...sampleArtifact,
        measures: [{ partIndex: 1, measureIndex: 0, start: 0, end: 4, startQuarter: 0, endQuarter: 4 }],
      }
      expect(activeScoreMeasure(artifactNoPart0, 2.0, 60)).toBe(-1)
    })
  })

  describe('isScoreArtifact Schema Validation Boundaries', () => {
    it('accepts valid score artifact payload', () => {
      expect(isScoreArtifact(sampleArtifact)).toBe(true)
    })

    it('rejects invalid timingReferenceBpm (zero, negative, NaN)', () => {
      expect(isScoreArtifact({ ...sampleArtifact, timingReferenceBpm: 0 })).toBe(false)
      expect(isScoreArtifact({ ...sampleArtifact, timingReferenceBpm: -60 })).toBe(false)
      expect(isScoreArtifact({ ...sampleArtifact, timingReferenceBpm: NaN })).toBe(false)
    })

    it('rejects inverted measure start and end (end < start)', () => {
      const invertedMeasures = [
        { partIndex: 0, measureIndex: 0, start: 5, end: 4, startQuarter: 0, endQuarter: 4 },
      ]
      expect(isScoreArtifact({ ...sampleArtifact, measures: invertedMeasures })).toBe(false)
    })

    it('rejects malformed xmlId in notes mapping', () => {
      const badNotes = [
        { xmlId: '1bad_starts_with_digit', noteIndex: 0 },
      ]
      expect(isScoreArtifact({ ...sampleArtifact, notes: badNotes })).toBe(false)
    })
  })
})
