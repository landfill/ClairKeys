import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('PR accessibility workflow', () => {
  const workflow = readFileSync(
    join(process.cwd(), '.github/workflows/pr-checks.yml'),
    'utf8'
  )
  const accessibilityJob = workflow
    .split(/^  accessibility-check:\s*$/m)[1]
    .split(/^  pr-summary:\s*$/m)[0]

  it('pins browser and axe tooling', () => {
    expect(accessibilityJob).toContain('browser-driver-manager@2.0.1')
    expect(accessibilityJob).toContain('@axe-core/cli@4.12.1')
  })

  it('shares authentication settings with the build and runtime server', () => {
    expect(accessibilityJob).toMatch(
      /if:.*\n\n    env:\n      NEXTAUTH_SECRET: test-secret\n      NEXTAUTH_URL: http:\/\/127\.0\.0\.1:3000\//
    )
  })

  it('waits for application HTML and always cleans up the server', () => {
    expect(accessibilityJob).toContain("trap 'kill \"$APP_PID\"")
    expect(accessibilityJob).toContain('curl --fail')
    expect(accessibilityJob).toContain("grep -q '<main'")
  })
})

describe('PR summary workflow', () => {
  const workflow = readFileSync(
    join(process.cwd(), '.github/workflows/pr-checks.yml'),
    'utf8'
  )
  const summaryJob = workflow
    .split(/^  pr-summary:\s*$/m)[1]
    .split(/^  all-checks:\s*$/m)[0]

  it('can publish its summary comment', () => {
    expect(summaryJob).toMatch(/permissions:\n      issues: write/)
  })
})
