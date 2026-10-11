import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync, spawnSync } from 'child_process'

const root = path.resolve(__dirname, '../../..')
const script = path.join(root, 'scripts/post-merge-verified.sh')

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

interface RepoSetup {
  cwd: string
  fakeGhDir: string
  outputPath: string
  summaryPath: string
  headSha: string
  mergeSha: string
  featureShas: string[]
}

function setupFakeGh(fakeGhDir: string) {
  const fakeGhScript = path.join(fakeGhDir, 'gh')
  fs.writeFileSync(
    fakeGhScript,
    `#!/bin/sh
for arg in "$@"; do
  case "$arg" in
    */actions/runs/*/jobs*)
      run_id=$(printf '%s' "$arg" | sed -n 's|.*/actions/runs/\\([0-9][0-9]*\\)/jobs.*|\\1|p')
      if [ -n "$run_id" ] && [ -f "${fakeGhDir}/jobs-\${run_id}.json" ]; then
        cat "${fakeGhDir}/jobs-\${run_id}.json"
        exit 0
      fi
      exit 1
      ;;
    */actions/runs*)
      if [ -f "${fakeGhDir}/runs.json" ]; then
        cat "${fakeGhDir}/runs.json"
        exit 0
      fi
      exit 1
      ;;
    */issues/*/events*)
      if [ -f "${fakeGhDir}/events.json" ]; then
        cat "${fakeGhDir}/events.json"
        exit 0
      fi
      exit 1
      ;;
    */commits/*/pulls*)
      if [ -f "${fakeGhDir}/pulls.json" ]; then
        cat "${fakeGhDir}/pulls.json"
        exit 0
      fi
      exit 1
      ;;
  esac
done
exit 1
`,
    { mode: 0o755 }
  )
}

function makeRepo(
  mainCommits: Array<Record<string, string>> = [
    {
      'docs/recovery/HANDOFF.md': 'updated handoff\n',
      'README.md': 'updated readme\n',
    },
  ],
  featureCommits: Array<Record<string, string>> = [
    {
      'src/feature.ts': 'export const feature = 1\n',
    },
  ]
): RepoSetup {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-postmerge-test-repo-'))
  git(cwd, 'init', '-q', '-b', 'main')
  git(cwd, 'config', 'user.email', 'test@example.com')
  git(cwd, 'config', 'user.name', 'test')

  // Initial commit on main
  commit(cwd, {
    'src/app/page.tsx': 'export default 1\n',
    'README.md': 'initial readme\n',
    'docs/recovery/HANDOFF.md': 'initial handoff\n',
  })

  // Feature branch with code change (PR head)
  git(cwd, 'checkout', '-q', '-b', 'feature')
  const featureShas: string[] = []
  for (const fCommit of featureCommits) {
    featureShas.push(commit(cwd, fCommit))
  }
  const headSha = featureShas[featureShas.length - 1]

  // Back to main and apply additional commits
  git(cwd, 'checkout', '-q', 'main')
  for (const commitFiles of mainCommits) {
    if (Object.keys(commitFiles).length > 0) {
      commit(cwd, commitFiles)
    }
  }

  // Merge feature branch with --no-ff
  git(cwd, 'merge', '-q', '--no-ff', 'feature', '-m', 'Merge pull request #100')
  const mergeSha = git(cwd, 'rev-parse', 'HEAD')

  const fakeGhDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-fake-gh-'))
  setupFakeGh(fakeGhDir)

  const outputPath = path.join(cwd, 'github_output')
  fs.writeFileSync(outputPath, '')
  const summaryPath = path.join(cwd, 'github_summary')
  fs.writeFileSync(summaryPath, '')

  return { cwd, fakeGhDir, outputPath, summaryPath, headSha, mergeSha, featureShas }
}

function defaultJobs(runId = 501) {
  return {
    total_count: 4,
    jobs: [
      {
        name: 'Lint',
        status: 'completed',
        conclusion: 'success',
        html_url: `https://github.com/org/repo/actions/runs/${runId}/jobs/1`,
      },
      {
        name: 'Run Tests',
        status: 'completed',
        conclusion: 'success',
        html_url: `https://github.com/org/repo/actions/runs/${runId}/jobs/2`,
      },
      {
        name: 'E2E Tests',
        status: 'completed',
        conclusion: 'success',
        html_url: `https://github.com/org/repo/actions/runs/${runId}/jobs/3`,
      },
      {
        name: 'Security Audit',
        status: 'completed',
        conclusion: 'success',
        html_url: `https://github.com/org/repo/actions/runs/${runId}/jobs/4`,
      },
    ],
  }
}

