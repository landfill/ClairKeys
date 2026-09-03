# Issue #118 mobile playback controls validation

Date: 2026-09-03 KST
Branch: `codex/issue-118-mobile-controls`
PR: [#119](https://github.com/landfill/ClairKeys/pull/119)
Corrected head: `5f0b92222f2e0700065a8591f01f109a5faa46d5`

## Change under test

`PlaybackControls` previously kept the three transport buttons and the three loop buttons in a single no-wrap group with a 534px intrinsic width. The primary group now uses a three-column grid below the `md` breakpoint, with the loop group spanning the second row; at `md` and above the previous flex layout is retained. No global overflow rule or `CompactPlaybackBar` change was made.

## Regression-first evidence

- Before implementation, the new focused test failed because `playback-primary-controls` did not exist.
- After implementation, `npm test -- --runInBand src/components/playback/__tests__/PlaybackControls.test.tsx` passed: 1 suite, 6 tests.

## Browser verification

Command:

```text
npx playwright test e2e/application-smoke.spec.ts e2e/playback-controls-responsive.spec.ts --project=chromium
```

Result: PASS, 7/7 tests. The responsive regression checked widths `320`, `375`, `390`, `412`, `430`, `525`, `550`, `1024`, and `1440` pixels. At every width it verified:

- document and body scroll widths do not exceed the viewport;
- all six visible Korean labels remain present;
- every button is at least 44px wide and high;
- mobile computes as `grid`, while `1024px` and `1440px` compute as `flex`.

## Required local verification

| Command | Result |
|---|---|
| `npm test -- --runInBand` | 85/90 suites and 826/848 tests passed. 5 suites/22 tests failed in this checkout on environment-local failures unrelated to the changed files: Python subprocess failures in converter corpus, converter tempo, OMR runtime, and piano samples, plus Windows path-separator expectations in `uploadPathInventory`. This session did not compare the result against `main`. |
| `npx tsc --noEmit` | Failed in this checkout because the environment could not resolve the `web-vitals` module in `src/lib/analytics.ts`; this is unrelated to the changed files and was not compared against `main`. |
| `npm run lint` | PASS; no warnings or errors. |
| `npm run build` | PASS in the escalated environment; compilation and static page generation succeeded. Existing Prisma Windows engine warnings were emitted during page data collection. |
| `git diff --check` | PASS; only Git line-ending normalization warnings. |

The full Jest and typecheck commands were executed and their failures are recorded above; they are not omitted from the validation record.

## Scope and risk

The production change is limited to responsive classes on the existing primary and loop control wrappers. Labels, callbacks, button sizes, desktop arrangement, and `CompactPlaybackBar` remain unchanged. Rollback is a clean revert of commit `5f0b92222f2e0700065a8591f01f109a5faa46d5`.

Not tested locally: physical-device touch interaction and Firefox/WebKit viewport verification.
