# UI renewal first slice — 2026-09-07

PR148: https://github.com/landfill/ClairKeys/pull/148
Implementation: `eeef45130b4408ac8903ec87927b9702f8420b5c`; base main 3bc1119. Withdrawn PR147 changes are absent.

## Verification

- Before implementation: home static-image regression failed (1 failed, 6 passed).
- After implementation: focused home/library/card tests 4 suites / 18 pass.
- Full `npm test -- --runInBand`: 102 suites / 977 pass. This matches main's test count;
  the withdrawn badge tests are not part of this branch.
- `npm run lint`: PASS; Next lint deprecation notice only.
- `npx tsc --noEmit`: PASS independently.
- `npm run build`: PASS after final card action alignment.
- `git diff --check`: PASS.
- Actual production build run locally with a dummy NextAuth secret and unreachable dummy database.
  Loopback-only proxy served synthetic auth/session, four availability states and one category;
  it blocked all other API calls, service-worker registration and non-GET requests. No real account,
  authentication service, database/storage mutation or production OMR request was used.
- At viewport widths 390/768/1280/1440, all 12 card management actions have 44px height and their
  text ranges fit on one line. Cards measure 343/344.5/288.25/292px respectively. Sort arrow is
  inside its select at every width; document width never exceeds viewport width.
- Existing edit dialog/open/cancel and delete dialog/open/cancel verified. Search reduced fixture
  results from four to one, and unmatched search displayed the existing empty-result state.
  Save/delete/move submission were not executed. Existing unit tests cover those flows.
- Home image loads, result block bottom 606.5px in 900px desktop height, zero audio/video elements.
  Mobile image and caption inspected after scroll. Image source is the existing main components,
  HOME_SAMPLE_ANIMATION and built CSS. The source is a sample visualization, not an OMR claim.
- Physical devices, human learning/readability outcomes and actual 200% browser zoom are not claimed.
  This slice does not fulfill all of issue146; playback transitions, explore and upload remain.

## Evidence

All captured page data is explicitly synthetic; no signed-in production screenshots are published.

- [Library desktop](2026-09-07-ui-renewal/library-1280.png)
- [Library mobile](2026-09-07-ui-renewal/library-390.png)
- [Home desktop](2026-09-07-ui-renewal/home-1280.png)
- [Home mobile](2026-09-07-ui-renewal/home-mobile.png)
- [DOM metrics](2026-09-07-ui-renewal/layout-metrics.json)
- [Red test result](2026-09-07-ui-renewal/home-regression-before.txt)
- [Image source harness](2026-09-07-ui-renewal/render-home.txt)
- [Local fixture proxy](2026-09-07-ui-renewal/local-fixture-proxy.txt)

Reproduction: copy source harness/proxy to local-test-data/issue146/render-home.jsx and proxy.cjs.
On the implementation branch run `npm run build`, then `node --import tsx local-test-data/issue146/render-home.jsx`
with /private/tmp/clairkeys-146-assets created. Capture the full 800x400 viewport (not the clipped screenshot
API, whose first output was rejected). Source components remain unmodified for capture.
For app verification, run the built app on loopback port3146 with NEXTAUTH_SECRET=clairkeys-local-ui-fixture,
NEXTAUTH_URL=http://localhost:3146 and an unreachable dummy DATABASE_URL; run the proxy on loopback8147.
All those values are test-only, not production credentials. Inspect /library and / through port8147.

## Final asset naming and hosted checks

Native browser screenshot bytes are JPEG, 800x400 and 24,252 bytes. Follow-up 5644513 changes only
public/images/practice-example.png to practice-example.jpg plus the Image src. The bytes are identical;
no image editing or resampling occurred. Local browser screenshots above were captured before that
path-only correction. Home 7 tests passed after it, and final-head hosted build, type/lint/unit/security
and both E2E jobs pass. The review log tracks the independent review and merge gate.

## Approved production delivery

PR148 merged as a1a84da385d47e00ce9469dcd274ed2af443efa4 on 2026-09-07. Local main fast-forwarded;
local and remote feature tips have zero unique commits outside origin/main. Preserved user changes block
branch deletion under AGENTS.md. Exact-SHA Vercel Production deployment6307119421 succeeded.
Live home contains the static example, and /images/practice-example.jpg equals the merge artifact byte
for byte (SHA256 6b4dcaccecdae9ab8f830e7df11203ffc59047cab00f845004ad761d7c53bd15).
All six merge check-runs completed successfully, including post-merge build/tests and E2E.
