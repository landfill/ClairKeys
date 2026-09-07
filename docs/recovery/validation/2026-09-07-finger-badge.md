# Issue 124 finger badge validation — 2026-09-07

Implementation head: `47190a0703baf1b30a2bf1342ae12d6f5acaa7f4`.
Review-ready PR: https://github.com/landfill/ClairKeys/pull/147.

## Results

- Regression first: corrected-layout invocation of focused Jest reproduced 10 failures and 12 passes.
  Failures cover fixed-size overflow, short-note visibility and renderer dimensions. The new width/font
  result fields were also absent before implementation. [Raw result](2026-09-07-finger-badge/regression-before.txt).
- Final focused tests: 2 suites / 22 passed. Final full Jest: 102 suites / 985 passed.
- `npm run lint`: PASS (no ESLint warnings/errors; Next CLI deprecation notice only).
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS after integer-font adjustment. Type and lint were also run independently.
- `git diff --cached --check`: PASS before implementation commit.
- Actual React FallingNotes component, current data converter and keyboard layout rendered from
  `fixtures/fingering/love-affair-411.json` at time 10s. Additional white/black cases cover key widths
  10.8/24/24.46/36px, durations 0.01/0.1/1s, speed 140px/s.
- In-app browser desktop 1265x712 and landscape viewport 844x390 visually inspected. All 33 rendered
  badge rectangles and text Range bounds fit their parent boxes in the desktop DOM measurement.
  Fractional font sizes initially exceeded text bounds; integer rounding corrected that before final checks.
- Screenshots use an isolated static component harness and repository fixture, with no account or private
  library/session data. They do not demonstrate full application E2E, physical-device testing, or human
  performance/readability. Hosted E2E and review status are tracked in the PR log.

## Reproduction and evidence

Copy [harness source](2026-09-07-finger-badge/render-harness.txt) to `local-test-data/issue124/render.jsx`
and create `/private/tmp/clairkeys-124-preview`, then run `node --import tsx local-test-data/issue124/render.jsx`
at the repository root on the implementation branch. Serve only the generated directory locally.
The harness supplies basic positioning utility CSS, while geometry/font/plate styles are rendered by
actual production components. It is a static display check, not the full Tailwind application.

- [DOM metrics](2026-09-07-finger-badge/dom-metrics.json)
- [Desktop](2026-09-07-finger-badge/desktop.png)
- [Landscape real score](2026-09-07-finger-badge/landscape.png)
- [Landscape boundary cases](2026-09-07-finger-badge/landscape-cases.png)

D-055 explicitly supersedes unconditional short-note labels from D-038/ISSUE-103. Notes below 10px
width or 14px height retain their data and geometry but omit the number. No inference/audio/OMR changes.
Existing user modifications and the earlier signed-in UI captures are not part of this change.
