# Codex cloud environment configuration

Date: 2026-09-08 KST
Repository inspected: `4b4be5751805785d92fb76fda8ba277eb7a2343f`

## Saved configuration

- Created through the signed-in Codex browser UI for existing authorized public repository `landfill/ClairKeys`.
- Environment: [ClairKeys](https://chatgpt.com/codex/cloud/settings/environment/6a9f450184388191908f370ed83a11a5).
- Universal Ubuntu image; Node 22 and Python 3.10 selected. Runtime logs showed Node 22.22.2, npm 11.4.2, Python 3.10.20.
- Description references AGENTS.md, docs/recovery, regression-first changes, review-ready PRs and explicit approval before merge.
- Manual setup: npm ci, Prisma generate, pip install from omr-service/requirements.txt, Playwright install --with-deps, PostgreSQL package installation and startup, container-local test role/database and Prisma db push.
- Final setup also sets DEBIAN_FRONTEND=noninteractive, summarizes installation logs, checks the test database and launches Chromium/Firefox/WebKit before printing CLAIRKEYS_SETUP_OK.
- Cache enabled. Maintenance reinstalls repository dependencies, generates Prisma, installs Playwright, starts PostgreSQL and applies schema to the container-local test DB.
- Environment variables: DATABASE_URL points only to localhost/clairkeys_test using disposable test credentials; NEXTAUTH_URL is localhost:3000; NEXTAUTH_SECRET is an explicit test-only placeholder; CI=true.
- No production secrets, Supabase access, OAuth credentials, OMR VM access or new GitHub permissions were configured.
- User explicitly approved GitHub-only agent network access. Preset is None; allowed domains: github.com, api.github.com, raw.githubusercontent.com, codeload.github.com, objects.githubusercontent.com. HTTP methods remain all for Git operations/API workflows. Setup/maintenance have platform-provided network access independently of this agent-phase restriction.

## Observed verification

- Browser detail page after creation and after final save shows the correct repository, scripts, variables, caching and custom-domain network setting.
- First interactive setup test: npm ci installed 893 packages; Prisma Client 6.19.3 generated; Python requirements installed successfully. npm reported one moderate vulnerability; no dependency changes were attempted.
- First test proceeded through Playwright installation into PostgreSQL package unpacking. Complete setup success was not observed before leaving the create page.
- Second test with clearer logs remained at Running setup scripts after runtime initialization for several minutes without further output. It was explicitly cancelled; UI showed Test cancelled / disconnected. This is an incomplete validation, not a proven application or setup-script failure.
- Final scripts were saved and read back successfully. No cloud issue task was submitted.

## Remaining checks

1. Re-run the environment terminal setup and observe CLAIRKEYS_SETUP_OK, then run lint, type check, unit tests and E2E as applicable. Database/browser smoke commands are configured but have no observed successful result yet.
2. Verify GitHub CLI availability/authentication, API reads, fetch and permitted push behavior inside the agent phase. A network allowlist does not supply credentials. In particular, AGENTS.md's direct main handoff pushes are not yet verified in cloud.
3. Test cache restoration. PostgreSQL is the Ubuntu package version, not a verified match to CI PostgreSQL 15.
4. Real Supabase/OAuth/Audiveris and remote OMR integration need separately configured test services. No production integration validation is claimed.

Configuration is saved; full cloud execution readiness remains unverified.
