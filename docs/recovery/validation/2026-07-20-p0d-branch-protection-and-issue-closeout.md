# Validation — P0-D/branch-protection-and-issue-closeout

Date: 2026-07-20
Commit: `5ec5e84`
Environment: `gh CLI against github.com/landfill/ClairKeys`

## Claim being verified

- `main` has branch protection with required status checks wired (issue #9).
- Issue #7's Playwright modernization is satisfied by the code already merged in PR #12.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| `gh api repos/landfill/ClairKeys/commits/5ec5e84.../check-runs` | PASS | `Lint`, `Security Audit`, `Run Tests`, `E2E Tests`, `Build application`, `Test before deploy` all `success` on the `main` merge commit |
| `grep -rn "isMobile\|hasText" e2e/` | PASS | no matches; the specs that used the removed APIs (`piano-player.spec.ts`, `sheet-music-workflow.spec.ts`) no longer exist |
| `git log --diff-filter=D -- e2e/piano-player.spec.ts e2e/sheet-music-workflow.spec.ts` | PASS | both files were removed in `fc0df1f`, replaced by `e2e/application-smoke.spec.ts` (15 cross-browser smoke checks) |
| `gh api repos/landfill/ClairKeys/branches/main/protection` (before) | FAIL (expected) | `404 Branch not protected` |
| `gh api -X PUT repos/landfill/ClairKeys/branches/main/protection --input branch_protection.json` | PASS | applied by the user directly; the classifier blocking the agent from writing repository-admin settings was respected |
| `gh api repos/landfill/ClairKeys/branches/main/protection` (after) | PASS | `required_status_checks.contexts` = `["Lint","Security Audit","Run Tests","E2E Tests"]`, `strict: false`, `enforce_admins: false` |
| `gh issue close 7` / `gh issue close 9` | PASS | both issues closed with evidence comments linking PR #12 and the protection payload |

## Baseline comparison

- Fixed failures:
  - Issue #7: aspirational Playwright specs (dashboard/auth fixtures that do not exist in the product) no longer block CI; replaced by executable smoke coverage.
  - Issue #9: `main` merges can no longer land while `Lint`, `Security Audit`, `Run Tests`, or `E2E Tests` are red, closing the gap that allowed PR #4 to merge with a red CI.
- Remaining pre-existing failures:
  - `main` merge commit's `Run database migrations`, `Deploy to production`, `Notify deployment status` jobs still fail.
    - Baseline command: `gh api repos/landfill/ClairKeys/commits/5ec5e84.../check-runs`
    - Observed at (commit/CI/date): `5ec5e84`, 2026-07-20
    - Evidence record: this file; no dedicated GitHub issue exists yet
- New failures: none observed.

## Manual checks

- Confirmed no open PRs and no unresolved comments on issue #7 before closing, to avoid colliding with the in-flight `docs/recovery` automation (P0-D handoff lineage, PR #12/#13).
- Confirmed `git ls-remote --heads origin` had no active `codex/p0d-*` branch in flight at the time of this change.

## Gaps and risks

- Whether `main` should also require pull requests / forbid direct pushes (issue #9's fourth checklist item) is still an open operational decision; branch protection currently only gates the PR merge button, not direct pushes by users with push access.
- The post-merge deployment failures (`Run database migrations`, `Deploy to production`, `Notify deployment status`) are undocumented as a GitHub issue; tracked here as a known gap, not fixed.
