# 2026-09-05 — PR #141 production VM deployment

## Exact target and recovery

- Merged/application commit: `a7cf0ffe420830830128b1dcb86ab34fabac71b3`.
- VM: `101.79.16.73`, `vm-naver-20260820145930`; unit `clairkeys-omr`; container `clairkeys-omr-prod`.
- Clean detached deployment checkout: `/opt/clairkeys-deploy` at the exact commit above.
- New image: `localhost/clairkeys-omr:a7cf0ff` and `:current`, ID
  `09a9e62d8512481abb3e2177116027404f48f35995ed57bfb00213e42b871576`.
- Preserved rollback: `localhost/clairkeys-omr:acf25f8`, ID
  `12b9a021fad9b77bb74752fcd0da82f1d358916e9bfb4ed10e576addbae8559f`.
- If rollback is needed after confirming the service is idle: tag `clairkeys-omr:acf25f8` as
  `clairkeys-omr:current`, restart `clairkeys-omr`, then repeat image, health and auth checks.
  No rollback was necessary in this deployment.

## Operations and checks

1. Fetched origin/main; refused to proceed if the deployment checkout was dirty; detached at `a7cf0ff`.
2. Built with `podman build --format docker -f Dockerfile.audiveris -t clairkeys-omr:a7cf0ff -t clairkeys-omr:current .`
   from its `omr-service` directory. Docker format is necessary: the prior OCI candidate warned that it dropped HEALTHCHECK.
3. Before restart: only Python in the production container, zero POST /process calls in the preceding five-minute log window,
   prior running-image ID matched the known rollback ID, and current tag matched the new expected image ID.
4. `systemctl restart clairkeys-omr` exited 0. `systemctl is-active` returned `active`.
5. Running container image matched `09a9e62...` exactly. No unit or credential/env file was changed.
6. After confirmed restart completion, probes from outside the VM returned **GET /health 200** and
   **unauthenticated POST /process 401**. Earlier probes during the asynchronous restart are not used as post-restart proof.
7. `podman healthcheck run clairkeys-omr-prod` exited 0; later image/state inspection returned the expected ID and **healthy**.
8. In the actual running container, converted retained `/data/analysis/issue134-9m1By2/out/input.mxl` at tempo 46:
   **133 notes, 10 warnings**. A synthetic in-measure change returned `(start,duration)=[(0,1),(1,0.5)]` as required.
9. Deployment checkout remained clean. Removed only the clean, merged, detached temporary checkout `/opt/clairkeys-pr141`.
   Production checkout, old rollback image, exact MXL and conversion log remain.

Before production switch, the isolated Docker-format image passed the actual-MXL smoke on Python 3.10.12 and
all **46 service tests**, with `/src` read-only mounted for the cross-service timeout source check. The original
standalone run's one missing-source error and the corrected run are recorded in PR-141; no assertion was skipped.

Merge commit `a7cf0ff` has all six post-merge checks green: Run Tests, Lint, Security Audit, Post-merge tests,
Post-merge build and E2E Tests. No real stored score was retimed, no PDF was re-uploaded to a production job,
and no service secret was printed or changed. The deployment resets in-memory completed job state; idle checks
were performed because durable jobs remain a separate P1-B task.

## What this does not prove

- #134's omitted/misrecognized musical notes are not reconstructed. The MXL is retained as known-bad recognition.
- Diagnostics appear for newly converted output; existing JSONs do not gain metadata through this rollout.
- Repeat/ending expansion, flat/minor key metadata and ambiguous tie identity remain separate audit follow-ups.
- Physical-device rendering and a pianist's complete musical evaluation were not performed.
