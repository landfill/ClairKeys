# P0-D PR #11 Accessibility Validation

Date: 2026-07-20 KST
Branch: `fix/accessibility-chromedriver`
PR: https://github.com/landfill/ClairKeys/pull/11

## Scope

- Pin the browser and axe packages used by the required accessibility check.
- Share test authentication and backend settings with both `next build` and `next start`.
- Refuse to scan until the application returns successful HTML containing its existing `<main>` landmark.
- Preserve axe `--exit` and clean up the background server on every exit path.
- Remove static and dynamic viewport settings that disable user zoom.

## Failure evidence before fixes

- Hosted job installed an unpinned `browser-driver-manager@2.0.1`.
- `npm start` emitted repeated NextAuth `NO_SECRET` errors because environment values were scoped only to the build step.
- Axe reported `#main-content`, which does not exist in ClairKeys; the workflow had scanned a Chromium/Next error response rather than proving application readiness.
- Axe reported `meta-viewport`; the root layout and active mobile piano wrapper both set `maximum-scale=1` and `user-scalable=no`.
- Regression run: layout zoom contract failed; all three workflow contract checks failed; mobile viewport preservation failed.

## Verification after fixes

| Command | Result |
|---|---|
| `npm test -- --runInBand src/app/__tests__/layout.test.tsx src/ci/__tests__/prChecksWorkflow.test.ts src/components/mobile/__tests__/MobileTouchOptimizer.test.tsx` | PASS — 3 suites, 6 tests |
| `npx eslint <changed TypeScript files>` | PASS — zero warnings and errors |
| `npx tsc --noEmit` | PASS — exit code 0 |
| Ruby `YAML.load_file('.github/workflows/pr-checks.yml')` | PASS |
| `git diff --check` | PASS |

## Remaining verification

- Hosted Accessibility Check must install the pinned packages, build, start the server with the shared environment, confirm real application HTML, and complete axe with zero violations.
- Hosted full lint remains red on this branch's old base until the PR #12 lint baseline is integrated; this is not attributed to the PR #11 workflow diff.
- Local production build remains dependent on Google Fonts network access; the prior hosted Build Check passed.
