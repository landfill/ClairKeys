import { spawnSync } from 'child_process'
import path from 'path'

describe('OMR completion callback delivery gate', () => {
  it('runs the executable Python callback regressions in Jest and CI', () => {
    const serviceRoot = path.join(process.cwd(), 'omr-service')
    const result = spawnSync(
      process.env.PYTHON_BIN || 'python3',
      ['-m', 'unittest', 'tests.test_callback_delivery'],
      { cwd: serviceRoot, encoding: 'utf8' },
    )

    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
  })
})
