/**
 * Tests for the canonical animation contract validator/normalizer.
 *
 * Covers the P0-A completion criteria: legacy/old JSON validates without a cast,
 * every supported shape normalizes to the canonical MIDI family, and malformed
 * input is a hard error rather than a silent collapse to middle C (the failure
 * documented in the shape audit).
 */

import {
  normalizeAnimationData,
  parsePitchToMidi,
  isValidAnimationData,
  AnimationContractError,
} from '../animationContract'
import { ANIMATION_CONTRACT_VERSION } from '@/types/animationContract'

describe('parsePitchToMidi', () => {
  it('parses natural, sharp, and flat pitches', () => {
    expect(parsePitchToMidi('C4')).toBe(60)
    expect(parsePitchToMidi('A0')).toBe(21)
    expect(parsePitchToMidi('C8')).toBe(108)
    expect(parsePitchToMidi('F#5')).toBe(78)
    expect(parsePitchToMidi('Bb3')).toBe(58)
  })

  it('returns null for malformed names (no default-to-60)', () => {
    expect(parsePitchToMidi('H4')).toBeNull()
    expect(parsePitchToMidi('C')).toBeNull()
    expect(parsePitchToMidi('')).toBeNull()
    expect(parsePitchToMidi('60')).toBeNull()
  })
})

describe('normalizeAnimationData — canonical (MIDI family)', () => {
  it('passes a canonical document through, preserving voice/staff', () => {
    const canonical = {
      version: '1.0',
      title: 'Etude',
      composer: 'Anon',
      duration: 1.0,
      tempo: 90,
      timeSignature: '3/4',
      notes: [
        { midi: 60, start: 0, duration: 0.5, hand: 'R', velocity: 0.7, finger: 1, voice: 1, staff: 1 },
        { midi: 48, start: 0, duration: 1.0, hand: 'L', voice: 1, staff: 2 },
      ],
    }

    const out = normalizeAnimationData(canonical)

    expect(out.title).toBe('Etude')
    expect(out.timeSignature).toBe('3/4')
    expect(out.notes).toHaveLength(2)
    expect(out.notes[0]).toMatchObject({ midi: 60, start: 0, duration: 0.5, hand: 'R', voice: 1, staff: 1 })
    expect(out.notes[1]).toMatchObject({ midi: 48, hand: 'L', staff: 2 })
  })
})

describe('normalizeAnimationData — legacy Shape A (string pitch)', () => {
  it('converts note/startTime/left-right to midi/start/L-R', () => {
    const legacy = {
      version: '1.0',
      title: 'Old Sheet',
      composer: 'Someone',
      duration: 2,
      tempo: 120,
      timeSignature: '4/4',
      notes: [
        { note: 'C4', startTime: 0, duration: 0.5, velocity: 0.8, hand: 'right', finger: 2 },
        { note: 'F#3', startTime: 0.5, duration: 0.5, hand: 'left' },
      ],
    }

    const out = normalizeAnimationData(legacy)

    expect(out.notes[0]).toMatchObject({ midi: 60, start: 0, duration: 0.5, hand: 'R', velocity: 0.8, finger: 2 })
    expect(out.notes[1]).toMatchObject({ midi: 54, start: 0.5, hand: 'L' })
    // The old converter would have collapsed an unreadable field to 60/undefined;
    // here a real pitch is preserved and the onset comes from startTime.
  })
})

describe('normalizeAnimationData — converter.py shape (fields under metadata)', () => {
  it('pulls title/composer/keySignature from metadata and fills defaults', () => {
    const shapeC = {
      metadata: { title: 'OMR Piece', composer: 'Bach', keySignature: 'G' },
      notes: [{ midi: 67, start: 0, duration: 1.0, hand: 'R', finger: 3 }],
      duration: 1.0,
      tempo: 100,
      timeSignature: '4/4',
      generated_at: '2026-07-21T00:00:00Z',
    }

    const out = normalizeAnimationData(shapeC)

    expect(out.title).toBe('OMR Piece')
    expect(out.composer).toBe('Bach')
    expect(out.keySignature).toBe('G')
    expect(out.version).toBe(ANIMATION_CONTRACT_VERSION) // no version in Shape C → filled
    expect(out.notes[0]).toMatchObject({ midi: 67, hand: 'R', finger: 3 })
  })
})

