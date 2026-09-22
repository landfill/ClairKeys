import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync, spawnSync } from 'child_process'

// Every push to main used to become a full Vercel production deployment, and
// almost all of them were status-record commits under docs/. Each deployment
// keeps its own copy of the function bundles, so those commits alone filled
// Functions Storage (issue #178, D-077). The ignore step must skip only
// changes that cannot affect the deployed app and must build when unsure.

const root = path.resolve(__dirname, '../../..')
const script = path.join(root, 'scripts/vercel-ignore-build.sh')

function git(cwd: string, ...args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function commit(cwd: string, files: Record<string, string>) {
  for (const [file, contents] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true })
    fs.writeFileSync(path.join(cwd, file), contents)
  }
  git(cwd, 'add', '-A')
  git(cwd, 'commit', '-q', '-m', Object.keys(files).join(' '))
  return git(cwd, 'rev-parse', 'HEAD')
}

function makeRepo() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-ignore-build-'))
  git(cwd, 'init', '-q')
  git(cwd, 'config', 'user.email', 'test@example.com')
  git(cwd, 'config', 'user.name', 'test')
  const deployed = commit(cwd, {
    'src/app/page.tsx': 'export default 1\n',
    'docs/recovery/HANDOFF.md': 'a\n',
    'AGENTS.md': 'a\n',
    'vercel.json': '{}\n',
  })
  return { cwd, deployed }
}

// Exit 0 tells Vercel to skip the build; anything else builds.
function decide(cwd: string, previousSha?: string) {
  const env: NodeJS.ProcessEnv = { ...process.env }
  delete env.VERCEL_GIT_PREVIOUS_SHA
  if (previousSha !== undefined) env.VERCEL_GIT_PREVIOUS_SHA = previousSha
  const result = spawnSync('sh', [script], { cwd, env, encoding: 'utf8' })
  return result.status === 0 ? 'skip' : 'build'
}

describe('Vercel ignored build step', () => {
  it('is the ignoreCommand Vercel runs', () => {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))
    expect(config.ignoreCommand).toBe('sh scripts/vercel-ignore-build.sh')
  })

  it('skips when only status records and agent docs changed since the last deployment', () => {
    const { cwd, deployed } = makeRepo()
    commit(cwd, { 'docs/recovery/HANDOFF.md': 'b\n' })
    commit(cwd, { 'docs/recovery/validation/x.md': 'c\n', 'AGENTS.md': 'b\n', 'CLAUDE.md': 'b\n', 'README.md': 'b\n' })
    commit(cwd, { '.github/workflows/test.yml': 'on: push\n' })
    expect(decide(cwd, deployed)).toBe('skip')
  })

  it('builds when app code changed anywhere since the last deployment, even under later docs commits', () => {
    const { cwd, deployed } = makeRepo()
    commit(cwd, { 'src/app/page.tsx': 'export default 2\n' })
    commit(cwd, { 'docs/recovery/HANDOFF.md': 'b\n' })
    expect(decide(cwd, deployed)).toBe('build')
  })

  it('builds for deployment config and markdown outside the skipped paths', () => {
    for (const file of ['vercel.json', 'package.json', 'public/notes.md', 'src/content/help.md']) {
      const { cwd, deployed } = makeRepo()
      commit(cwd, { [file]: 'changed\n' })
      expect(decide(cwd, deployed)).toBe('build')
    }
  })

  it('builds when there is no previous deployment to compare with', () => {
    const { cwd } = makeRepo()
    commit(cwd, { 'docs/recovery/HANDOFF.md': 'b\n' })
    expect(decide(cwd)).toBe('build')
    expect(decide(cwd, '')).toBe('build')
  })

  it('fetches the previous deployment commit a shallow clone lacks', () => {
    const { cwd: upstream, deployed } = makeRepo()
    for (let i = 0; i < 12; i++) commit(upstream, { 'docs/recovery/HANDOFF.md': `${i}\n` })
    const clone = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-ignore-build-clone-'))
    git(clone, 'clone', '-q', '--depth=10', `file://${upstream}`, '.')
    expect(spawnSync('git', ['cat-file', '-e', `${deployed}^{commit}`], { cwd: clone }).status).not.toBe(0)
    expect(decide(clone, deployed)).toBe('skip')

    commit(upstream, { 'src/app/page.tsx': 'export default 2\n' })
    git(clone, 'pull', '-q', '--depth=10')
    expect(decide(clone, deployed)).toBe('build')
  })

  it('builds when the previous deployment commit cannot be found', () => {
    const { cwd } = makeRepo()
    commit(cwd, { 'docs/recovery/HANDOFF.md': 'b\n' })
    expect(decide(cwd, '0123456789abcdef0123456789abcdef01234567')).toBe('build')
  })
})
