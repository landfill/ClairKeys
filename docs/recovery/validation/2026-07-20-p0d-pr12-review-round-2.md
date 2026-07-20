# P0-D PR #12 Review Round 2 Validation

Date: 2026-07-20 KST
Branch: `fix/lint-gate`
PR: https://github.com/landfill/ClairKeys/pull/12

## Scope

- Verify and fix the second automated review round without suppressing lint, type, test, or accessibility gates.
- Preserve committed animation frame values while keeping the long-lived rAF loop stable.
- Restore shortcut defaults, pagination append semantics, and cache payload integrity.
- Delete dead piano redraw and test-page state instead of adding replacement layers.
- Keep the cache cleanup timer active without retaining an otherwise idle Node process.

## Regression evidence before fixes

Focused Jest run: `3 failed, 2 passed` suites.

- `useMobileKeyboardShortcuts`: handled Space did not call `preventDefault` under default config.
- `useSheetMusicSearch`: page IDs became `[3, 1, 2]` instead of `[1, 2, 3]`, with stale pagination metadata.
- `cacheService compression`: browser-storage reload returned a nested `CacheItem` and removed spaces from string payloads.
- `AnimationPlayer`: a mutated event object changed the throttled time from `2` to `9`.
- Existing EnhancedProcessingStatus and new PianoKeyboard behavior locks passed before cleanup.

## Verification after fixes

| Command | Result |
|---|---|
| `npm test -- --runInBand <7 focused suites>` | PASS — 7 suites, 8 tests |
| `npm run lint` | PASS — zero warnings and errors |
| `npx tsc --noEmit` | PASS — exit code 0 |
| `npm test -- --runInBand --detectOpenHandles` | Assertions PASS — identified one existing cache cleanup interval |
| `npm test -- --runInBand` after timer `unref` | PASS — 29 suites, 282 tests; normal exit |
| `npm run build` | BLOCKED_EXTERNAL — Google Fonts DNS failure in sandbox; elevated retry timed out |
| `git diff --check` | PASS |

## Hosted verification state

The prior PR head passed hosted build, lint, typecheck, unit tests, security audit, and security scan after the GitHub Actions outage recovered. Its accessibility job used the old base workflow and failed on the known Chrome/ChromeDriver mismatch addressed separately by PR #11. A new hosted run is required after this review-fix commit is pushed.

## Remaining risk

- Production browser behavior for canvas, keyboard, PushManager, and compressed browser storage is covered by jsdom regressions rather than a manual device pass.
- PR #11 must still make the accessibility workflow reproducible and validate the actual application page.
