# 2026-09-06 — approved PR143 merge and key-metadata deployment

## Approval, review and exact target

User explicitly approved both merge and production rollout in response to the combined request.
Rechecked final head92c8e1b and all hosted gates. Late CodeRabbit date comment3941846640 was a timezone
false positive:5ee4566 is2026-09-06T04:10:25+09:00,038ee1c is04:31:06+09:00. Replied with commit evidence
and resolved PRRT_kwDOPYJEa86fmW4b; did not change the correct local date.

Merge: `1aa8c71ac2225fbb9fbc1ffa8d3e73022bddd796`, verified on origin and local main. Both work-branch tips
are92c8e1b and contained; remote existence verified. Branches retained for untouched user settings dirt.

## Initial VM/build state

- Clean `/opt/clairkeys-deploy` at79a2328 before fetching/detaching at the exact merge.
- Current/running/rollback `localhost/clairkeys-omr:79a2328` image
  `ff0a347f52b92803398e617c47541cd1b1d43fa366469b9a4625b61c839415ef`, healthy.
- No secret/env/unit changes requested. Build new tag only before cutover:

```sh
podman build --format docker -f Dockerfile.audiveris -t localhost/clairkeys-omr:1aa8c71 .
```

Build underway at this checkpoint. Next: inspect HEALTHCHECK/image, run image-internal83 service tests,
recheck idle state, retag current/restart with rollback retained, external health/auth checks and production
converter replay proving Always C→F while all notes/non-key fields are preserved. Post-merge gates pending.

The broader recognition/page-scale work is not part of this approved deployment. No source PDF or stored
score rewrite is necessary for this converter-only verification.

## Image verification

- Build exit0, tag `localhost/clairkeys-omr:1aa8c71`, image
  `42482e26afb5cdc9c3c2bc7b8ccd89b6b05b02403326e2711f7f00566536d09e`.
- Docker HEALTHCHECK retained (curl /health,30s interval,10s timeout,60s start period,3 retries).
- Ran actual image `/app` modules, with only fixtures/frontend source mounted read-only:

```sh
podman run --rm --network none \
  -v /opt/clairkeys-deploy/fixtures:/fixtures:ro \
  -v /opt/clairkeys-deploy/src:/src:ro \
  -w /app -e PYTHONPATH=/app localhost/clairkeys-omr:1aa8c71 \
  python3 -m unittest discover -s tests
```

All83 tests PASS (0.409s); temporary test container removed. No overlaid candidate module path was used.

## Authorized cutover and tool timeout

Unit matched committed source. Preflight found no JVM or new processing directories. Historical
8e33ffee-70a3-45da-a809-6b52745be42d still returned authenticated404; it was left untouched.

The first cutover tool request did not execute because the automatic permission review timed out.
The tool explicitly allowed one retry; identical current-image/job-state guards were retained and that
single retry succeeded. An unrelated read-only CI query also timed out before execution and succeeded
on its one retry. Do not describe these timeouts as unsafe-action denials or claim extra user approval.

- current tag set to1aa8c71 and `systemctl restart clairkeys-omr` exited0.
- Service active/running, actual image exactly42482e26…36d09e; manual healthcheck exit0/healthy.
- External GET /health=200; unauthorized POST /process=401.
- Previous tag79a2328 still resolves to
  `ff0a347f52b92803398e617c47541cd1b1d43fa366469b9a4625b61c839415ef` for rollback.
- Deploy checkout remains clean; no env/unit/secret change. All six merge1aa8c71 checks passed.

## Actual production converter replay

Used the previously retained, exact-lineage MXL/API JSON for Always, Satie and Love. Script and JSON
report are in `/data/analysis/key-live-qkxQbc`; local copies are Git-excluded under
`local-test-data/results/key-deploy-2026-09-06/`. No new source PDF or full OMR re-upload was needed.

Command used `podman exec -e PYTHONPATH=/app clairkeys-omr-prod python3 .../replay.py .../replay-summary.json`.
Report confirmed converterSource `/app/omr/converter.py` and assertions passed:

| Score | Notes exactly equal | Key before→after | Duration unchanged | Other changes except generated_at |
| --- | ---: | --- | ---: | --- |
| Always With Me | 647 | C→F | 127.5s | keySignature only |
| Satie original | 239 | D→D | 135s | none |
| Love Affair solo | 411 | E→E | 115.25s | none |

Every other top-level/nested field, including warnings and tempo provenance, compared equal. This is
the expected bounded fix, not proof of complete musical accuracy. Missing bars/whole notes/tempo and
the page-scale retry policy are not repaired here. Existing stored scores/database were not modified.
Full browser upload/storage/callback roundtrip was not exercised in this converter-only rollout.

Delivery complete; OMR-Q1 can be marked DONE. Both merged work-branch tips are contained but retained
under the existing user-dirty-worktree rule. No runtime worker or test JVM remains from this validation.
