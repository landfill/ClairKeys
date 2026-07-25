import { execFileSync } from 'child_process'
import path from 'path'

const OMR_DIR = path.join(process.cwd(), 'omr-service')
const PYTHON = process.env.PYTHON_BIN || 'python3'

describe('OMR processor behavior and deployment static contracts (issue #22)', () => {
  it('passes the Python behavior and static configuration suite', () => {
    expect(() =>
      execFileSync(
        PYTHON,
        ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_audiveris_runtime.py'],
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
