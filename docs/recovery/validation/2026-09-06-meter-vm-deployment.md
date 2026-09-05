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
