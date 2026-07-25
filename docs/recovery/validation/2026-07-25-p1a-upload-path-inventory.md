# Validation — P1-A/upload-path-inventory

Date: 2026-07-25
Commit: `9ac3a1e` (branch `codex/p1-upload-pipeline`, PR #34)
Environment: macOS (Darwin 25.5.0), Node via local `npx`, Jest jsdom; no database, no OMR service

## Claim being verified

That ClairKeys has four PDF upload entry points, that exactly one of them
converts a score, and that the other three persist fabricated animation data as
ordinary `SheetMusic` rows — the state D-010 decides how to resolve.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| `npx jest src/app/api/__tests__/uploadPathInventory.test.ts` | PASS | 6/6 tests; new suite |
| `npm test` | PASS | 42 suites / 392 tests (was 41 / 386 at `44740b3`) |
| `npx tsc --noEmit` | PASS | exit 0, no output |
| `npm run lint` | PASS | "No ESLint warnings or errors" |

## Findings the inventory pins

| Path | UI entry point | Converter reached |
|---|---|---|
| `/api/omr/upload` | `OMRUploadForm` — upload page default mode (`src/app/upload/page.tsx:21`) | Real: `${OMR_SERVICE_URL}/process` |
| `/api/upload-async` | `MultiStageUploadUI` (`immediate` mode) | Demo: `asyncUploadProcessor` → `pdfParser` |
| `/api/processing` | `BackgroundFileUpload` (`background` mode) | Demo: `backgroundProcessor` → `pdfParser` |
| `/api/upload` | none — zero product callers | Demo: `pdfParser` directly |

- `src/services/pdfParser.ts` selects its output with `bufferLength % melodyVariations.length`
  inside `createEnhancedDemo()`. File length, not file content, determines the melody.
- `asyncUploadProcessor.ts:196` and `backgroundProcessor.ts:140` both call
  `prisma.sheetMusic.create` with a real `animationDataUrl` and no `isDemo`/`isSynthetic`/
  `source: 'demo'` marker. Nothing downstream can tell a demo row from a converted one.
- `asyncUploadProcessor.ts:57` runs `simulateProgress(sessionId, 'omr', 25000, ...)` — 25 seconds
  of fabricated progress for a stage that never executes.
- `/api/processing-queue` is a read-only listing endpoint, not a fourth upload path. An earlier
  reading of the route map treated it as one; `src/hooks/useBackgroundProcessing.ts:176` shows the
  background submit target is `/api/processing`.

## Baseline comparison

- Fixed failures: none — this commit adds tests only, changes no behaviour.
- Remaining pre-existing failures: none. `npm test`, `tsc`, and `lint` were all green at `44740b3`
  (previous `main` HEAD) and remain green.
- New failures: none.

## Manual checks

- Read all four route handlers and both processors in full to confirm the converter each reaches.
- Confirmed by repository-wide scan that `useFileUpload` — the only caller of `/api/upload` — has no
  importer outside its own test file. The scan is encoded in the test, not left as a one-off.

## Gaps and risks

- No route was executed. The assertions read source text; they establish which module each path
  calls, not what an HTTP request returns. Running these routes under jsdom would need Prisma,
  Supabase, and NextAuth scaffolding larger than the assertions themselves.
- No upload was performed against a live OMR service or database, so the claim "the canonical path
  fails on the server" rests on issue #22's prior diagnosis, not on a fresh reproduction here.
- The three tests under `upload path defects P1-A removes` assert behaviour that stages 3–5 will
  delete. They are expected to go red at that point; the file header records this so a later session
  rewrites them rather than restoring the behaviour to satisfy them.