function defaultPullItem(repo: RepoSetup, prNumber: number | string = 100) {
  return {
    number: prNumber,
    merged_at: '2026-10-10T10:00:00Z',
    merge_commit_sha: repo.mergeSha,
    base: { ref: 'main' },
    head: { sha: repo.headSha },
  }
}

function writeHappyPath(repo: RepoSetup) {
  fs.writeFileSync(
    path.join(repo.fakeGhDir, 'pulls.json'),
    JSON.stringify([defaultPullItem(repo, 100)])
  )
  fs.writeFileSync(
    path.join(repo.fakeGhDir, 'events.json'),
    JSON.stringify([{ event: 'merged' }, { event: 'closed' }])
  )
  fs.writeFileSync(
    path.join(repo.fakeGhDir, 'runs.json'),
    JSON.stringify({
      total_count: 1,
      workflow_runs: [
        {
          id: 501,
          path: '.github/workflows/pr-checks.yml',
          event: 'pull_request',
          status: 'completed',
          conclusion: 'success',
          display_title: 'PR Checks for #100 into main',
        },
      ],
    })
  )
  fs.writeFileSync(
    path.join(repo.fakeGhDir, 'jobs-501.json'),
    JSON.stringify(defaultJobs(501))
  )
}

function writePulls(
  repo: RepoSetup,
  overrides: {
    number?: number | string
    mergedAt?: string | null
    mergeSha?: string
    baseRef?: string
    headSha?: string
  } = {}
) {
  const item = {
    number: overrides.number !== undefined ? overrides.number : 100,
    merged_at: overrides.mergedAt !== undefined ? overrides.mergedAt : '2026-10-10T10:00:00Z',
    merge_commit_sha: overrides.mergeSha !== undefined ? overrides.mergeSha : repo.mergeSha,
    base: { ref: overrides.baseRef !== undefined ? overrides.baseRef : 'main' },
    head: { sha: overrides.headSha !== undefined ? overrides.headSha : repo.headSha },
  }
  fs.writeFileSync(path.join(repo.fakeGhDir, 'pulls.json'), JSON.stringify([item]))
}

function makeSubmoduleRepoBase() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-postmerge-submodule-'))
  git(cwd, 'init', '-q', '-b', 'main')
  git(cwd, 'config', 'user.email', 'test@example.com')
  git(cwd, 'config', 'user.name', 'test')

  // First commit with .gitmodules (ignore = all) and gitlink SHA A
  fs.writeFileSync(
    path.join(cwd, '.gitmodules'),
    '[submodule "vendor/lib"]\n\tpath = vendor/lib\n\turl = https://example.invalid/lib.git\n\tignore = all\n'
  )
  git(cwd, 'add', '.gitmodules')
  git(
    cwd,
    'update-index',
    '--add',
    '--cacheinfo',
    '160000,0123456789abcdef0123456789abcdef01234567,vendor/lib'
  )
  git(cwd, 'commit', '-q', '-m', 'Initial commit with submodule')

  // Feature branch with code change (stage only src/feature.ts, never git add -A)
  git(cwd, 'checkout', '-q', '-b', 'feature')
  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true })
  fs.writeFileSync(path.join(cwd, 'src/feature.ts'), 'export const feature = 1\n')
  git(cwd, 'add', 'src/feature.ts')
  git(cwd, 'commit', '-q', '-m', 'Feature commit')
  const headSha = git(cwd, 'rev-parse', 'HEAD')

  // Back to main
  git(cwd, 'checkout', '-q', 'main')

  return { cwd, headSha }
}

