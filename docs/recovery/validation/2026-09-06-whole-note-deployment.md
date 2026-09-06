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
