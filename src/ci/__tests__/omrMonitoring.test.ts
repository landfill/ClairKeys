import { spawnSync } from 'child_process'
import path from 'path'

it('runs the OMR monitoring isolation and snapshot regressions in CI', () => {
  const result = spawnSync(process.env.PYTHON_BIN || 'python3',
    ['-m', 'unittest', 'tests.test_monitoring'],
    { cwd: path.join(process.cwd(), 'omr-service'), encoding: 'utf8', timeout: 60_000 })
  expect(result.error).toBeUndefined()
  if (result.status !== 0) throw new Error(`OMR monitoring regressions failed:\n${result.stdout}\n${result.stderr}`)
})
