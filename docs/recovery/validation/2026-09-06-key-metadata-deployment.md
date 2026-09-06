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
