# Validation — P1-A/provenance backfill

Date: 2026-08-29
Commit: `2186cbc085c488b328cefefaac6375b06c202f07`
Environment: macOS, Node 22.18.0, Prisma 6.19.3; production credentials unavailable

## Claim being verified

P1-A can distinguish new OMR rows, exact historical demo rows, and ambiguous legacy rows without
deleting user data or hiding uncertain scores. Confirmed demos are absent from public browsing and
carry an explicit warning before playback.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| Focused Jest before implementation | FAIL (expected) | 4 suites failed: matcher/notice absent and API provenance behavior missing; 10 tests passed |
| Focused provenance Jest after implementation | PASS | 4 suites, 13 tests |
| `npm test -- --runInBand` | PASS | 62 suites, 589 tests |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm run lint` | PASS | no warnings or errors |
| `npm run build` | PASS | production build and 41 static pages completed |
| PR #84 hosted checks | PASS | Build, Unit, two E2E jobs, type/lint, accessibility, Security Scan/Audit, CodeQL, Vercel |
| `DATABASE_URL=postgresql://user:pass@localhost:5432/clairkeys npx prisma validate` | PASS | schema valid |
| `npm run backfill:sheet-provenance` | BLOCKED | Prisma stopped before querying: `DATABASE_URL` not present |
| `vercel whoami` | BLOCKED | no existing credentials |
| `supabase projects list` | BLOCKED | access token not provided |

## Baseline comparison

- Fixed failures: stored demo data had no source marker, could appear publicly, and looked like a
  real PDF conversion on its playback page.
- Remaining pre-existing failures: none in local type/lint/unit/build gates.
- New failures: none observed locally.

## Manual checks

- Confirmed the PR is review-ready and mergeable at head `2186cbc`.
- Confirmed all hosted repository checks succeeded; Vercel Preview proves build only and does not
  prove the production database migration.
- No production row was changed. The backfill command failed before its first query.

## Gaps and risks

- Candidate, confirmed-demo, OMR, unknown, and fetch-failure counts are unknown until credentials
  are available.
- Apply `prisma/migrations/20260829012000_add_sheet_provenance/migration.sql` before deploying code
  that reads `provenance`.
- After migration, run the script without `--apply` first. Review counts, then run with `--apply`
  and repeat the dry-run plus public-list/playback checks.
- Never convert `unknown` to `demo` from the first-pass filter alone.
