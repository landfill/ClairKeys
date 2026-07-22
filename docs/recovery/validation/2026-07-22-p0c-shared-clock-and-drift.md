# P0-C Shared Clock and Long-Run Drift Validation

Date: 2026-07-22 KST
Branch: `codex/p0-playback-sync-stages-4-5`
Commit: `e17531407dffba9dd1ee8d7a6d7bf70585c2e3cd`
Pull request: [#26](https://github.com/landfill/ClairKeys/pull/26)

## Scope

P0-C work stages 4–5:

- use one AudioContext-derived score clock for audio scheduling and the visual playhead;
- derive falling-note positions and active piano keys from the same render-time value;
- measure arithmetic drift over 1-minute and 5-minute playback simulations;
- keep playback stopped when AudioContext is unavailable, cannot resume, or a pending resume becomes stale.

## Regression-first evidence

Before implementation, the three new focused suites failed for the expected reasons:

- `playbackClock.test.ts`: shared clock module did not exist;
- `FallingNotesPlayer.test.tsx`: the first keyboard render received an empty active-key set while the visual already used `currentTime=1.5`;
- `useFallingNotesAudio.test.ts`: unavailable AudioContext threw `TypeError: AudioContextClass is not a constructor`, and suspended startup returned no success result.

Independent review later found that `resume()` rejection and stale pending starts could still enter or regain playback. Regression tests were added before those paths were fixed.

## Final verification

| Command | Result |
|---|---|
| `npx jest src/hooks/__tests__/useFallingNotesAudio.test.ts src/components/animation/__tests__/FallingNotesPlayer.test.tsx src/utils/__tests__/playbackClock.test.ts --runInBand` | PASS — 3 suites, 11 tests |
| `npm test -- --runInBand` | PASS — 39 suites, 362 tests |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS — no warnings or errors (the script reports Next.js' `next lint` deprecation notice) |
| `npm run build` | PASS — 41 pages generated; build configuration still prints `Skipping validation of types` / `Skipping linting`, so the separate commands above are authoritative |
| `NEXTAUTH_SECRET=<local-test-value> NEXTAUTH_URL=http://localhost:3000 CI=1 npx playwright test --project=chromium --project='Mobile Chrome' ...` | PASS — 6/6 public-route smoke checks; output redirected to `/private/tmp` to preserve user-owned `test-results/` |
| `git diff --check` | PASS |

## Drift result

`playbackClock.test.ts` advances the AudioContext clock at 60 FPS for:

- 60 seconds at 1x;
- 300 seconds at 1x;
- 300 seconds at 2x;
- 300 seconds at 0.5x.

Every simulation remained below the defined 1 ms arithmetic drift threshold. Both score→audio scheduling and audio→score visual time use the same immutable anchor and inverse conversion functions.

## Review result

A read-only code-review pass found two async lifecycle risks:

1. suspended `AudioContext.resume()` was not awaited before reporting playback success;
2. a pending resume could start with stale seek/tempo/mute values.

Both were fixed with awaited state verification plus a playback generation token. Final re-review reported no remaining actionable findings.

## Known gaps

- Firefox, WebKit, and Mobile Safari local Playwright projects were not runnable because their browser binaries are not installed. The attempted full run had 6 Chromium-family passes and 9 environment failures for missing executables.
- `/sheet/2` authenticated live playback remains unverified because it requires runtime authentication and database data. The public smoke suite does not exercise that score.
- The local E2E server logs a handled `DATABASE_URL`-missing error on the public sheet API; the six selected smoke checks still passed. No database value was invented for this validation.
