# Explore card unification — local validation

Date: 2026-09-12
Branch: `codex/issue-146-explore-upload`
PR: https://github.com/landfill/ClairKeys/pull/155
Scope: issue 146 stage 3, explore screen only. The upload form is a separate slice.

## Regression evidence preceded the change

`src/components/browse/PublicSheetMusicBrowser.tsx` had no test of any kind. Commit `77bb253`
added one before any implementation commit. At that point:

- 3 passed: the three sections and their data order, the error state with retry, the empty state.
  These are the preserved contract; they passed before and after, which is what shows the
  restyle did not quietly drop working behaviour.
- 5 failed, one per audited defect: the preview placeholder, missing per-card metadata, the
  inert `전체 보기` control, the hardcoded palette, and cards that were not links.

After `b265c7a` and `24b7e13` all 8 pass.

## Commands and results

| Command | Result |
|---|---|
| `npx jest src/components/browse` | 8/8 pass |
| `npx jest --runInBand` | 1004 passed, 1 failed, 104 suites |
| `npx playwright test` | 105/105 pass |
| `npx playwright test e2e/explore-cards-responsive.spec.ts` | 40/40 pass |
| `npx tsc --noEmit` | clean |
| `npx next lint` | clean |
| `npm run build` | success, `/explore` 5.31 kB |

E2E ran with the same variables CI sets: `DATABASE_URL=postgresql://test:test@localhost:5432/clairkeys_test`,
`NEXTAUTH_SECRET=test-secret`, `NEXTAUTH_URL=http://localhost:3000`.

## The single unit failure is pre-existing and environmental

`src/ci/__tests__/omrCallbackDelivery.test.ts` fails with `ModuleNotFoundError: No module named 'fastapi'`.
This was not assumed to be pre-existing — it was checked. A worktree was created on clean `main`
and the same test was run there, where it failed identically. `git diff --name-only main...HEAD`
shows this branch touches no Python file and nothing under `omr-service/`. CI installs the Python
requirements, so the hosted run is the authority for this suite.

## Viewport and zoom measurement

`e2e/explore-cards-responsive.spec.ts` runs 320, 390x844, 844x390, 1280x720, 1440x900 and
1440x900 with CSS zoom 200%, across chromium, firefox, webkit, Mobile Chrome and Mobile Safari.
At each size it measures that `documentElement.scrollWidth` and `body.scrollWidth` do not exceed
the client width, that all 15 cards (3 + 4 + 8) are links to their own sheet, that the first card
is inside the opening viewport, and that the first card's heading stays within the card's own box.

## A real regression was caught here, not after delivery

The ranked rows first announced their position with a visually hidden span inside the truncating
heading. `sr-only` positions absolutely, so under CSS zoom in WebKit it escaped the clipped
heading and widened the document to **1692px against a 1440px viewport**.

This was not written off as a CSS-zoom artifact. The same spec was copied into a clean `main`
worktree and run there, where the overflow assertion passed — proving the overflow was introduced
by this branch. The rank now travels in the link's accessible name instead, and all six viewport
cases pass in all five browser projects.

## Not verified

- No real device, no native browser zoom, no screen reader, no colour-contrast instrumentation.
  CSS `zoom` does not re-evaluate media queries, so it bounds layout, not true browser zoom.
- No database was running locally, so the sections were exercised through Playwright route
  fixtures. Live-data rendering and real public sheets were not observed.
- WebKit does not place links in the tab order by default (it follows the macOS setting). The
  keyboard test allows that for the `webkit` project only, and still requires the card to be
  focusable and followable there. Any other project failing to tab to a card still fails.
- jsdom class assertions are not rendered-contrast evidence; the token test checks that
  hardcoded palette classes are absent, not that contrast ratios are met.
