# Playback pause transition — verification

Date: 2026-09-08 KST
Branch: `codex/issue-146-playback-session` · PR [#150](https://github.com/landfill/ClairKeys/pull/150)
Base: `56bc5b7` (origin/main) · Commits: `e56a7a0`, `0e6572c`, `92beb3e`

## Scope

Issue [#146](https://github.com/landfill/ClairKeys/issues/146) item 6 and the recommended-order P1
playback bundle: hold the player frame and the core controls still across play and pause. Recorded
as [D-056](../DECISIONS.md). No geometry constant, `pianoLayout.ts`, `usePlaybackOrientation.ts` or
shared `PlaybackControls` change (D-024 Directive, D-019 decision 8).

## What was wrong

`isPlaying` alone drove the audio, the orientation engage, the page chrome and the box height, so a
pause did everything a stop does. Measured on the deployed component structure before the change:

| | pause, before | pause, after |
|---|---|---|
| orientation | `exit()` — phone turns back | held to the end of the session |
| page header, sheet info card | rebuilt | stay hidden |
| box height | measured `boxHeight` → fixed 330px | unchanged |
| transport | one-row bar (⏸️ leftmost) → three-row block (재생 = grid cell 1) | ⏸️ ↔ ▶️ in the same slot |

## Regression evidence first

`e56a7a0` added 13 assertions across three suites before any behaviour changed.

```
npx jest src/components/playback/__tests__/CompactPlaybackBar.test.tsx \
         src/hooks/__tests__/useFallingNotesPlayer.test.ts \
         src/components/animation/__tests__/FallingNotesPlayer.test.tsx
Tests: 13 failed, 37 passed, 50 total
```

The 13 failures were exactly the new session assertions; every pre-existing assertion still passed,
so the change is judged against the reported defect rather than against itself.

## Commands and results after the change

| Command | Result |
|---|---|
| `npx jest` | 992 passed / 102 suites |
| `npx tsc --noEmit` | exit 0, no output |
| `npm run lint` | ✔ No ESLint warnings or errors |
| `npm run build` (`prisma generate && next build`) | succeeded; `/sheet/[id]` 18.7 kB / 143 kB first load |
| `npx playwright test` | 50 passed — chromium, firefox, webkit, Mobile Chrome, Mobile Safari |

Playwright ran with `DATABASE_URL=postgresql://test:test@localhost:5432/clairkeys_test`,
`NEXTAUTH_SECRET=test-secret`, `NEXTAUTH_URL=http://localhost:3000`, matching the CI E2E job. Without
`NEXTAUTH_SECRET` the production server never becomes ready (`NO_SECRET`) and `webServer` times out.

## Real-browser measurements

`e2e/playback-session-transition.spec.ts` drives the D-034 route fixture — no database, no storage —
through setup → play → pause → resume → stop at 390×844, 844×390 and 1280×720. Asserted from the
reader's side, in a browser that actually performs layout:

- the transport's bounding box is identical across pause and resume (exact equality, not a tolerance)
- `playback-box` keeps its measured height instead of falling back to the 330px idle height
- the page header and `playback-primary-controls` stay absent while paused
- seek, A-B, speed, gain and stop are all attached and enabled while paused
- stop returns the setup chrome and the header

## Defect found while measuring — not caused by this change

At a 390px-wide viewport the compact bar overflows and the seek bar collapses:

```
PLAYING  barWidth 358  scrollWidth 431  document.scrollWidth 447   seek width 0
PAUSED   barWidth 358  scrollWidth 431  document.scrollWidth 447   seek width 0
```

The two states are identical, so the overflow predates this change. A real phone in portrait receives
the CSS rotation and an 844px-wide bar (D-019), so this is a `pointer: fine` narrow-window case. The
spec therefore asserts **parity with the playing state** rather than absence of overflow: pinning what
a pause is responsible for without asserting away a defect it did not cause. Candidate for the #146
P2 responsive bundle; not fixed here.

## CI result and the firefox skip

The first head `92beb3e` passed 13 of 16 checks and failed both E2E jobs on **firefox alone**
(47 passed, 3 failed). The click landed and the compact bar never appeared: headless Firefox on the
GitHub runner has no audio output, and the session opens only when audio actually starts, so the
assertion was reporting the runner rather than the code. `37e766c` skips that case — but only after
asserting the screen is still the untouched setup screen (stacked controls and page header present,
no compact bar), so a half-entered session still fails loudly. Final head `37e766c`: **all 16 checks
pass**, both E2E jobs `47 passed, 3 skipped`.

Locally the same spec runs **15/15 with firefox included and not skipped**, because a desktop machine
has the audio output the runner lacks. The post-fix local run used a temporary git worktree so the
user's uncommitted changes in the primary tree were never stashed or touched; the worktree was removed
afterwards.

## Review round — 2026-09-08

Two Codex reviews ran against `37e766c`: the GitHub `chatgpt-codex-connector` bot (one inline P2) and
a locally dispatched Codex worker (**request changes**, two P2s). Both found the E2E skip.

**Deadlock, reproduced then fixed (`44d3d45`).** `sampleStatus` reports the sample bank except for
`loading`, which describes a request. `startAudio` sets `loading`, awaits the bank, and returns early
on a superseded generation without restoring it. Keeping the compact bar alive through a pause is what
first exposed the path: pause → seek or speed change calls `stopAudio()` with no replacement start, so
`isReady` stayed false forever and **resume and stop were disabled together**, leaving no way out of
the player. Fixed with a count of in-flight loads — an abandoned start reports the bank when it is the
last one out, and stays quiet while a newer start owns the status.

```
npx jest src/hooks/__tests__/useFallingNotesAudioSamples.test.ts   # on parent 37e766c
✕ releases the status when nothing takes the start over
Tests: 1 failed, 15 passed, 16 total
```

After the fix both new assertions pass. The compact speed control also gained the
`disabled={!isReady}` the setup screen has always had, so a speed change can no longer cancel a resume
that is still starting; during playback the status resolves before a note sounds, so nothing closes.

**E2E skip narrowed (`e0674fc`).** The skip asked only whether playback started, so a genuine loss of
the transition would have skipped in Chromium and WebKit and reported green. It now requires
`browserName === 'firefox'` and fails elsewhere with a message saying so; the setup-screen guard
assertions stay.

**Not adopted, recorded.** Paused seeking at 390px is the pre-existing compact-bar overflow already
recorded above (#146 P2 responsive bundle). The paused keyboard seek step differs between the compact
bar (5s arrows, no PageUp/Down) and the setup controls (1s arrows, 5s PageUp/Down); that is the bar as
D-019 shipped it, not a behaviour this change altered.

| Command on final head `e0674fc` | Result |
|---|---|
| `npx jest` | 995 passed / 102 suites |
| `npx playwright test` | 50 passed, five browser projects, firefox not skipped locally |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | ✔ no warnings or errors |
| `npm run build` | succeeded |
| PR CI | 16/16 pass; E2E `47 passed, 3 skipped` (firefox only) |

## Not verified

- Real hardware rotation and whether fullscreen survives a pause on a device. Headless Chromium
  reports `pointer: fine` on the desktop projects, so the CSS rotation path ran only under the two
  mobile device profiles.
- Deployed-screen behaviour. No Vercel Production deployment or live-site check was performed; the
  PR's preview deployment was not inspected.
- Audio correctness. The fixture score is synthetic and the sample set was not exercised for fidelity.
- Firefox on CI. Its three cases are skipped there for want of an audio output; firefox coverage of
  this transition comes from the local run only.
- The resume deadlock on real hardware. It was reproduced and fixed against the hook's own sample-bank
  double, not against a slow network on a device.

## Preservation

No application data, VM, secret or setting changed. The pre-existing uncommitted user changes
(`.claude/settings.local.json`, the `HANDOFF.md` 2026-09-06 insertion, the local UI-audit screenshots
and `2026-09-08-codex-cloud-startup-repair.md`) were left untouched and uncommitted.
