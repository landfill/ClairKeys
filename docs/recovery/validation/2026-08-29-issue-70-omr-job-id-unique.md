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

## Migration safety

`CREATE UNIQUE INDEX "SheetMusic_omrJobId_key" ON "SheetMusic"("omrJobId")` is additive. PostgreSQL
allows multiple NULL values in a unique index, preserving rows before the OMR service returns a job
ID. The production duplicate preflight must be repeated immediately before apply; do not apply if any
non-null duplicate group exists.

## Not verified

- Production migration application, deployment, and post-deploy callback smoke check; PR #85 is
  review-ready and awaits explicit user merge approval.
- P1-B durable queue, restart recovery, CORS/file hardening, and callback URL hardening are
  explicitly out of this issue's scope.