function finishSubmoduleRepo(cwd: string, headSha: string, mergeSha: string): RepoSetup {
  const fakeGhDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-fake-gh-'))
  setupFakeGh(fakeGhDir)
  const outputPath = path.join(cwd, 'github_output')
  fs.writeFileSync(outputPath, '')
  const summaryPath = path.join(cwd, 'github_summary')
  fs.writeFileSync(summaryPath, '')

  return {
    cwd,
    fakeGhDir,
    outputPath,
    summaryPath,
    headSha,
    mergeSha,
    featureShas: [headSha],
  }
}

interface RunOptions {
  eventName?: string
  repository?: string
  sha?: string
}

function runScript(repo: RepoSetup, options: RunOptions = {}) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${repo.fakeGhDir}:${process.env.PATH || ''}`,
    GITHUB_EVENT_NAME: options.eventName ?? 'push',
    GITHUB_REPOSITORY: options.repository ?? 'org/repo',
    GITHUB_SHA: options.sha !== undefined ? options.sha : repo.mergeSha,
    GITHUB_OUTPUT: repo.outputPath,
    GITHUB_STEP_SUMMARY: repo.summaryPath,
  }

  const result = spawnSync('sh', [script], { cwd: repo.cwd, env, encoding: 'utf8' })
  expect(result.status).toBe(0)

  const outputContent = fs.readFileSync(repo.outputPath, 'utf8')
  const summaryContent = fs.readFileSync(repo.summaryPath, 'utf8')

  let verdict: 'skip' | 'run'
  if (outputContent === 'skip=true\n') {
    verdict = 'skip'
  } else if (outputContent === '') {
    verdict = 'run'
  } else {
    throw new Error(`Unexpected GITHUB_OUTPUT content: ${JSON.stringify(outputContent)}`)
  }

  return { verdict, outputContent, summaryContent, stdout: result.stdout }
}

describe('post-merge verified detection script', () => {
  it('skips when only docs changed on main since branching and all checks passed', () => {
    const repo = makeRepo()
    writeHappyPath(repo)

    const res = runScript(repo)
    expect(res.verdict).toBe('skip')
    expect(res.summaryContent).toContain('#100')
    expect(res.summaryContent).toContain(repo.headSha)
    expect(res.summaryContent).toContain('https://github.com/org/repo/actions/runs/501/jobs/3')
  })

  it('skips when only nested markdown or docs assets changed on main', () => {
    const repo = makeRepo([
      {
        'src/content/help.md': '# Help\n',
        'docs/a.png': 'fake-image-data\n',
      },
    ])
    writeHappyPath(repo)

    const res = runScript(repo)
    expect(res.verdict).toBe('skip')
  })

  it('runs all checks when app code changed on main before merge', () => {
    const repo = makeRepo([
      {
        'docs/recovery/HANDOFF.md': 'updated handoff\n',
        'README.md': 'updated readme\n',
        'src/app/page.tsx': 'export default function Page() { return "app change" }\n',
      },
    ])
    writeHappyPath(repo)

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it.each(['.github/workflows/x.yml', 'package.json', 'src/docs/guide.ts'])(
    'runs all checks when %s changed on main before merge',
    (file) => {
      const repo = makeRepo([
        {
          'docs/recovery/HANDOFF.md': 'updated handoff\n',
          'README.md': 'updated readme\n',
          [file]: 'changed\n',
        },
      ])
      writeHappyPath(repo)

      const res = runScript(repo)
      expect(res.verdict).toBe('run')
    }
  )

  it('runs all checks when main had a code commit that was reverted before merge', () => {
    const repo = makeRepo([
      { 'src/app/page.tsx': 'export default 2\n' },
      { 'src/app/page.tsx': 'export default 1\n' },
    ])
    writeHappyPath(repo)

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it('runs all checks when merge commit itself contains manual code changes', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-postmerge-test-repo-'))
    git(cwd, 'init', '-q', '-b', 'main')
    git(cwd, 'config', 'user.email', 'test@example.com')
    git(cwd, 'config', 'user.name', 'test')
    commit(cwd, {
      'src/app/page.tsx': 'export default 1\n',
      'README.md': 'initial readme\n',
      'docs/recovery/HANDOFF.md': 'initial handoff\n',
    })
    git(cwd, 'checkout', '-q', '-b', 'feature')
    const headSha = commit(cwd, { 'src/feature.ts': 'export const feature = 1\n' })
    git(cwd, 'checkout', '-q', 'main')
    commit(cwd, {
      'docs/recovery/HANDOFF.md': 'updated handoff\n',
      'README.md': 'updated readme\n',
    })

    git(cwd, 'merge', '-q', '--no-ff', '--no-commit', 'feature')
    fs.writeFileSync(path.join(cwd, 'src/extra.ts'), 'export const extra = 1\n')
    git(cwd, 'add', 'src/extra.ts')
    git(cwd, 'commit', '-q', '-m', 'Merge with manual change')
    const mergeSha = git(cwd, 'rev-parse', 'HEAD')

    const fakeGhDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clairkeys-fake-gh-'))
    setupFakeGh(fakeGhDir)
    const outputPath = path.join(cwd, 'github_output')
    fs.writeFileSync(outputPath, '')
    const summaryPath = path.join(cwd, 'github_summary')
    fs.writeFileSync(summaryPath, '')

    const repo = {
      cwd,
      fakeGhDir,
      outputPath,
      summaryPath,
      headSha,
      mergeSha,
      featureShas: [headSha],
    }
    writeHappyPath(repo)

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it('runs all checks when pulls head.sha is not the second parent of the merge commit', () => {
    const repo = makeRepo()
    writeHappyPath(repo)
    const initialCommitSha = git(repo.cwd, 'rev-list', '--max-parents=0', 'HEAD')
    writePulls(repo, { headSha: initialCommitSha })

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it.each([
    '0123456789abcdef0123456789abcdef01234567',
    'main',
  ])('runs all checks when head.sha is invalid: %s', (invalidHead) => {
    const repo = makeRepo()
    writeHappyPath(repo)
    writePulls(repo, { headSha: invalidHead })

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it('runs all checks when GITHUB_SHA is a regular commit rather than a merge commit', () => {
    const repo = makeRepo()
    writeHappyPath(repo)
    const nonMergeSha = git(repo.cwd, 'rev-parse', 'HEAD^1')
    writePulls(repo, { mergeSha: nonMergeSha })

    const res = runScript(repo, { sha: nonMergeSha })
    expect(res.verdict).toBe('run')
  })

  it('runs all checks when events.json has base_ref_changed event', () => {
    const repo = makeRepo()
    writeHappyPath(repo)
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'events.json'),
      JSON.stringify([{ event: 'base_ref_changed' }])
    )

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it('runs all checks when base_ref_changed appears in paginated events', () => {
    const repo = makeRepo()
    writeHappyPath(repo)
    const page1 = JSON.stringify([{ event: 'labeled' }])
    const page2 = JSON.stringify([{ event: 'base_ref_changed' }])
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'events.json'),
      `${page1}\n${page2}\n`
    )

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it.each([
    {
      desc: 'missing',
      action: (fakeGhDir: string) => {
        fs.rmSync(path.join(fakeGhDir, 'events.json'), { force: true })
      },
    },
    {
      desc: 'empty file',
      action: (fakeGhDir: string) => {
        fs.writeFileSync(path.join(fakeGhDir, 'events.json'), '')
      },
    },
    {
      desc: 'not JSON',
      action: (fakeGhDir: string) => {
        fs.writeFileSync(path.join(fakeGhDir, 'events.json'), 'invalid json {{{')
      },
    },
  ])('runs all checks when events.json is $desc', ({ action }) => {
    const repo = makeRepo()
    writeHappyPath(repo)
    action(repo.fakeGhDir)

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it('runs all checks when runs.json has empty workflow_runs', () => {
    const repo = makeRepo()
    writeHappyPath(repo)
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'runs.json'),
      JSON.stringify({ total_count: 0, workflow_runs: [] })
    )

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it.each([
    {
      desc: 'different path',
      run: {
        id: 501,
        path: '.github/workflows/deploy.yml',
        event: 'pull_request',
        status: 'completed',
        conclusion: 'success',
      },
    },
    {
      desc: 'different event',
      run: {
        id: 501,
        path: '.github/workflows/pr-checks.yml',
        event: 'workflow_dispatch',
        status: 'completed',
        conclusion: 'success',
      },
    },
  ])('runs all checks when workflow run is not a PR Checks pull_request run ($desc)', ({ run }) => {
    const repo = makeRepo()
    writeHappyPath(repo)
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'runs.json'),
      JSON.stringify({ total_count: 1, workflow_runs: [run] })
    )

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it.each([
    {
      desc: "single run display_title is 'PR Checks for #999 into develop' (other PR and base)",
      runs: [
        {
          id: 501,
          path: '.github/workflows/pr-checks.yml',
          event: 'pull_request',
          status: 'completed',
          conclusion: 'success',
          display_title: 'PR Checks for #999 into develop',
        },
      ],
      setupJobs: undefined,
    },
    {
      desc: "single run display_title is 'PR Checks for #100 into develop' (same PR, different base)",
      runs: [
        {
          id: 501,
          path: '.github/workflows/pr-checks.yml',
          event: 'pull_request',
          status: 'completed',
          conclusion: 'success',
          display_title: 'PR Checks for #100 into develop',
        },
      ],
      setupJobs: undefined,
    },
    {
      desc: "single run display_title is 'PR Checks for #999 into main' (different PR, same base)",
      runs: [
        {
          id: 501,
          path: '.github/workflows/pr-checks.yml',
          event: 'pull_request',
          status: 'completed',
          conclusion: 'success',
          display_title: 'PR Checks for #999 into main',
        },
      ],
      setupJobs: undefined,
    },
    {
      desc: "single run display_title is 'PR Checks for #1000 into main' (PR number prefix overlap)",
      runs: [
        {
          id: 501,
          path: '.github/workflows/pr-checks.yml',
          event: 'pull_request',
          status: 'completed',
          conclusion: 'success',
          display_title: 'PR Checks for #1000 into main',
        },
      ],
      setupJobs: undefined,
    },
    {
      desc: "single run display_title is 'Fix the thing' (legacy run without title format)",
      runs: [
        {
          id: 501,
          path: '.github/workflows/pr-checks.yml',
          event: 'pull_request',
          status: 'completed',
          conclusion: 'success',
          display_title: 'Fix the thing',
        },
      ],
      setupJobs: undefined,
    },
    {
      desc: 'single run display_title field is missing',
      runs: [
        {
          id: 501,
          path: '.github/workflows/pr-checks.yml',
          event: 'pull_request',
          status: 'completed',
          conclusion: 'success',
        },
      ],
      setupJobs: undefined,
    },
    {
      desc: "two runs: 501 is 'PR Checks for #100 into main', 502 is 'PR Checks for #999 into develop', both successful",
      runs: [
        {
          id: 501,
          path: '.github/workflows/pr-checks.yml',
          event: 'pull_request',
          status: 'completed',
          conclusion: 'success',
          display_title: 'PR Checks for #100 into main',
        },
        {
          id: 502,
          path: '.github/workflows/pr-checks.yml',
          event: 'pull_request',
          status: 'completed',
          conclusion: 'success',
          display_title: 'PR Checks for #999 into develop',
        },
      ],
      setupJobs: (fakeGhDir: string) => {
        fs.writeFileSync(
          path.join(fakeGhDir, 'jobs-502.json'),
          JSON.stringify(defaultJobs(502))
        )
      },
    },
  ])('runs all checks when display_title does not match PR: $desc', ({ runs, setupJobs }) => {
    const repo = makeRepo()
    writeHappyPath(repo)
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'runs.json'),
      JSON.stringify({ total_count: runs.length, workflow_runs: runs })
    )
    if (setupJobs) {
      setupJobs(repo.fakeGhDir)
    }

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })


  it.each([
    { status: 'completed', conclusion: 'cancelled' },
    { status: 'completed', conclusion: 'failure' },
    { status: 'in_progress', conclusion: null },
  ])(
    'runs all checks when one of multiple PR Checks runs is not success ($status, $conclusion)',
    ({ status, conclusion }) => {
      const repo = makeRepo()
      writeHappyPath(repo)
      fs.writeFileSync(
        path.join(repo.fakeGhDir, 'runs.json'),
        JSON.stringify({
          total_count: 2,
          workflow_runs: [
            {
              id: 501,
              path: '.github/workflows/pr-checks.yml',
              event: 'pull_request',
              status: 'completed',
              conclusion: 'success',
              display_title: 'PR Checks for #100 into main',
            },
            {
              id: 502,
              path: '.github/workflows/pr-checks.yml',
              event: 'pull_request',
              status,
              conclusion,
              display_title: 'PR Checks for #100 into main',
            },
          ],
        })
      )

      fs.writeFileSync(
        path.join(repo.fakeGhDir, 'jobs-502.json'),
        JSON.stringify(defaultJobs(502))
      )

      const res = runScript(repo)
      expect(res.verdict).toBe('run')
    }
  )

  it('skips when multiple PR Checks runs are all successful with valid jobs', () => {
    const repo = makeRepo()
    writeHappyPath(repo)
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'runs.json'),
      JSON.stringify({
        total_count: 2,
        workflow_runs: [
          {
            id: 501,
            path: '.github/workflows/pr-checks.yml',
            event: 'pull_request',
            status: 'completed',
            conclusion: 'success',
            display_title: 'PR Checks for #100 into main',
          },
          {
            id: 502,
            path: '.github/workflows/pr-checks.yml',
            event: 'pull_request',
            status: 'completed',
            conclusion: 'success',
            display_title: 'PR Checks for #100 into main',
          },
        ],
      })
    )
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'jobs-502.json'),
      JSON.stringify(defaultJobs(502))
    )

    const res = runScript(repo)
    expect(res.verdict).toBe('skip')
  })

  it('runs all checks when a secondary run has a failing job', () => {
    const repo = makeRepo()
    writeHappyPath(repo)
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'runs.json'),
      JSON.stringify({
        total_count: 2,
        workflow_runs: [
          {
            id: 501,
            path: '.github/workflows/pr-checks.yml',
            event: 'pull_request',
            status: 'completed',
            conclusion: 'success',
            display_title: 'PR Checks for #100 into main',
          },
          {
            id: 502,
            path: '.github/workflows/pr-checks.yml',
            event: 'pull_request',
            status: 'completed',
            conclusion: 'success',
            display_title: 'PR Checks for #100 into main',
          },
        ],
      })
    )
    const jobs502 = defaultJobs(502)
    for (const job of jobs502.jobs) {
      if (job.name === 'Run Tests') {
        job.conclusion = 'failure'
      }
    }
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'jobs-502.json'),
      JSON.stringify(jobs502)
    )

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it.each(['Lint', 'Run Tests', 'E2E Tests', 'Security Audit'])(
    'runs all checks when %s job is missing from jobs response',
    (missingJob) => {
      const repo = makeRepo()
      writeHappyPath(repo)
      const jobs = defaultJobs(501)
      jobs.jobs = jobs.jobs.filter((j) => j.name !== missingJob)
      fs.writeFileSync(
        path.join(repo.fakeGhDir, 'jobs-501.json'),
        JSON.stringify(jobs)
      )

      const res = runScript(repo)
      expect(res.verdict).toBe('run')
    }
  )

  it.each([
    { status: 'completed', conclusion: 'skipped' },
    { status: 'completed', conclusion: 'cancelled' },
    { status: 'completed', conclusion: 'failure' },
    { status: 'completed', conclusion: 'timed_out' },
    { status: 'in_progress', conclusion: null },
  ])(
    'runs all checks when E2E Tests job has status $status and conclusion $conclusion',
    ({ status, conclusion }) => {
      const repo = makeRepo()
      writeHappyPath(repo)
      const jobs = defaultJobs(501)
      for (const j of jobs.jobs) {
        if (j.name === 'E2E Tests') {
          j.status = status
          j.conclusion = conclusion as any
        }
      }
      fs.writeFileSync(
        path.join(repo.fakeGhDir, 'jobs-501.json'),
        JSON.stringify(jobs)
      )

      const res = runScript(repo)
      expect(res.verdict).toBe('run')
    }
  )

  it('runs all checks when E2E Tests job has both success and cancelled runs', () => {
    const repo = makeRepo()
    writeHappyPath(repo)
    const jobs = defaultJobs(501)
    jobs.jobs.push({
      name: 'E2E Tests',
      status: 'completed',
      conclusion: 'cancelled',
      html_url: 'https://github.com/org/repo/actions/runs/501/jobs/old',
    })
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'jobs-501.json'),
      JSON.stringify(jobs)
    )

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it('skips when jobs response is paginated across two JSON objects and all are successful', () => {
    const repo = makeRepo()
    writeHappyPath(repo)
    const page1 = {
      total_count: 2,
      jobs: [
        {
          name: 'Lint',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/1',
        },
        {
          name: 'Run Tests',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/2',
        },
      ],
    }
    const page2 = {
      total_count: 2,
      jobs: [
        {
          name: 'E2E Tests',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/3',
        },
        {
          name: 'Security Audit',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/4',
        },
      ],
    }
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'jobs-501.json'),
      `${JSON.stringify(page1)}\n${JSON.stringify(page2)}\n`
    )

    const res = runScript(repo)
    expect(res.verdict).toBe('skip')
  })

  it('runs all checks when paginated jobs response has a failure on second page', () => {
    const repo = makeRepo()
    writeHappyPath(repo)
    const page1 = {
      total_count: 2,
      jobs: [
        {
          name: 'Lint',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/1',
        },
        {
          name: 'Run Tests',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/2',
        },
      ],
    }
    const page2 = {
      total_count: 2,
      jobs: [
        {
          name: 'E2E Tests',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/3',
        },
        {
          name: 'Security Audit',
          status: 'completed',
          conclusion: 'failure',
          html_url: 'https://github.com/4',
        },
      ],
    }
    fs.writeFileSync(
      path.join(repo.fakeGhDir, 'jobs-501.json'),
      `${JSON.stringify(page1)}\n${JSON.stringify(page2)}\n`
    )

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it.each([
    { file: 'runs.json', empty: false },
    { file: 'runs.json', empty: true },
    { file: 'jobs-501.json', empty: false },
    { file: 'jobs-501.json', empty: true },
  ])('runs all checks when $file is missing or empty (empty: $empty)', ({ file, empty }) => {
    const repo = makeRepo()
    writeHappyPath(repo)
    if (empty) {
      fs.writeFileSync(path.join(repo.fakeGhDir, file), '')
    } else {
      fs.rmSync(path.join(repo.fakeGhDir, file), { force: true })
    }

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it.each([
    {
      desc: 'empty array',
      setup: (r: RepoSetup) =>
        fs.writeFileSync(path.join(r.fakeGhDir, 'pulls.json'), '[]'),
    },
    {
      desc: 'missing',
      setup: (r: RepoSetup) =>
        fs.rmSync(path.join(r.fakeGhDir, 'pulls.json'), { force: true }),
    },
    {
      desc: 'empty file',
      setup: (r: RepoSetup) =>
        fs.writeFileSync(path.join(r.fakeGhDir, 'pulls.json'), ''),
    },
    {
      desc: 'invalid JSON',
      setup: (r: RepoSetup) =>
        fs.writeFileSync(path.join(r.fakeGhDir, 'pulls.json'), '{{{'),
    },
    {
      desc: 'different merge_commit_sha',
      setup: (r: RepoSetup) =>
        writePulls(r, { mergeSha: '1234567890abcdef1234567890abcdef12345678' }),
    },
    {
      desc: 'null merged_at',
      setup: (r: RepoSetup) => writePulls(r, { mergedAt: null }),
    },
    {
      desc: 'base.ref is develop',
      setup: (r: RepoSetup) => writePulls(r, { baseRef: 'develop' }),
    },
    {
      desc: 'two matching items',
      setup: (r: RepoSetup) => {
        const item1 = defaultPullItem(r, 100)
        const item2 = defaultPullItem(r, 101)
        fs.writeFileSync(
          path.join(r.fakeGhDir, 'pulls.json'),
          JSON.stringify([item1, item2])
        )
      },
    },
    {
      desc: 'number is abc',
      setup: (r: RepoSetup) => writePulls(r, { number: 'abc' }),
    },
  ])('runs all checks when pulls.json has $desc', ({ setup }) => {
    const repo = makeRepo()
    writeHappyPath(repo)
    setup(repo)

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it.each([
    { eventName: 'workflow_dispatch', repository: 'org/repo', sha: undefined },
    { eventName: 'push', repository: 'org/repo', sha: '' },
    { eventName: 'push', repository: '', sha: undefined },
  ])(
    'runs all checks on invalid env: eventName=$eventName, repo=$repository, sha=$sha',
    (opts) => {
      const repo = makeRepo()
      writeHappyPath(repo)

      const res = runScript(repo, {
        eventName: opts.eventName,
        repository: opts.repository,
        sha: opts.sha,
      })
      expect(res.verdict).toBe('run')
    }
  )

  it('runs all checks when main moved a submodule pointer hidden by ignore=all', () => {
    const { cwd, headSha } = makeSubmoduleRepoBase()

    // Move gitlink from SHA A to SHA B on main (gitlink only)
    git(
      cwd,
      'update-index',
      '--add',
      '--cacheinfo',
      '160000,fedcba9876543210fedcba9876543210fedcba98,vendor/lib'
    )
    git(cwd, 'commit', '-q', '-m', 'Move submodule pointer on main')

    expect(git(cwd, 'ls-tree', 'main', 'vendor/lib')).toContain('160000 commit')

    // Normal merge
    git(cwd, 'merge', '-q', '--no-ff', 'feature', '-m', 'Merge pull request #100')
    const mergeSha = git(cwd, 'rev-parse', 'HEAD')

    const repo = finishSubmoduleRepo(cwd, headSha, mergeSha)
    writeHappyPath(repo)

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it('runs all checks when main moved a submodule pointer and moved it back', () => {
    const { cwd, headSha } = makeSubmoduleRepoBase()

    // Move gitlink from SHA A to SHA B
    git(
      cwd,
      'update-index',
      '--add',
      '--cacheinfo',
      '160000,fedcba9876543210fedcba9876543210fedcba98,vendor/lib'
    )
    git(cwd, 'commit', '-q', '-m', 'Move submodule pointer on main')

    // Move gitlink back from SHA B to SHA A
    git(
      cwd,
      'update-index',
      '--add',
      '--cacheinfo',
      '160000,0123456789abcdef0123456789abcdef01234567,vendor/lib'
    )
    git(cwd, 'commit', '-q', '-m', 'Revert submodule pointer back on main')

    expect(git(cwd, 'ls-tree', 'main', 'vendor/lib')).toContain('160000 commit')

    // Normal merge
    git(cwd, 'merge', '-q', '--no-ff', 'feature', '-m', 'Merge pull request #100')
    const mergeSha = git(cwd, 'rev-parse', 'HEAD')

    const repo = finishSubmoduleRepo(cwd, headSha, mergeSha)
    writeHappyPath(repo)

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it('runs all checks when only the merge commit itself changes a submodule pointer hidden by ignore=all', () => {
    const { cwd, headSha } = makeSubmoduleRepoBase()

    // Main: document commit only (stage docs/recovery/HANDOFF.md only, never git add -A)
    fs.mkdirSync(path.join(cwd, 'docs/recovery'), { recursive: true })
    fs.writeFileSync(
      path.join(cwd, 'docs/recovery/HANDOFF.md'),
      'updated handoff\n'
    )
    git(cwd, 'add', 'docs/recovery/HANDOFF.md')
    git(cwd, 'commit', '-q', '-m', 'Update docs on main')

    expect(git(cwd, 'ls-tree', 'main', 'vendor/lib')).toContain('160000 commit')

    // Merge: stop before commit and change gitlink to SHA B in merge commit itself
    git(cwd, 'merge', '-q', '--no-ff', '--no-commit', 'feature')
    git(
      cwd,
      'update-index',
      '--add',
      '--cacheinfo',
      '160000,fedcba9876543210fedcba9876543210fedcba98,vendor/lib'
    )
    git(cwd, 'commit', '-q', '-m', 'Merge pull request #100')
    const mergeSha = git(cwd, 'rev-parse', 'HEAD')

    const repo = finishSubmoduleRepo(cwd, headSha, mergeSha)
    writeHappyPath(repo)

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })

  it('runs all checks when the pull request head is an ancestor of the merged branch, not its tip', () => {
    const repo = makeRepo(
      undefined,
      [
        { 'src/feature.ts': 'export const feature = 1\n' },
        { 'docs/recovery/notes.md': '# Notes\n' },
      ]
    )
    writeHappyPath(repo)
    writePulls(repo, { headSha: repo.featureShas[0] })

    const res = runScript(repo)
    expect(res.verdict).toBe('run')
  })
})
