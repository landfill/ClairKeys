# 2026-09-06 — PR142 merge and exact-commit OMR deployment

## Authorized target and initial state

- User explicitly approved PR142. Rechecked final head `d8a612997ffefa2815a0a0a42c6b2945c242dd6b`, all
  hosted checks green, no new reviews/inline feedback. CodeRabbit skipped review; own review is recorded.
- Merge: `79a2328c90198544428b36bf3449d90f7c77e413`, confirmed by GitHub and fast-forwarded local main.
- Local and remote work-branch tips both d8a6129, both contained in main; actual remote ref confirmed.
  Branches retained because user-owned `.claude/settings.local.json` remains dirty and untouched.
- VM `101.79.16.73`: clean `/opt/clairkeys-deploy` initially at a7cf0ff, service active, only Python process
  in container, running image/rollback tag `localhost/clairkeys-omr:a7cf0ff` both
  `09a9e62d8512481abb3e2177116027404f48f35995ed57bfb00213e42b871576`, HEALTHCHECK healthy.
- No secret/env/unit change. Deployment uses the existing runbook and preserves the previous image.

## Build and remaining checks

Fetched origin main, verified clean deploy checkout, detached at exact merge79a2328, started:

```sh
podman build --format docker -f Dockerfile.audiveris -t localhost/clairkeys-omr:79a2328 .
```

At this checkpoint the build is underway. The current tag/service has not been switched. Next: inspect
image/health metadata, image-level tests, check idle state, switch current tag/restart, compare actual
image ID, external health200/unauthorized-process401, recognition smoke and post-merge CI.

## Scope boundary

The merged guard repairs the evidenced 9-as-6 meter path, not all recognized notes. #134 remains open
for dots/ties/tempo placement and its phase stays IN_PROGRESS. Existing stored scores are unchanged;
re-upload is the user-accepted application path. Prior exact-code tests:963 Jest,77 VM service tests,
final hosted PR gates green. See guarded-meter-retry validation and PR142 review log.

## Image built and tested; cutover not executed

- Build exit0, exact merge79a2328, tag `localhost/clairkeys-omr:79a2328`, image ID
  `ff0a347f52b92803398e617c47541cd1b1d43fa366469b9a4625b61c839415ef`.
- Docker-format image inspection retained curl health test, startPeriod60s/interval30s/timeout10s/retries3.
- Tested actual `/app` image modules, not an overlaid source package:

```sh
podman run --rm --network none \
  -v /opt/clairkeys-deploy/fixtures:/fixtures:ro \
  -v /opt/clairkeys-deploy/src:/src:ro \
  -w /app -e PYTHONPATH=/app localhost/clairkeys-omr:79a2328 \
  python3 -m unittest discover -s tests
```

All77 tests PASS (0.396s); temporary test container removed normally.

Pre-cutover checks found one processing directory: `8e33ffee-70a3-45da-a809-6b52745be42d`. Its only file
was a74,577-byte input.pdf dated2026-08-21T16:58:07; authenticated status GET returned404, and no JVM was
running. It is not an active recognized job. This pre-existing production artifact was **not deleted**.
The actual systemd unit matched the committed unit byte-for-byte; no unit/env/secret change was needed.

The tool's auto-review rejected the command that would retag `current` and restart `clairkeys-omr`:
the user's explicit approval covered merging, not a disruptive production rollout. **The entire command
was not executed.** No workaround/indirect retry was attempted. Explicit production deployment/restart
approval is now required. A restart can interrupt in-flight jobs; recheck live work at approval time.

Read-only verification after rejection:

- `current` image and running container both remain
  `09a9e62d8512481abb3e2177116027404f48f35995ed57bfb00213e42b871576` (a7cf0ff).
- Service active and HEALTHCHECK healthy. New79a2328 tag remains available but unused.
- All six merge79a2328 post-merge checks and all six main record5914668 checks passed.
- #134 remains OPEN; user settings remain the only dirty local file.

A fresh input was downloaded only for planned post-cutover verification into
`/data/analysis/pr142-deploy-JUv6ts/input.pdf`, hash matched the original34d06c…e5478. It was removed
after the rejection, before any new PDF conversion; helper script/reference JSON remain. The issue's
attachment can be downloaded again. No post-deployment recognition or external HTTP check on a new
running image is claimed, since production never changed.

## Explicit deployment approval and successful cutover — 2026-09-06

The user subsequently explicitly approved production deployment/restart. This supplied the authority
missing from the rejected command; the earlier rejection was not bypassed.

- Preflight rechecked exact79a2328 clean checkout, new/rollback image IDs, committed unit equality,
  no JVM and no new processing directory. The historical8e33ffee job still returned authenticated404.
- Retagged the verified79a2328 image as current and ran `systemctl restart clairkeys-omr`: exit0.
- Service active, container running and actual image exactly
  `ff0a347f52b92803398e617c47541cd1b1d43fa366469b9a4625b61c839415ef`.
- From outside the VM: GET /health=200; unauthenticated POST /process=401.
- Manual `podman healthcheck run clairkeys-omr-prod` exit0, HEALTHCHECK healthy. Rollback a7cf0ff retained.
- A hash-verified same-PDF conversion is now running with `PYTHONPATH=/app` inside the production image,
  using the committed smoke script and separate analysis output root `/data/analysis/pr142-live-Fetl0O`.
  It does not create or rewrite a stored score or database row. Results/cleanup are pending at this entry.

## Final production-image recognition smoke and cleanup

- Source hash verified before running: `34d06c77398470ea6f9bf15d9cd5724a0db94c904eb81107c5ca29d2f1be5478`.
- Executed committed smoke script with `podman exec -e PYTHONPATH=/app clairkeys-omr-prod python3 ...`.
  Report confirmed `processorSource=/app/omr/audiveris.py`; no candidate checkout was on the import path.
- Real PDF→initial XML→two-staff image evidence→internal graph retry→selected XML→canonical conversion:
  **28.704s**. Selected `result/meter-retry-kuts9jdq/retry.mxl`, meter9/8,163 notes, one overflow in bar9
  (5 quarter beats observed vs4.5 expected). First-bar exact raw-event match6/10 and bar length4.0 remain;
  tempo/scoreTempo null because the original engine tempo mark is placed after score start. These are
  known incomplete musical results, not a failed deployment or a new full-score correctness claim.
- Report/outputs retained under `/data/analysis/pr142-live-Fetl0O/result`:
  - Initial `input.mxl`: `e2dc0c7f1f9cf02d1130f25bc77cc7f2dd66c2e596a47af5818a5301f9a87867`.
  - Selected `meter-retry-kuts9jdq/retry.mxl`: `878039a165e5af081d7d2907f68190626d3499f2f7e2f5bc657b92ea71f630a5`.
  - `smoke-report.json`: `9da4662b1a2ec4c304fb023d35a2c570f6fa394a576d84a924e9f6d2f10b9e93`.
- After process exit0, container had only its service Python process, exact new image and healthy status;
  rollback a7cf0ff image identity rechecked and preserved. No stored score or database row was changed.
- Enumerated then removed only this smoke's input.pdf, result/input.omr and selected retry.omr (3 files).
  Re-enumeration found no PDF/PNG/OMR files in the live-smoke root. Source can be downloaded again from
  the issue attachment; diagnostic XML/JSON/logs remain. The historical production8e33ffee artifact was untouched.
- Deployment verification is complete. Full web upload/storage/callback roundtrip was not exercised;
  external health/auth probes, actual image77 tests and native recognition/converter smoke were exercised.
  #134's unresolved musical scope and existing-score re-upload policy are unchanged.
