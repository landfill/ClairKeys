# Approved PR144 merge and production rollout

Date: 2026-09-06 KST.

## Approval and merge

User explicitly approved both PR144 merge and VM deployment in response to the combined request.
Fresh check: exact head ef714c78ad9ddfdf7f4fe1128f5e5edc961fc09a, non-Draft, CLEAN; all CI/E2E
checks passed, no new inline/review payloads. CodeRabbit's incremental quota limitation and independent
Luna coverage remain as documented; no quota workaround or claim of bot approval.

Merged as `b9d3ac61a5ee492cdcb6aea2bedaa133cc926d8b` at2026-09-06T03:44:57Z. Local main fast-forwarded.
Both local/remote feature tips ef714c7 are contained in main; remote existence verified after fetch.
Both branches are retained under the user-dirty-worktree rule (.claude/settings.local.json untouched).

## Preflight and exact build

VM service active/healthy; current and running image:
`42482e26afb5cdc9c3c2bc7b8ccd89b6b05b02403326e2711f7f00566536d09e`, tag1aa8c71.
No active JVM; only the historical processing directory8e33ffee-70a3-45da-a809-6b52745be42d exists.
It is not this task's data and is left untouched. Deploy checkout clean at1aa8c71 before fetch.

Detached clean /opt/clairkeys-deploy at the exact merge, then started:

```text
cd /opt/clairkeys-deploy/omr-service
podman build --format docker -f Dockerfile.audiveris -t localhost/clairkeys-omr:b9d3ac6 .
```

Docker format preserves HEALTHCHECK. Current production tag is not changed during build;1aa8c71
is retained for rollback. No secret/env/unit or stored-score changes.

Build, image-internal tests, approved cutover, health/auth checks and actual live API smoke pending.
This deployment fixes the bounded whole-note/terminal-bar case, not remaining21/tempo/RH-tie defects.

## Image tests and approved cutover

Build exit0; new tag b9d3ac6 resolves to
`d7d6344bbc1331324b8b14e7a62a4de6a3f5d22a62e908503773edfeac106c8a`.
Docker HEALTHCHECK retained. Actual image /app modules, only fixtures/src mounted read-only:

```text
podman run --rm --network none -v /opt/clairkeys-deploy/fixtures:/fixtures:ro -v /opt/clairkeys-deploy/src:/src:ro -w /app -e PYTHONPATH=/app localhost/clairkeys-omr:b9d3ac6 python3 -m unittest discover -s tests
```

107 tests run,104 passed/3 private-source diagnostic skips, exit0 in0.594s. Those source tests were
validated locally/native premerge; no source fixtures are falsely described as passing in this container.
Current unit matched committed source. Before restart, only the historical processing directory existed.

Guarded current-image/target-image checks passed; retagged current to b9d3ac6 and restarted the service,
exit0. Service active/running, exact new image, manual HEALTHCHECK exit0/healthy. External GET /health200
and unauthorized POST /process401. No env/unit/secret changes. Rollback1aa8c71 image remains retained.

## Live API smoke underway

Temporary root /data/analysis/pr144-live-Qhyd9Q; unchanged Love solo PDF SHA256
acdd4ee03f8da75493491f677519dbce4fecf0275b106caf268fa6899ea34253.
Ran existing test_omr_api.py inside the live container (no module overlay), reading the service token
only internally; POST /process accepted200, job a7ca14e6-7260-44ab-b546-ac6c4840639b.
No callback/user/sheet IDs supplied, so no library/storage writes. Completion/equality/cleanup pending.
The helper emitted a non-failing requests dependency-version warning; the API request itself succeeded.

## Live result and completion

Live API job a7ca14e6-7260-44ab-b546-ac6c4840639b completed in86.912s. Early /result409 correctly
became200; status payloads did not contain the animation;87 polls, maximum observed131.359ms.
Result418 notes/duration119.25/reference60/keyE/tempo unknown, with the known measure20 overflow.
Every note dictionary and total duration exactly equal the validated wrapper-final-love result.
Only generated_at, title and metadata.title differ because the live request used a different label.
This verifies the8 whole-note recovery result on the real deployed service, not an overlaid module.

Actual image code hashes equal local merged sources:

- audiveris.py: e71a88cb40a8ab055b740bbdbb23a3ea93ee2a8ffa74685399dc4e2b2d830b98
- whole_note_retry.py: 8826d279ad8e66b62b78454c04cdb1c0da881569054dca5305910417ec990f2c

Service automatically removed its per-job processing directory. Collected live JSON/status/comparison
under Git-excluded local-test-data/results/whole-note-deploy-2026-09-06/, then deleted only the VM
analysis root's solo.pdf staging copy after its SHA256 check. Scoped find shows no PDF/OMR in that
analysis root. User-original PDF and all previous local checkpoints remain untouched/recoverable.
Historical processing directory was not deleted. No analysis JVM remains; service is healthy on the
exact d7d6344b…106c8a image and rollback42482e26…d09e remains available. Deploy checkout clean.

All six merge-b9d3ac6 post-merge checks PASS. Both local/remote feature tips remain contained after
fresh fetch, but branch deletion is intentionally deferred for the existing user-owned settings change.

Approved PR144 delivery is complete. OMR-Q3 stays IN_PROGRESS: printed21, numeric tempo, RH final
ties and broader source accuracy are still unresolved. Existing stored scores were not changed;
re-upload is required to apply new recognition to an old score. No full-score correctness claim.
