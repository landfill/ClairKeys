# Validation — Issue #70 OMR job ID uniqueness

Date: 2026-08-29
Commit: `ab09c3656b98fc3c594ef1c539955ac239dc14d3`
Environment: macOS, Node 22.18.0, Prisma 6.19.3; production duplicate preflight through temporary Vercel environment file

## Claim being verified

An assigned OMR UUID identifies exactly one SheetMusic row and the server-owned completion callback
uses that unique, indexed key. Rows that have not yet received an OMR job ID remain valid.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| Focused finalize regression before implementation | FAIL (expected) | callback used `findFirst`; `findUnique` expectation had zero calls |
| Focused finalize test after implementation | PASS | 1 suite, 6 tests |
| `DATABASE_URL=… npx prisma generate` + `npx prisma validate` | PASS | generated client recognizes nullable unique `omrJobId`; schema valid |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm run lint` | PASS | no warnings or errors |
| `npm test -- --runInBand` | PASS | 62 suites, 591 tests |
| `npm run build` | PASS | production build and 41 static pages completed |
| production duplicate preflight | PASS | 5 rows total; 3 non-null OMR IDs; 0 duplicate non-null groups |
| PR #85 hosted checks | PASS | Build, Unit, two E2E jobs, type/lint, accessibility, Security Scan/Audit, CodeQL, Vercel Preview |
| production migration recheck | PASS | non-null duplicate groups: 0 immediately before apply |
| `20260829020000_make_omr_job_id_unique` | PASS | migration `finished=true`; `SheetMusic_omrJobId_key` unique B-tree index exists |
| PR #85 merge checks | PASS | post-merge build, E2E, two test jobs, lint, Security Audit: 6/6 |
| Vercel Production | PASS | Ready deployment after merge |
| branch containment/cleanup | PASS | local and remote tips contained in main; both branches deleted |

## Migration safety

`CREATE UNIQUE INDEX "SheetMusic_omrJobId_key" ON "SheetMusic"("omrJobId")` is additive. PostgreSQL
allows multiple NULL values in a unique index, preserving rows before the OMR service returns a job
ID. The production duplicate preflight must be repeated immediately before apply; do not apply if any
non-null duplicate group exists.

## Not verified

- A live callback lookup against a retained OMR service job: no such job can be safely manufactured
  in production solely for this verification. The route behavior is covered by the focused
  regression and merge checks.
- P1-B durable queue, restart recovery, CORS/file hardening, and callback URL hardening are
  explicitly out of this issue's scope.
