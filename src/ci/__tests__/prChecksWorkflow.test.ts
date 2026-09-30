import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const GATE = "if: ${{ !cancelled() && needs.changes.outputs.code != 'false' }}"

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

  // pr-checks.yml is the only PR gate (D-087). Any file that is not documentation
  // -- omr-service/, next.config.mjs, scripts/, fixtures/ -- must run the tests;
  // the old per-area filters silently missed some of them.
  it('runs the gated jobs for every change except documentation', () => {
    const filter = workflow.split(/^ {12}code:\s*$/m)[1].split(/^\s*$/m)[0]
    const patterns = filter.match(/- '([^']+)'/g)?.map((line) => line.slice(3, -1))

    expect(workflow).toContain("predicate-quantifier: 'every'")
    expect(patterns).toEqual(['**', '!docs/**', '!**/*.md'])
    for (const job of ['test-unit', 'test-e2e', 'security-scan', 'build-check']) {
      const body = workflow.split(new RegExp(`^  ${job}:\\s*$`, 'm'))[1].split(/^  [a-z-]+:\s*$/m)[0]
      expect(body).toContain(GATE)
    }
  })

  // A failed or skipped detector leaves `code` empty. Skipped required jobs count
  // as passed, so the gate must read "not proven docs-only" and must not inherit
  // the detector's failure through `needs` -- otherwise a code PR merges on Lint alone.
  it('runs the gated jobs when change detection fails', () => {
    expect(GATE).toContain('!cancelled()')
    expect(GATE).toContain("needs.changes.outputs.code != 'false'")
    const allChecks = workflow.split(/^  all-checks:\s*$/m)[1]
    expect(allChecks).toContain('changes=${{ needs.changes.result }}')
  })

  // Playwright's webServer runs `npm run build && npm start` on CI, so a separate
  // build step before `npm run test:e2e` builds the app twice.
  it('builds once in the E2E job', () => {
    const e2e = workflow.split(/^  test-e2e:\s*$/m)[1].split(/^  [a-z-]+:\s*$/m)[0]
    expect(e2e).toContain('run: npm run test:e2e')
    expect(e2e).not.toContain('run: npm run build')
  })

  // E2E normally takes 16-19 minutes. Without a cap a hung webServer or browser
  // holds the runner for GitHub's default 360 minutes before the PR sees a result.
  it('caps the E2E job well below the 360-minute default', () => {
    const e2e = workflow.split(/^  test-e2e:\s*$/m)[1].split(/^  [a-z-]+:\s*$/m)[0]
    expect(e2e).toMatch(/^ {4}timeout-minutes: 30$/m)
  })

  // Branch protection requires these contexts by job name. Renaming a job leaves
  // the required check pending forever, so a rename must change the settings too.
  it('reports every required status check', () => {
    const names = [...workflow.matchAll(/^ {4}name: (.+)$/gm)].map((match) => match[1])
    for (const required of ['Lint', 'Run Tests', 'E2E Tests', 'Security Audit']) {
      expect(names).toContain(required)
    }
  })

  it('cancels the run for a superseded PR head', () => {
    expect(workflow).toMatch(/^concurrency:\n {2}group: pr-checks-\$\{\{ github\.event\.pull_request\.number \}\}\n {2}cancel-in-progress: true$/m)
  })

  it('fails the aggregate check unless each job succeeded or was skipped', () => {
    const allChecks = workflow.split(/^  all-checks:\s*$/m)[1]
    expect(allChecks).toContain('success|skipped)')
    expect(allChecks).not.toContain('== "failure"')
  })
})
