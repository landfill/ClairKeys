import { execFileSync } from 'child_process'
import path from 'path'

const OMR_DIR = path.join(process.cwd(), 'omr-service')
const PYTHON = process.env.PYTHON_BIN || 'python3'

describe('OMR processor and recognition evaluation contracts', () => {
  it.each(['test_audiveris_runtime.py', 'test_recognition_evaluation.py'])('passes %s', (suite) => {
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
