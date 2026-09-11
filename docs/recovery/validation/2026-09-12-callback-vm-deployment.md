# OMR callback-origin VM rollout

Date: 2026-09-12 KST
Authorization: user explicitly requested OMR VM deployment after PR151/152 merges.
Target: e652c643920625f3baccff4f0500110357aa2ba9
Image: f858f14e0524230add2ce2f42aabc77c825d8f1a870bdc31f447a229d39d5f1d
Prior image: 1a28f10ea2bb5fb6f4a038008c5b89ec0556ab8049fcac002009c2e1dcf24173

## Preflight and build

- Existing SSH identity and pinned known host used. Deployment checkout was clean at PR145/1edbcea.
- Service active/healthy; only Python process. The sole historical processing directory's job
  returned404; no active native conversion was observed. Historical directory preserved.
- Env was mode600, production marker and secret present, callback origin absent.
- Public /api/auth/providers returned callback origins exactly https://clairkeys.vercel.app.
- Clean checkout detached at target; built version-only tag with:
  `podman build --format docker --label org.opencontainers.image.revision=e652c643920625f3baccff4f0500110357aa2ba9 -f Dockerfile.audiveris -t localhost/clairkeys-omr:e652c643920625f3baccff4f0500110357aa2ba9 .`
- Build exit0. Native engine/dependency layers reused; current tag was unchanged during validation.

## Image validation

`podman run --rm --network none --workdir /app -v /opt/clairkeys-deploy/fixtures:/fixtures:ro -v /opt/clairkeys-deploy/src:/src:ro --entrypoint sh <image> -c 'ln -s /app /omr-service && python3 -m unittest discover -s tests -p "test_*.py"'`

162 tests, OK with6 private/native-fixture skips. Repo fixtures mounted read-only; disposable
container provides the repository-root symlink required by existing static patch tests. No code overlay,
production env or network. Callback negative cases use fake tokens and mock HTTPX transports.
Full output: local-test-data/results/callback-deploy-2026-09-12/image-tests.log.

## Cutover and rollback assets

- Rechecked old running image ID, native-process absence and historical-job404 before restart.
- Old image tagged localhost/clairkeys-omr:rollback-pr151-20260912.
- Backed up /etc/clairkeys-omr.env to /etc/clairkeys-omr.env.before-pr151-20260912, mode600.
- Atomically added CLAIRKEYS_CALLBACK_ORIGIN=https://clairkeys.vercel.app. Compared old/new secrets
  internally: equal. Both env and backup mode600. Secret was never printed or transferred.
- Tagged validated candidate as current; systemctl restart clairkeys-omr exited0.
- Running image equals the exact candidate; systemd active, /health healthy, manual podman healthcheck
  exits0. External /health200 and unauthenticated POST /process401.
- Unit, concurrency, VM ingress/network and recognition-engine settings unchanged.
- Rollback remains available by restoring the retained image tag and restarting; new origin setting
  may remain because the prior image ignores it. No rollback was needed or executed.

## Real application smoke

- Reused /data/testpdf/wtk1-prelude1-a4.pdf. Inbound local copy SHA256:
  b1c5be9fb63954df9c1a3e7b651ae930c4e5e332a5ab3e14b197379cfa04c35a.
- Uploaded through the already authenticated app as a clearly named private deployment-validation
  score, without BPM override. Original VM fixture unchanged.
- Sheet55, job a906bfc9-9e95-4714-9aa9-4c9763b2cd85.
- Actual production /status and /result: completed, delivery_status=delivered,514 notes,147.75 seconds.
  The sheet ID is under file_info; initial read assumed a top-level key and raised KeyError, then the
  corrected read verified sheet55. No production mutation resulted from that read error.
- Actual container env is production and canonical origin. Production token used only internally
  for loopback reads and the service's legitimate configured callback.
- podman logs confirms delivery success. System journal alone did not contain the application message;
  use podman logs for app-level evidence. Only selected IDs/statuses were extracted, not raw logs.
- Stored sheet page loads and renders the animation. Playback advanced to10 seconds; pause and stop
  verified. Private test sheet55 retained for user review, not deleted or published.
- Runtime logs contain neither the real secret nor the complete callback URL. Job directory was
  automatically removed. Deploy checkout clean; service active/running at final check; external health200.

## Limits and remaining scope

Negative destinations were validated offline against the exact deployed image with fake credentials;
no production token was sent to an invalid host. Musical accuracy is not claimed: the UI still reports
five rhythm-warning measures on this existing fixture. No existing library score was edited/deleted.
Issue110 remains open because this deployment request did not ask for issue closure.
