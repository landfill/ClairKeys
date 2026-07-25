# Validation — P1-A/canonical-upload-only

Date: 2026-07-25
Commit: `889ec36` (branch `codex/p1-upload-canonical-only`, PR #35)
Environment: macOS (Darwin 25.5.0), Node via local `npx`, Jest jsdom; no database, no OMR service

## Claim being verified

That no code path remaining in ClairKeys can store `pdfParser`'s fabricated animation data as a
`SheetMusic` row, and that the upload page offers only the canonical path — the end state D-010
stages 3–5 specify.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| `npx jest src/app/api/__tests__/uploadPathInventory.test.ts` (before implementation) | FAIL — 6 of 9 | Regression evidence recorded first, per `AGENTS.md` |
| `npx jest src/app/api/__tests__/uploadPathInventory.test.ts` (after) | PASS — 9/9 | |
| `npm test` | PASS | 41 suites / 386 tests |
| `npx tsc --noEmit` | PASS | exit 0, after `rm -rf .next` |
| `npm run build` | PASS | full production build, all routes emitted |
| `npm run lint` | PASS | "No ESLint warnings or errors" |

## What the end state pins

- **Writers**: `prisma.sheetMusic.create` now has **three** call sites, down from six —
  `src/app/api/omr/upload/route.ts`, `src/app/api/sheet/route.ts`,
  `src/repositories/SheetMusicRepository.ts`. None imports `pdfParser`. The two demo processors lost
  persistence entirely rather than having it guarded.
- **Upload page**: `uploadMode`, `MultiStageUploadUI`, and `BackgroundFileUpload` no longer appear in
  `src/app/upload/page.tsx`.
- **Deleted**: `src/app/api/upload/route.ts`, `src/hooks/useFileUpload.ts`, and its test. A
  repository-wide scan for `/api/upload` and `useFileUpload` returns zero product references.
- **Demo generator**: `assertDemoGenerationAllowed()` throws when `NODE_ENV === 'production'`, and no
  product module imports `pdfParser` at runtime. `musicDataConverter.ts` retains a type-only import.
- **Migration identifiers preserved**: `omrJobId` is still set only on the real path, and the three
  demo melody literals are unchanged — D-010's classification of already-stored rows depends on both.

## Baseline comparison

- Fixed failures: none in the sense of previously-red tests; this commit changes behaviour rather
  than repairing a broken build.
- Remaining pre-existing failures: none. All gates were green at `aca4073` (PR #34's merge commit)
  and remain green.
- New failures: none.
- Test count moves 395 → 386: `useFileUpload.test.ts` (9 tests) was deleted with its subject, and
  `uploadPathInventory.test.ts` stays at 9 tests after its rewrite.

## Manual checks

- Read both processors end to end after rewriting to confirm no persistence path survives, including
  the retry branch: `backgroundProcessor.processJob` deliberately bypasses `handleJobError` so a
  `CONVERSION_UNAVAILABLE` job is not retried three times.
- Confirmed the production build emits `/upload` and no `/api/upload` route.

## Gaps and risks

- **No upload was performed.** No live OMR service, no database, no authenticated session. The claim
  that upload now fails visibly rests on reading the code and on issue #22's earlier diagnosis, not
  on a reproduction.
- `assertDemoGenerationAllowed()`'s production branch was not exercised — Jest runs with
  `NODE_ENV === 'test'`.
- **`tsc` reports three stale errors after deleting a route** until `.next` is removed:
  `.next/types/app/api/upload/route.ts` and `.next/types/validator.ts` still reference the deleted
  module. A clean rebuild clears them. Recorded because the same three errors will appear the next
  time a session deletes a route, and they look like real type errors.
- `MultiStageUploadUI`, `BackgroundFileUpload`, and `musicDataConverter` now have zero product
  callers but remain in the tree. Deleting them cascades into three more components that take types
  from `MultiStageUploadUI`; that is P2-A's dead-layer work, deliberately out of scope here.
