import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

const OMR_DIR = path.join(process.cwd(), 'omr-service')
const PYTHON = process.env.PYTHON_BIN || 'python3'

describe('OMR processor and recognition evaluation contracts', () => {
  it.each([
    'test_audiveris_runtime.py',
    'test_recognition_evaluation.py',
    'test_meter_retry.py',
    'test_meter_retry_runtime.py',
    'test_time_numeral.py',
    'test_whole_note_retry.py',
    'test_whole_note_retry_runtime.py',
    'test_wedge_reference.py',
    'test_wedge_retry.py',
    'test_wedge_retry_runtime.py',
  ])('passes %s', (suite) => {
    // unittest discovery exits successfully even when a named suite is absent.
    expect(existsSync(path.join(OMR_DIR, 'tests', suite))).toBe(true)
    expect(() =>
      execFileSync(
        PYTHON,
        ['-m', 'unittest', 'discover', '-s', 'tests', '-p', suite],
        {
          cwd: OMR_DIR,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 30_000,
          maxBuffer: 4 * 1024 * 1024,
        }
      )
    ).not.toThrow()
  })
})
