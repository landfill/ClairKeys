/**
 * Issue #48 regression gate for tempo provenance and beat-unit conversion.
 *
 * `compareAnimationData` intentionally compares notes, not top-level tempo
 * metadata, so this file drives the Python CLI and asserts the raw JSON fields
 * directly. Unlike `omr-service/tests`, this Jest suite is part of `npm test`
 * and therefore runs in the repository's Unit Tests CI job.
 */

import { execFileSync } from 'child_process'
import path from 'path'

const REPO_ROOT = process.cwd()
const FIXTURES_DIR = path.join(REPO_ROOT, 'fixtures', 'animation-contract')
const OMR_DIR = path.join(REPO_ROOT, 'omr-service')
const PYTHON = process.env.PYTHON_BIN || 'python3'

type RawAnimationData = {
  version: string
  tempo: number | null
  tempoSource: string
  timingReferenceBpm: number
  scoreTempo: number | null
  notes: Array<{ start: number; duration: number }>
}

function runConverter(fixture: string, extraArgs: string[] = []): RawAnimationData {
  const input = path.join(FIXTURES_DIR, fixture, 'input.musicxml')
  const stdout = execFileSync(PYTHON, ['-m', 'omr.cli', input, ...extraArgs], {
    cwd: OMR_DIR,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
    maxBuffer: 32 * 1024 * 1024,
  })
  return JSON.parse(stdout) as RawAnimationData
}

describe('converter tempo provenance contract (issue #48)', () => {
  it('converts eighth = 120 to 60 quarter BPM', () => {
    const actual = runConverter('10-beat-unit-eighth')

    expect(actual).toMatchObject({
      version: '1.1',
      tempo: 60,
      tempoSource: 'score',
      timingReferenceBpm: 60,
      scoreTempo: 60,
    })
    expect(actual.notes[0].duration).toBeCloseTo(1, 6)
  })

  it('does not let a later measure\'s tempo describe the opening measure', () => {
    // A score silent at bar 1 and marked 90 at bar 2 says nothing about bar 1.
    // Scanning every measure for the "score tempo" made that later number
    // govern the opening bar and claim `score` provenance for the whole piece —
    // the same invention this contract exists to remove, displaced by one bar.
    const actual = runConverter('14-tempo-first-declared-late')

    expect(actual).toMatchObject({
      tempo: null,
      tempoSource: 'unknown',
      timingReferenceBpm: 60,
      scoreTempo: null,
    })
    // Bar 1 is timed at the declared 60 reference, bar 2 at the score's 90.
    expect(actual.notes[0].duration).toBeCloseTo(1, 6)
    expect(actual.notes[1].duration).toBeCloseTo(60 / 90, 6)
  })

  it('keeps an absent score tempo unknown while naming the timing reference', () => {
    const actual = runConverter('11-no-tempo')

    expect(actual).toMatchObject({
      version: '1.1',
      tempo: null,
      tempoSource: 'unknown',
      timingReferenceBpm: 60,
      scoreTempo: null,
    })
    expect(actual.notes[0].duration).toBeCloseTo(1, 6)
  })

  it('lets user tempo win without discarding the score tempo', () => {
    const actual = runConverter('10-beat-unit-eighth', ['--tempo', '72'])

    expect(actual).toMatchObject({
      tempo: 72,
      tempoSource: 'user',
      timingReferenceBpm: 72,
      scoreTempo: 60,
    })
    expect(actual.notes[0].duration).toBeCloseTo(60 / 72, 6)
  })
})
