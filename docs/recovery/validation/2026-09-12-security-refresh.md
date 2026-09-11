# Security dependency refresh validation

Date: 2026-09-12
PR153 head: eea2cad
Worktree: /Users/h0977/dev/ClairKeys/.worktrees/security-dependencies

## Baseline and exact updates

`npm audit --audit-level=high --json` exited1: moderate1/high2/critical1.
Next15.5.21→15.5.25; sharp0.35.3→0.35.4; js-yaml3.15.1/4.3.1→3.15.2/4.3.2;
@humanfs/node0.16.7→0.16.8 with core0.19.2. Associated Next/sharp platform packages updated.
No security threshold or suppression changed. Sharp override stays within0.35; YAML keeps its majors.

## Verification

- `npm install --package-lock-only --ignore-scripts --no-fund`, followed by
  `npm update @humanfs/node --package-lock-only --ignore-scripts --no-fund` updates the manifests.
- `npm ci --no-fund`: clean installation succeeded; `npm audit --audit-level=high --json`:0 findings.
- `PYTHON_BIN=/Users/h0977/dev/ClairKeys/.worktrees/callback-review/.venv-review/bin/python npm test -- --runInBand`:102 suites/995 pass.
- `npx tsc --noEmit`: exit0; `npm run lint`: pass.
- `npm run build </dev/null`: pass with only local-test DATABASE_URL/NEXTAUTH_URL/NEXTAUTH_SECRET.
  Type/lint were run separately because build skips them internally.
- `npx playwright test --config=.review-playwright.config.ts --workers=1 --reporter=line`:
  50 passed in46.5s. Temporary config imports repository config, changes only baseURL/server to
  localhost3001 and starts the already validated build. Temporary config removed after the run.
- Node sharp smoke created8x8 RGB pixels, encoded AVIF and decoded PNG, asserting8x8 dimensions:
  PASS on sharp0.35.4. No external image or production data used.
- `git diff --check`: pass. Hosted results recorded in PR153 log.

## Limits

No main merge, production deployment, or application behavior changes. Live vulnerability
exploitability is not asserted; these updates address the audit's reported vulnerable versions.

## Hosted completion

Exact PR153 head eea2cad6dea948f8b0f0ad7d256de1abe84db353 has14 successful check-runs.
Both E2E jobs and all mandatory gates pass. No unresolved review feedback was returned.
Await explicit merge approval before changing main code; PR151/152 need subsequent propagation.
