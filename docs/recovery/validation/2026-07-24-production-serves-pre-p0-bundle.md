# Production Serves a Pre-P0 Bundle — Issue #18 Still Reproduces Live

Date: 2026-07-24 KST
Branch: `main`
Commit under test: `1e3d515` (local `main`, in sync with `origin/main`)
Deployed target inspected: `https://clairkeys.vercel.app`

## Trigger

The user reported that the issue [#18](https://github.com/landfill/ClairKeys/issues/18) symptom is still
present: on the deployed site, audio stops after roughly 10 seconds while notes keep falling and the
playbar keeps advancing. Issue #18 is `CLOSED` and `docs/recovery/HANDOFF.md` records P0-C as `DONE`
via PR #19 and PR #26.

## Result

The repository is fixed. The deployed site has never received the fix. The two facts were previously
tracked as unrelated: the deployment failures were recorded in HANDOFF as "pre-existing, unrelated to
P0-C", which hid the fact that they are the reason P0-C is not observable in production.

## Evidence

### 1. The working tree does not contain the defect

- `grep` over `src/` finds no `relativeStart > 10` cap; the only occurrence of the phrase is the
  explanatory comment in `src/utils/audioScheduler.ts` describing the removed code.
- `/sheet/[id]` reaches the fixed code: `src/app/sheet/[id]/page.tsx` renders
  `FallingNotesPlayer` -> `useFallingNotesPlayer` -> `useFallingNotesAudio`, and that hook drives the
  rolling scheduler via `setInterval(tick, TICK_MS)`.
- `npx jest src/utils/__tests__/audioScheduler.test.ts src/utils/__tests__/playbackClock.test.ts`
  passed: 2 suites, 19 tests.

### 2. The deployed bundle does contain the defect

`curl https://clairkeys.vercel.app/sheet/2` returns `200` with `x-matched-path: /sheet/[id]`. The
referenced chunk `/_next/static/chunks/8327-78f4e1b75f62e239.js` contains the pre-fix one-shot
scheduler verbatim:

```js
let t=Math.max(0,(e.start-n)/a),r=Math.max(0,(e.start+e.duration-n)/a);
if(t>10||r<0)continue;
```

Marker comparison between local `main` and the served chunk:

| Marker | Local `main` (`1e3d515`) | Served production chunk |
|---|---|---|
| 10-second scheduling cap | absent | present (`t>10`) |
| rolling `setInterval` tick | present | absent |
| `"AudioContext resume failed:"` (added by PR #26) | present | absent |
| `"Web Audio initialization failed:"` (added by PR #26) | present | absent |
| velocity default operator | `??` (PR #26) | `\|\|` (pre-P0-C) |

The served bundle therefore predates `7d0774a` "Play long scores past the 10-second audio cliff"
(2026-07-21), which is the commit that removed the cap.

### 3. Why the fix never shipped — both deployment paths are broken

- **Vercel Git integration never produces a Production deployment.**
  `gh api "repos/landfill/ClairKeys/deployments?per_page=100"` returns exactly two environment
  labels: `Preview` (41 deployments, all created by Vercel, latest `1e3d515`) and `production`
  (59 deployments, all created by the GitHub Actions `deploy.yml` jobs that declare
  `environment: production`). Vercel has not created a single Production-environment deployment in
  the last 100 records. Pushes to `main` are being built as Preview only, which is what Vercel does
  for a branch that is not the configured Production Branch — consistent with the project still
  pointing at `master` after the DOC-1 default-branch rename on 2026-07-19 (`643ce71`).
  `clairkeys.vercel.app` consequently remains aliased to an older production build.
- **The GitHub Actions deployment path fails on every commit.** `gh run list` shows the `Deploy`
  workflow `failure` on `157c3b4`, `f49d65a`, and `1e3d515`, among others.
  `gh api repos/landfill/ClairKeys/commits/1e3d515/check-runs` shows `Deploy to production`
  `failure` (no `secrets.VERCEL_TOKEN` supplied to `amondnet/vercel-action@v25`),
  `Run database migrations` `failure` (empty `DATABASE_URL`, Prisma `P1012`),
  `Notify deployment status` `failure`, and `Post-deploy health check` `skipped`.

The Vercel commit status on `1e3d515` is `success`, which is the Preview build succeeding. It is not
evidence that production was updated.

### 4. Not verified

- The Preview deployment `https://clairkeys-onvjomxvc-landfills-projects.vercel.app` could not be
  inspected: it returns `302` to Vercel deployment protection SSO. Whether the fix behaves correctly
  in a deployed environment is therefore still unverified — only that the fixed source is absent
  from production.
- Authenticated live playback of `/sheet/2` remains unverified, as recorded previously.

## Follow-up risk found while investigating

`public/sw.js` uses a fixed `CACHE_NAME = 'clairkeys-v1'`. The activate handler deletes caches whose
name differs from the current constant, so a build that does not change the constant cannot evict a
returning visitor's cached bundle. Once production is corrected, a stale service worker can still
serve the pre-fix JavaScript to existing visitors. This is a separate defect from the deployment
misconfiguration and is not yet filed.

## Required actions (repository/dashboard admin, not performable by the agent)

1. Set the Vercel project's Production Branch to `main` and redeploy `1e3d515`. This alone restores
   the issue #18 fix for users.
2. Either supply `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` and `DATABASE_URL` to the
   `production` environment so `deploy.yml` works, or delete its now-redundant deploy and migrate
   jobs. Leaving them in place keeps every `main` commit permanently red.
3. Re-verify `https://clairkeys.vercel.app/sheet/2` after redeploy: the served chunk must no longer
   contain a `>10` scheduling cap, and audio must continue past 10 seconds.
