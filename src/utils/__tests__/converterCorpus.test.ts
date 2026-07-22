/**
 * P0-B accuracy gate — score `omr-service/omr/converter.py` against the golden
 * corpus (`fixtures/animation-contract/`) with the P0-A measurement tool.
 *
 * For each fixture this spawns the converter CLI (`python -m omr.cli input.musicxml`),
 * normalizes its output through the same `normalizeAnimationData` the player uses,
 * and scores it against `expected.json` with `compareAnimationData`. A fixture
 * passes only when every expected note is matched within tolerance with exact
 * pitch/hand/voice/staff and no extra notes — the Completion criteria of
 * `docs/recovery/phases/P0-B-musicxml-converter.md`.
 *
 * Unlike `animationFixtures.test.ts` (which locks the corpus + tool without
 * running any converter), this test DOES run the converter, so it is red until
 * P0-B fixes the timing/chord/rest/tie/tuplet/backup/staff-hand handling.
 */

import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { normalizeAnimationData } from '../animationContract'
import { compareAnimationData, formatComparison, DEFAULT_TOLERANCE } from '../animationCompare'
import type { CanonicalAnimationData } from '@/types/animationContract'

const REPO_ROOT = process.cwd()
const FIXTURES_DIR = path.join(REPO_ROOT, 'fixtures', 'animation-contract')
const OMR_DIR = path.join(REPO_ROOT, 'omr-service')
const PYTHON = process.env.PYTHON_BIN || 'python3'

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

function runConverter(dir: string): CanonicalAnimationData {
  const input = path.join(FIXTURES_DIR, dir, 'input.musicxml')
  const stdout = execFileSync(PYTHON, ['-m', 'omr.cli', input], {
    cwd: OMR_DIR,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return normalizeAnimationData(JSON.parse(stdout))
}

describe('converter corpus accuracy (P0-B)', () => {
  for (const dir of fixtureDirs()) {
    it(`${dir}: converter output matches expected.json within tolerance`, () => {
      const expected = loadExpected(dir)
      const actual = runConverter(dir)
      const result = compareAnimationData(actual, expected, DEFAULT_TOLERANCE)
      if (!result.match) {
        throw new Error(`${dir}\n${formatComparison(result)}`)
      }
      expect(result.match).toBe(true)
    })
  }
})
