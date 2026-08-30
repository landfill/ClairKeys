import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('PR summary workflow', () => {
  const workflow = readFileSync(
    join(process.cwd(), '.github/workflows/pr-checks.yml'),
    'utf8'
  )
  const summaryJob = workflow
    .split(/^  pr-summary:\s*$/m)[1]
    .split(/^  all-checks:\s*$/m)[0]

  it('publishes a job summary without repository write access', () => {
    expect(summaryJob).toContain('core.summary')
    expect(summaryJob).not.toContain('issues.createComment')
    expect(summaryJob).not.toMatch(/permissions:\n      issues: write/)
  })
})
