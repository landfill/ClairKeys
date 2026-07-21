/**
 * Golden corpus tests (P0-A).
 *
 * 1. Every fixture's `expected.json` is a valid canonical document — the corpus
 *    itself conforms to the contract it will judge others against.
 * 2. The comparison tool (`compareAnimationData`) reports clean matches, detects
 *    real mismatches, and honours the timing tolerance.
 *
 * These do NOT run the OMR converter (that is P0-B). They lock the corpus and
 * the measurement tool so P0-B/P0-C can be scored against them.
 */

import fs from 'fs'
import path from 'path'
import { normalizeAnimationData } from '../animationContract'
import { compareAnimationData, DEFAULT_TOLERANCE } from '../animationCompare'
import type { CanonicalAnimationData } from '@/types/animationContract'

const FIXTURES_DIR = path.join(process.cwd(), 'fixtures', 'animation-contract')

function fixtureDirs(): string[] {
  return fs
    .readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
}

function loadExpected(dir: string): CanonicalAnimationData {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, dir, 'expected.json'), 'utf-8')
  return normalizeAnimationData(JSON.parse(raw))
}

describe('golden corpus — coverage', () => {
  it('has at least the 7 required fixtures', () => {
    expect(fixtureDirs().length).toBeGreaterThanOrEqual(7)
  })

  it('each fixture has both input.musicxml and expected.json', () => {
    for (const dir of fixtureDirs()) {
      expect(fs.existsSync(path.join(FIXTURES_DIR, dir, 'input.musicxml'))).toBe(true)
      expect(fs.existsSync(path.join(FIXTURES_DIR, dir, 'expected.json'))).toBe(true)
    }
  })
})

describe('golden corpus — expected.json validates against the contract', () => {
  for (const dir of fixtureDirs()) {
    it(`${dir}/expected.json normalizes cleanly`, () => {
      expect(() => loadExpected(dir)).not.toThrow()
      const doc = loadExpected(dir)
      expect(doc.notes.length).toBeGreaterThan(0)
      // Every note carries the fields P0-B must produce.
      for (const n of doc.notes) {
        expect(n.midi).toBeGreaterThanOrEqual(21)
        expect(n.midi).toBeLessThanOrEqual(108)
        expect(Number.isFinite(n.start)).toBe(true)
        expect(Number.isFinite(n.duration)).toBe(true)
      }
    })
  }
})

describe('golden corpus — self-consistency invariants', () => {
  it('grand-staff fixture assigns hands by staff (staff 1 → R, staff 2 → L)', () => {
    const doc = loadExpected('04-grand-staff')
    for (const n of doc.notes) {
      if (n.staff === 1) expect(n.hand).toBe('R')
      if (n.staff === 2) expect(n.hand).toBe('L')
    }
  })

  it('multi-voice fixture keeps two voices on the same staff', () => {
    const doc = loadExpected('05-multivoice')
    const voices = new Set(doc.notes.map((n) => n.voice))
    const staves = new Set(doc.notes.map((n) => n.staff))
    expect(voices.size).toBe(2)
    expect(staves.size).toBe(1)
  })

  it('chord fixture has three notes sharing an onset', () => {
    const doc = loadExpected('02-chord')
    const atZero = doc.notes.filter((n) => n.start === 0)
    expect(atZero.length).toBe(3)
  })
})

describe('compareAnimationData', () => {
  it('reports a clean match when a document is compared with itself', () => {
    const doc = loadExpected('01-monophonic')
    const result = compareAnimationData(doc, doc)
    expect(result.match).toBe(true)
    expect(result.diffs).toHaveLength(0)
  })

  it('accepts onset/duration drift within tolerance', () => {
    const expected = loadExpected('01-monophonic')
    const actual: CanonicalAnimationData = {
      ...expected,
      notes: expected.notes.map((n) => ({ ...n, start: n.start + 0.005, duration: n.duration - 0.005 })),
    }
    expect(compareAnimationData(actual, expected, DEFAULT_TOLERANCE).match).toBe(true)
  })

  it('flags onset drift beyond tolerance', () => {
    const expected = loadExpected('01-monophonic')
    const actual: CanonicalAnimationData = {
      ...expected,
      notes: expected.notes.map((n, i) => (i === 0 ? { ...n, start: n.start + 0.5 } : n)),
    }
    const result = compareAnimationData(actual, expected)
    expect(result.match).toBe(false)
    expect(result.diffs.some((d) => d.field === 'start')).toBe(true)
  })

  it('flags a wrong pitch (the old middle-C collapse would surface here)', () => {
    const expected = loadExpected('01-monophonic')
    const actual: CanonicalAnimationData = {
      ...expected,
      notes: expected.notes.map((n) => ({ ...n, midi: 60 })), // everything collapsed to middle C
    }
    const result = compareAnimationData(actual, expected)
    expect(result.match).toBe(false)
    expect(result.diffs.filter((d) => d.field === 'midi').length).toBeGreaterThan(0)
  })

  it('flags a wrong hand assignment', () => {
    const expected = loadExpected('04-grand-staff')
    const actual: CanonicalAnimationData = {
      ...expected,
      notes: expected.notes.map((n) => ({ ...n, hand: 'R' as const })),
    }
    const result = compareAnimationData(actual, expected)
    expect(result.match).toBe(false)
    expect(result.diffs.some((d) => d.field === 'hand')).toBe(true)
  })

  it('reports missing and extra notes on count mismatch', () => {
    const expected = loadExpected('01-monophonic')
    const short: CanonicalAnimationData = { ...expected, notes: expected.notes.slice(0, 2) }
    const result = compareAnimationData(short, expected)
    expect(result.match).toBe(false)
    expect(result.diffs.some((d) => d.field === 'missing')).toBe(true)
  })
})
