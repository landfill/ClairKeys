import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ubuntu-latest moved to 26.04 before the locked Playwright supported it.
it.each([
  ['pr-checks.yml', 'test-e2e'],
  ['deploy.yml', 'e2e'],
])('runs %s %s on the OS supported by the locked browsers', (file, job) => {
  const workflow = readFileSync(join(process.cwd(), '.github/workflows', file), 'utf8')
  const body = workflow.split(new RegExp(`^  ${job}:\\s*$`, 'm'))[1].split(/^  [a-z-]+:\s*$/m)[0]
  expect(body).toMatch(/^ {4}runs-on: ubuntu-24\.04\s*$/m)
})
