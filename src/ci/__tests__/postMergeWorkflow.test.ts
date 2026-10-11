import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Guards the removal made for issue #28.
 *
 * `.github/workflows/deploy.yml` used to carry a deploy path that had never
 * succeeded: no repository secrets are configured, so `amondnet/vercel-action`
 * received an empty token and `prisma migrate deploy` an empty `DATABASE_URL`.
 * Every commit on `main` therefore ended with red checks, which is exactly the
 * noise that let a genuinely broken production deployment go unnoticed for days.
 *
 * These assertions are about the workflow *not* claiming to deploy. Re-adding a
 * deploy job here is not forbidden — but it has to come with the secrets that
 * make it work, and that will make this test fail loudly first.
 */
describe('post-merge workflow', () => {
  const workflow = readFileSync(
    join(process.cwd(), '.github/workflows/deploy.yml'),
    'utf8'
  )

  it('does not present itself as a deployment', () => {
    expect(workflow).toMatch(/^name: Post-merge checks$/m)
    expect(workflow).not.toMatch(/^name: Deploy$/m)
  })

  it('carries no job that deploys, migrates, or reports a deployment', () => {
    expect(workflow).not.toMatch(/^ {2}deploy:\s*$/m)
    expect(workflow).not.toMatch(/^ {2}database-migrate:\s*$/m)
    expect(workflow).not.toMatch(/^ {2}health-check:\s*$/m)
    expect(workflow).not.toMatch(/^ {2}notify:\s*$/m)
  })

  it('holds no credential the repository cannot supply for deployment', () => {
    expect(workflow).not.toContain('secrets.VERCEL_TOKEN')
    expect(workflow).not.toContain('secrets.VERCEL_ORG_ID')
    expect(workflow).not.toContain('secrets.VERCEL_PROJECT_ID')
    expect(workflow).not.toContain('vercel-action')
    expect(workflow).not.toContain('prisma migrate deploy')
  })

  // Playwright's webServer runs `npm run build && npm start` on CI, so the E2E job
  // builds the merge commit and there is no separate `build` job or build step
  // (D-087). The old `build` job passed empty `secrets.*` values; it is gone with it.
  it('still validates the merge commit', () => {
    const playwrightConfig = readFileSync(join(process.cwd(), 'playwright.config.ts'), 'utf8')
    expect(playwrightConfig).toContain("command: 'npm run build && npm start'")
    expect(playwrightConfig).toContain('reuseExistingServer: !process.env.CI')
    expect(workflow).not.toContain('run: npm run build')

    expect(workflow).toMatch(/^ {2}lint:\s*$/m)
    expect(workflow).toMatch(/^ {2}test:\s*$/m)
    expect(workflow).toMatch(/^ {2}e2e:\s*$/m)
    expect(workflow).toContain('run: npm test')
    expect(workflow).toContain('run: npm run lint')
    expect(workflow).toContain('run: npx tsc --noEmit')
    expect(workflow).toContain('run: npm run test:e2e')
    expect(workflow).toContain('run: npm audit --omit=dev --audit-level high')
  })

  // The audit gates what ships. An advisory with no patched release in a test or lint
  // tool would otherwise stop every merge until upstream publishes one (D-095).
  // Matching whole step lines keeps a commented-out copy of the command from passing.
  it('audits only the dependencies that ship', () => {
    const steps = workflow.match(/^ {8}run: .*audit.*$/gm)
    expect(steps).toEqual(['        run: npm audit --omit=dev --audit-level high'])
    expect(workflow.match(/npm audit/g)).toHaveLength(1)
  })

  // Status records are committed straight to main after every unit of work. They
  // change no code, so they must not re-run the whole suite -- but only they may
  // be skipped: any other file in the push has to run everything (D-087).
  it('skips pushes that touch only documentation, and nothing else', () => {
    const ignored = workflow
      .split(/^ {4}paths-ignore:\s*$/m)[1]
      .split(/^ {2}workflow_dispatch:/m)[0]
      .match(/- '([^']+)'/g)
      ?.map((line) => line.slice(3, -1))

    expect(ignored).toEqual(['docs/**', '**/*.md'])
  })

  // The only E2E evidence for the merged tree; a hang must not hold it for the
  // 360-minute default (runs take 25-30 minutes (about 1270 tests across six browser projects, one worker)).
  it('caps the E2E job well below the 360-minute default', () => {
    const e2e = workflow.split(/^  e2e:\s*$/m)[1].split(/^  [a-z-]+:\s*$/m)[0]
    expect(e2e).toMatch(/^ {4}timeout-minutes: 45$/m)
  })

  it('is the only workflow that runs on a push to main', () => {
    expect(existsSync(join(process.cwd(), '.github/workflows/test.yml'))).toBe(false)
  })

  it('leaves every job reachable', () => {
    const declaredJobs = [...workflow.matchAll(/^ {2}([a-z][a-z0-9-]*):\s*$/gm)].map(
      (match) => match[1]
    )
    const neededJobs = [...workflow.matchAll(/^ {4}needs:\s*(.+)$/gm)].flatMap((match) =>
      match[1]
        .replace(/[[\]]/g, '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    )

    for (const needed of neededJobs) {
      expect(declaredJobs).toContain(needed)
    }
  })

  // Verifies the verified job configuration to ensure it uses the detection script with depth 0.
  it('detects verified merges using fetch-depth 0 and outputs skip', () => {
    const verified = workflow.split(/^  verified:\s*$/m)[1].split(/^  [a-z-]+:\s*$/m)[0]
    expect(verified).toContain('fetch-depth: 0')
    expect(verified).toContain('run: sh scripts/post-merge-verified.sh')
    expect(verified).toContain('skip: ${{ steps.decide.outputs.skip }}')
  })

  // Permissions for verified job must be strictly read-only for actions, contents, issues, and pull-requests.
  it('grants verified job only the required read permissions with no write permissions', () => {
    const verified = workflow.split(/^  verified:\s*$/m)[1].split(/^  [a-z-]+:\s*$/m)[0]
    expect(verified).toContain('actions: read')
    expect(verified).toContain('contents: read')
    expect(verified).toContain('issues: read')
    expect(verified).toContain('pull-requests: read')
    expect(verified).not.toContain('write')
  })

  // Gates lint, test, and e2e on the verified job output unless cancelled.
  it('gates lint, test, and e2e on the verified job', () => {
    for (const job of ['lint', 'test', 'e2e']) {
      const block = workflow.split(new RegExp(`^  ${job}:\\s*$`, 'm'))[1].split(/^  [a-z-]+:\s*$/m)[0]
      expect(block).toContain('    needs: verified\n')
      expect(block).toContain("    if: ${{ !cancelled() && needs.verified.outputs.skip != 'true' }}\n")
    }
  })

  // Security audit must always run because npm audit is date-sensitive and independent of code equality.
  it('leaves security audit unconditional with no needs or if gate', () => {
    const security = workflow.split(/^  security:\s*$/m)[1]
    expect(security).not.toContain('needs:')
    expect(security).not.toContain('if:')
  })

  // Ensures failure in the verification step does not cause checks to be skipped.
  it('references needs.verified only in the inverted skip check across the workflow', () => {
    const lines = workflow
      .split('\n')
      .filter((line) => line.includes('needs.verified'))
    expect(lines).toHaveLength(3)
    for (const line of lines) {
      expect(line).toBe("    if: ${{ !cancelled() && needs.verified.outputs.skip != 'true' }}")
    }
  })

  // Keeps doc exclusion paths aligned across deploy.yml, pr-checks.yml, and post-merge-verified.sh.
  it('aligns document exclusion paths between script and pr-checks', () => {
    const script = readFileSync(join(process.cwd(), 'scripts/post-merge-verified.sh'), 'utf8')
    const prChecks = readFileSync(join(process.cwd(), '.github/workflows/pr-checks.yml'), 'utf8')

    expect(script).toContain("':(exclude)docs'")
    expect(script).toContain("':(exclude,glob)**/*.md'")
    expect(prChecks).toContain("- '!docs/**'")
    expect(prChecks).toContain("- '!**/*.md'")
  })

  // Ensures the detection script checks exactly the names defined as jobs in pr-checks.yml.
  it('checks the four required PR check job names defined in pr-checks.yml', () => {
    const script = readFileSync(join(process.cwd(), 'scripts/post-merge-verified.sh'), 'utf8')
    const prChecks = readFileSync(join(process.cwd(), '.github/workflows/pr-checks.yml'), 'utf8')

    const requiredNames = ['Lint', 'Run Tests', 'E2E Tests', 'Security Audit']
    for (const name of requiredNames) {
      expect(script).toContain(name)
      expect(prChecks).toContain(`    name: ${name}`)
    }
  })

  // Verifies that the detection script targets pr-checks.yml directly and avoids check-runs API.
  it('targets pr-checks.yml directly and avoids check-runs API', () => {
    const script = readFileSync(join(process.cwd(), 'scripts/post-merge-verified.sh'), 'utf8')
    expect(script).toContain('.github/workflows/pr-checks.yml')
    expect(existsSync(join(process.cwd(), '.github/workflows/pr-checks.yml'))).toBe(true)
    expect(script).not.toContain('check-runs')
  })
})
