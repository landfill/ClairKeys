# Validation — P1-A/provenance backfill

Date: 2026-08-29
Commit: `a7745c335795f4723549835b8885da67232d15ce`
Environment: macOS, Node 22.18.0, Prisma 6.19.3; Vercel production environment via temporary directory

## Claim being verified

P1-A can distinguish new OMR rows, exact historical demo rows, and ambiguous legacy rows without
deleting user data or hiding uncertain scores. Confirmed demos are absent from public browsing and
carry an explicit warning before playback.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| Focused Jest before implementation | FAIL (expected) | 4 suites failed: matcher/notice absent and API provenance behavior missing; 10 tests passed |
| Focused provenance Jest after implementation | PASS | 4 suites, 13 tests |
| Review regression before fix | FAIL (expected) | missing configuration preflight and active warning overlay: 2 tests failed |
| Review regression after fix | PASS | 2 suites, 8 tests |
| `npm test -- --runInBand` | PASS | 62 suites, 591 tests |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm run lint` | PASS | no warnings or errors |
| `npm run build` | PASS | production build and 41 static pages completed |
| PR #84 hosted checks | PASS | final head `a7745c3`: Build, Unit, two E2E jobs, type/lint, accessibility, Security Scan/Audit, CodeQL, Vercel |
| `DATABASE_URL=postgresql://user:pass@localhost:5432/clairkeys npx prisma validate` | PASS | schema valid |
| production dry-run | PASS | total 5; `omr=3`, `demo=0`, `unknown=2`, `fetchFailures=0` |
| production schema/history inspection | PASS | prior migrations 3/3 finished; provenance column absent before apply |
| `prisma migrate deploy` via Supabase session pooler 5432 | PASS | `20260829012000_add_sheet_provenance` applied |
| production backfill `--apply` | PASS | total 5; `omr=3`, `demo=0`, `unknown=2`, `fetchFailures=0` |
| post-apply DB invariant query | PASS | `omr=3`, `unknown=2`; OMR rows lacking `omrJobId`: 0; migration `finished=true` |
| post-review production dry-run | PASS | total 5; `omr=3`, `demo=0`, `unknown=2`, `fetchFailures=0` |

## Baseline comparison

- Fixed failures: stored demo data had no source marker, could appear publicly, and looked like a
  real PDF conversion on its playback page.
- Remaining pre-existing failures: none in local type/lint/unit/build gates.
- New failures: none observed locally.

## Manual checks

- Confirmed the PR is review-ready and mergeable at head `2186cbc`.
- Confirmed all hosted repository checks succeeded; Vercel Preview proves build only and does not
  prove the production database migration.
- The first migration attempt through transaction pooler port 6543 made no change; schema and
  migration history were both re-queried before retrying through session pooler port 5432.
- Production migration and backfill then completed in the required order. No row was deleted.
- CodeRabbit's two actionable findings were reproduced, fixed at `a7745c3`, answered, and resolved.
  Configuration validation now precedes candidate fetches and all writes; the warning remains a
  fixed overlay during active playback without taking flow-layout height.
- Vercel environment files were downloaded only under `/private/tmp` and were not written to the
  repository.

## Gaps and risks

- The production DB is ready before code deployment; do not reverse that ordering in rollback or
  future environments.
- Production currently has no confirmed `demo` row, so the real-data warning screen cannot be
  observed. Matcher, public-list exclusion, and warning rendering are fixed by regression tests.
- PR #84 still requires explicit user approval before merge, followed by production public-list and
  playback smoke checks.
- Never convert `unknown` to `demo` from the first-pass filter alone.
