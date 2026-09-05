import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { normalizeAnimationData } from '../animationContract'

const REPO_ROOT = process.cwd()
const OMR_DIR = path.join(REPO_ROOT, 'omr-service')
const FIXTURES_DIR = path.join(REPO_ROOT, 'fixtures', 'key-signatures')
const PYTHON = process.env.PYTHON_BIN || 'python3'

function runRawConverter(fixture: string): Record<string, unknown> {
  const stdout = execFileSync(
    PYTHON,
    ['-m', 'omr.cli', path.join(FIXTURES_DIR, fixture)],
    {
      cwd: OMR_DIR,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
      maxBuffer: 32 * 1024 * 1024,
    }
  )
  return JSON.parse(stdout) as Record<string, unknown>
}

function withoutKeyAndGeneratedAt(raw: Record<string, unknown>): Record<string, unknown> {
  const { keySignature: _keySignature, generated_at: _generatedAt, ...rest } = raw
  return rest
}

describe('converter key-signature raw CLI contract (D-050)', () => {
  it('passes the complete bounded Python extraction matrix', () => {
    expect(() => execFileSync(PYTHON, [
      '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_key_signature.py',
    ], { cwd: OMR_DIR, stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 })).not.toThrow()
  })

  it.each([
    ['flat-major.musicxml', 'F'],
    ['explicit-minor.musicxml', 'Cm'],
  ])('emits the traditional name for %s', (fixture, expected) => {
    const raw = runRawConverter(fixture)
    expect(raw.keySignature).toBe(expected)
    expect(normalizeAnimationData(raw).keySignature).toBe(expected)
  })

  it.each([
    'invalid-fifths.musicxml',
    'missing-key.musicxml',
    'out-of-range.musicxml',
    'unsupported-mode.musicxml',
  ])('omits unreadable metadata without aborting for %s', (fixture) => {
    const raw = runRawConverter(fixture)
    expect(raw).not.toHaveProperty('keySignature')
    expect(normalizeAnimationData(raw).keySignature).toBeUndefined()
  })

  it('changes only key metadata across the identical tiny inputs', () => {
    const baseline = withoutKeyAndGeneratedAt(runRawConverter('flat-major.musicxml'))
    for (const fixture of fs.readdirSync(FIXTURES_DIR).sort()) {
      expect(withoutKeyAndGeneratedAt(runRawConverter(fixture))).toEqual(baseline)
    }
  })
})
