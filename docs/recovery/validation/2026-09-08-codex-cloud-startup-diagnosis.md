# Cloud startup failure diagnosis

Date: 2026-09-08 KST
Base inspected: f33f2e6 (origin/main); live signed-in Codex UI and GitHub API inspected.

## Observed failures

- [Upload trial](https://chatgpt.com/codex/cloud/tasks/task_e_6a9f475770348322b2aca68b54cae987): two attempts show `Startup script timed out after 1200 seconds`. The expanded second attempt log reaches npm/Python/Playwright installation, PostgreSQL 16 startup, schema push, SQL query, Chromium/Firefox/WebKit launch success, gh 2.96.0 availability and `CLAIRKEYS_SETUP_OK`. A marker is not proof the platform accepted setup completion. The exact cause of this earlier timeout is unresolved.
- [P1 playback trial](https://chatgpt.com/codex/cloud/tasks/task_e_6a9f610924d8832299fc4a466de6d38d): `Script exited with code 124`. Actual v2 log starts at 2026-09-08 01:13:29 UTC; npm installs 893 packages in 34 seconds, then `timeout 60 npx --no-install prisma generate` prints schema loaded and stops. No later step is shown.
- [Issue110 trial](https://chatgpt.com/codex/cloud/tasks/task_e_6a9f619af7e083228648e7c39c9734d2): same exit124 and Prisma command; v2 log starts at 01:15:56 UTC, npm installs 893 packages in 37 seconds. No agent implementation output is present.
- Thus the two later observed failures are startup Prisma generation timeouts, before issue implementation or GitHub write verification. The logs do not establish why Prisma hangs (telemetry, engine download, subprocess or platform behavior remain unproven).
- UI duration labels around 30 seconds are inconsistent with command timeout details; do not use these labels as reliable elapsed-time measurements.

## Current saved environment differs from failed executions

[Environment](https://chatgpt.com/codex/cloud/settings/environment/6a9f450184388191908f370ed83a11a5) currently contains v3. Setup runs bounded npm ci, Pillow10.1.0 installation, Playwright installation with OS dependencies and PostgreSQL package installation. It no longer explicitly generates Prisma or starts DB/browser services. Its marker is `CLAIRKEYS_DEPENDENCIES_READY`.

Maintenance runs npm ci, Pillow installation and Playwright installation, ending in `CLAIRKEYS_CACHE_READY`. Description asks agent phase to run `CHECKPOINT_DISABLE=1 npx prisma generate` and initialize a test DB as needed. The variable is a saved workaround suggestion, not a verified fix. No v3 successful execution was observed in the three visible project tasks. This audit did not edit environment settings or retry implementation tasks.

The detail page shows custom-domain agent internet access enabled, caching enabled and no secrets listed. Earlier repository configuration evidence records GitHub-only domains. No actual cloud gh authentication, git push or PR creation result exists. Local gh access does not establish cloud credentials.

GitHub live reads: latest PR remains merged148; no trial PR appears in latest five PRs. main protection requires Lint, Security Audit, Run Tests and E2E Tests; enforce_admins=false, restrictions=null. This does not prove cloud push permission. Issue149 remains open for separate development Supabase/OMR integration infrastructure.

## Next diagnostic action

Validate current v3 setup alone before resuming issue work. Require both its marker and platform completion/agent entry. Then run bounded, timestamped Prisma diagnostics with visible output, separating `CHECKPOINT_DISABLE=1` as a hypothesis, and verify generated client plus test DB readiness. Only after agent entry verify gh authentication/public API reads and the supported PR publication path. Do not broaden GitHub or production permissions as a presumed cure for a startup timeout.

Official reference: https://learn.chatgpt.com/docs/environments/cloud-environment — setup has internet access independently of agent restrictions; secrets are setup-only; cache maintenance is a separate execution path.

## Scope and preservation

Read-only cloud/GitHub diagnosis; no application tests rerun, no application change, new cloud task, retry, permission change, PR, merge or deployment. Existing local settings/screenshots are untouched. Historical user HANDOFF delta was temporarily stashed to allow main fast-forward, excluded from this record commit, then restored separately.
