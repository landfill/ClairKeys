import { readFileSync } from 'node:fs'
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

  // The surviving `build` job still passes `secrets.DATABASE_URL` and friends to
  // `npm run build`. They all resolve to empty strings today and the job passes
  // anyway, so the build does not actually need them. They are left alone
  // deliberately: that job was never failing, and issue #28 is about the deploy
  // path. Asserting their absence here would be asserting something untrue.

  it('still validates the merge commit', () => {
    expect(workflow).toMatch(/^ {2}test:\s*$/m)
    expect(workflow).toMatch(/^ {2}build:\s*$/m)
    expect(workflow).toContain('run: npm test')
    expect(workflow).toContain('run: npm run lint')
    expect(workflow).toContain('run: npx tsc --noEmit')
    expect(workflow).toContain('run: npm run build')
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
})