describe('normalizeAnimationData — hard errors (no silent fallback)', () => {
  it('throws when a pitch is unreadable instead of defaulting to middle C', () => {
    const bad = { notes: [{ note: 'H9', start: 0, duration: 0.5 }] }
    expect(() => normalizeAnimationData(bad)).toThrow(AnimationContractError)
    expect(() => normalizeAnimationData(bad)).toThrow(/not a valid pitch/)
  })

  it('throws when MIDI is outside the piano range', () => {
    const bad = { notes: [{ midi: 5, start: 0, duration: 0.5 }] }
    expect(() => normalizeAnimationData(bad)).toThrow(/outside the piano range/)
  })

  it('throws when start/duration is missing or non-finite', () => {
    expect(() => normalizeAnimationData({ notes: [{ midi: 60, duration: 0.5 }] })).toThrow(/start/)
    expect(() => normalizeAnimationData({ notes: [{ midi: 60, start: 0 }] })).toThrow(/duration/)
    expect(() => normalizeAnimationData({ notes: [{ midi: 60, start: NaN, duration: 1 }] })).toThrow(/start/)
  })

  it('throws when there is no notes array', () => {
    expect(() => normalizeAnimationData({ title: 'x' })).toThrow(/notes/)
  })

  it('throws for a non-object document', () => {
    expect(() => normalizeAnimationData(null)).toThrow(AnimationContractError)
    expect(() => normalizeAnimationData('nope')).toThrow(/must be an object/)
  })
})

describe('normalizeAnimationData — defaults', () => {
  it('derives duration from notes when absent and fills tempo/timeSignature', () => {
    const out = normalizeAnimationData({
      notes: [{ midi: 60, start: 1, duration: 0.5 }],
    })
    expect(out.duration).toBeCloseTo(1.5)
    expect(out.tempo).toBe(120)
    expect(out.timeSignature).toBe('4/4')
    expect(out.title).toBe('Untitled')
  })
})

describe('normalizeAnimationData — field guards (PR #23 review)', () => {
  it('clamps velocity into 0–1', () => {
    const out = normalizeAnimationData({
      notes: [
        { midi: 60, start: 0, duration: 1, velocity: 5 },
        { midi: 62, start: 1, duration: 1, velocity: -2 },
      ],
    })
    expect(out.notes[0].velocity).toBe(1)
    expect(out.notes[1].velocity).toBe(0)
  })

  it('rejects a non-integer finger string like "3.5"', () => {
    const out = normalizeAnimationData({ notes: [{ midi: 60, start: 0, duration: 1, finger: '3.5' }] })
    expect(out.notes[0].finger).toBeUndefined()
  })

  it('ignores voice/staff below 1', () => {
    const out = normalizeAnimationData({ notes: [{ midi: 60, start: 0, duration: 1, voice: 0, staff: -1 }] })
    expect(out.notes[0].voice).toBeUndefined()
    expect(out.notes[0].staff).toBeUndefined()
  })

  it('rejects an unknown declared contract version but allows a missing one', () => {
    // Declared future version → reject (would otherwise render with v1 semantics).
    expect(() => normalizeAnimationData({ version: '2.0', notes: [{ midi: 60, start: 0, duration: 1 }] })).toThrow(
      /unsupported animation contract version/
    )
    // Missing version → allowed (legacy / converter.py), filled with current.
    expect(normalizeAnimationData({ notes: [{ midi: 60, start: 0, duration: 1 }] }).version).toBe(
      ANIMATION_CONTRACT_VERSION
    )
  })

  it('falls back to a default tempo when tempo <= 0', () => {
    expect(normalizeAnimationData({ tempo: 0, notes: [{ midi: 60, start: 0, duration: 1 }] }).tempo).toBe(120)
    expect(normalizeAnimationData({ tempo: -60, notes: [{ midi: 60, start: 0, duration: 1 }] }).tempo).toBe(120)
  })

  it('derives duration from notes when the given duration is negative', () => {
    const out = normalizeAnimationData({ duration: -5, notes: [{ midi: 60, start: 1, duration: 0.5 }] })
    expect(out.duration).toBeCloseTo(1.5)
  })
})

describe('isValidAnimationData', () => {
  it('is true for canonical and false for malformed', () => {
    expect(isValidAnimationData({ notes: [{ midi: 60, start: 0, duration: 1 }] })).toBe(true)
    expect(isValidAnimationData({ notes: [{ midi: 999, start: 0, duration: 1 }] })).toBe(false)
    expect(isValidAnimationData(42)).toBe(false)
  })
})
