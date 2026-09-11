# Narrow desktop toolbar — local recovery

Date: 2026-09-11
Head: 2297edd388a0ec9a09f29a3900bfa47acb7565e2
PR: https://github.com/landfill/ClairKeys/pull/152
Worktree: /Users/h0977/dev/ClairKeys/.worktrees/toolbar-local

## Regression and result

The cloud task retained only an E2E diff despite later implementation logs. Its retry failed in
setup, so implementation was reconstructed locally from current main and independently verified.
Before behavior changes, the new Chromium390px assertion failed with seek offsetWidth0 (<44).
Afterward the same test passes. A fine-pointer media rule below640px puts the seek target on a
second row inside the original56px bar; existing transport/loop/speed/volume remain available.
No audio/session/orientation logic or playback-box geometry was changed.

## Commands

Commands ran from the worktree. E2E used DATABASE_URL=postgresql://test:test@localhost:5432/clairkeys_test,
NEXTAUTH_URL=http://localhost:3000 and NEXTAUTH_SECRET=local-review-only. No production env was copied.

- `npx playwright test e2e/playback-session-transition.spec.ts --project=chromium --grep 'phone portrait' --reporter=line`:
  before1 failed (seek width0); after1 passed.
- `npx playwright test e2e/playback-session-transition.spec.ts --workers=1 --reporter=line`:
  25 passed across five browser projects and390/844/1280/1440px, plus200% CSS zoom.
- `npx playwright test --workers=1 --reporter=line`: all60 passed (54.2s), including original
  public application smoke and playback controls responsive coverage.
- `PYTHON_BIN=/Users/h0977/dev/ClairKeys/.worktrees/callback-review/.venv-review/bin/python npm test -- --runInBand`:
  102 suites,995 passed.
- `npx tsc --noEmit`: exit0. `npm run lint`: exit0, no lint warnings/errors.
- Playwright webServer invokes `npm run build && npm start`; production build completed each run.
  Build skips types/lint internally; both were executed separately above.
- `git diff --check`: pass. 390px Chromium screenshot visually inspected; controls and seek fit.

## Limits

200% coverage uses CSS zoom, not native browser zoom. Physical devices are unverified.
New width assertions target fine-pointer desktops; touch routes retain their existing parity checks.
No claim that all touch seek behavior was repaired. Hosted CI/review is tracked in PR152 log.
The existing security audit findings are separate; full completion is not claimed while gates fail.
