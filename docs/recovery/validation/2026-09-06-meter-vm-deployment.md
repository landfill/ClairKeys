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
