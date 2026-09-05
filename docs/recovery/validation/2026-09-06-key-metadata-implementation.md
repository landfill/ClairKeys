# 2026-09-06 — OMR-Q1 metadata fix implemented and independently reviewed

Code `038ee1ca2faae13d2d4318bcb7841136a9243d44` on `codex/omr-key-signature-integrity`.
Decision/phase prepared first in5ee4566. No merge/deployment or musical-recognition repair is claimed.

## Contract and implementation

First declared traditional key only; -7..7 major/minor ASCII names; absent mode retains historical
major-name convention. Missing/malformed/out-of-range/unsupported declarations are omitted from JSON
through existing optional-string canonical handling. They no longer invent C or abort valid note conversion.
Mode/key changes, non-traditional keys, namespaces and stored-score rewriting remain out of scope.

Sol implemented the bounded contract and regression tests. Luna independently reviewed code/fixtures and
reproduced a5000-digit ValueError plus Unicode-digit acceptance. Coordinator added failing tests then fixed
ASCII lexical parsing and bounded magnitude before integer conversion (including long valid leading zeros).
The complete Python matrix is explicitly bridged into Jest CI, in addition to the raw CLI metadata gate.

## Regression-first and final verification

- Before implementation: Python5 tests,28 failing subtests/3 errors; raw-CLI/normalizer Jest7 failed/21 passed.
- After Sol's implementation: focused28/full971 Jest and82 Python passed; this was not the final boundary fix.
- New coordinator numeric-boundary test before fix:3 errors and1 failure across giant/Unicode cases.
- Final: **102 suites /972 Jest tests PASS**, **83 Python service tests PASS**, independent typecheck/lint/build
  PASS, whitespace check PASS. Build skips its internal type/lint; separate commands supplied those checks.
- Final focused key/canonical/golden corpus:3 suites/44 tests PASS; extractor matrix6 tests PASS.

```sh
npm test -- --runInBand
PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Coordinator replayed real retained XML with original validation title/composer; compared every top-level
field/nested note except generated_at. Always's only additional difference is the corrected key:

| Source | Notes | Before key | After key | Other non-generated fields |
| --- | ---: | --- | --- | --- |
| Always With Me | 647 | C | F | exactly equal |
| Satie original | 239 | D | D | exactly equal |
| Love Affair solo | 411 | E | E | exactly equal |

Existing golden animation fixtures all declare fifths0; no stale key expectation needed changing.
Raw sample PDFs and captured test assets remain Git-excluded. No migration or production write.

## Model provenance and review disposition

Run `run_53f04f95438d`, current shared checkout; no separate worktree or overlapping code writers.

- Sol implementation: `task_9078c1b538ea` / `ctx_6ad7aef60788`, requested/effective `gpt-5.6-sol`, succeeded/released.
- Luna independent implementation review: `task_97ce2c1fb990` / `ctx_862e5104ecd5`, requested/effective
  `gpt-5.6-luna`, succeeded/released. Both actionable findings fixed and regression-verified.
- Original Sol/Luna read-only contract tasks and released resources are in the earlier multimodel checkpoint.
- Opus architecture review `ctx_45a4e0154a8f` completed and was released. Its proposals are **not implementation**.
  Coordinator accepted investigating page/staff coverage, scale, whole-note loss and missing tempo, but corrected:
  (a) Love has31 printed bars and the captured XML already exists with29, missing21/31;
  (b)411-note output is not ground truth; (c) differing image encodings, scale, layout and overlays are not a
  controlled DPI experiment; (d) coverage60% and target interline28–40 are unvalidated guesses;
  (e) D-048 boundaries must not be silently changed, and a whole-note duration histogram alone does not prove
  a detector root cause or justify assuming every other piece lacks whole-note symbols (whole rests exist).
- AGY model discovery succeeded but no AGY task has run; do not claim it contributed implementation.

## Additional preliminary probe, not production policy

Coordinator ran local Tesseract on manually selected header strips rendered from Always, Love and Satie.
It read numeric43 and60 for Always/Love and no numeric tempo from Satie's text. Beat-unit glyphs were not
reliably transcribed (`I=43`, `J=60`), so this is only a possible extraction path, not a validated automatic
tempo fix. Coordinates were manually selected; no runtime header-selection or tempo injection was added.

Audiveris5.11.0 official ProcessingSwitches source confirms `multiWholeHeadChords` is already true by
default; whole-note loss cannot be explained simply by that option being off. Official CLI source confirms
`-sheets` accepts page numbers/ranges; a page-selection experiment remains distinct from a safe automatic policy.

## Remaining gates

Verify exact committed code against VM Python3.10 dependencies, submit review-ready PR, inspect hosted CI
and feedback, then seek target-PR merge/production rollout approvals. Source recognition experiments follow
as a separate decision/branch and must improve reference events, not merely return success or reduce warnings.

## Exact VM-dependency verification and PR

Exact038ee1c was exported without source PDFs/secrets into `/data/analysis/key-038ee1c`; separate Python
interpreter in the existing container, PYTHONPATH=. and cwd that checkout's omr-service, ran all83 tests
PASS (0.410s). Production `/app` and image remain unchanged. Review-ready PR143 submitted at92c8e1b;
hosted gates and approval/merge/rollout remain pending in its review log.
