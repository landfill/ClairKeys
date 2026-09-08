# Cloud priority work and startup correction

Date: 2026-09-08 KST

## Authorization and priority

- User requested priority GitHub issue development in Codex cloud and explicitly required execution to continue independently of the local PC/session.
- Read-only priority review found no P0/P1 labels among the nine open issues. Issue146 itself calls the playback preparation/play/pause toolbar and instruction-density slice P1, immediately after the delivered PR148 work. HANDOFF and ISSUE-146 stage2 agree. Upload/explore are later P2 work.
- Scope selected: issue146 stage2 playback-control discoverability. Preserve warnings, music/timing/fingering, A-B/seek/speed/gain/position and current orientation/accessibility contracts; revise phase/DECISIONS before a justified mode/geometry change. No merge/deployment/issue closure authorized.
- Priority review by the read-only helper was recovered here. No private agent memory is required.

## Previous trial result

- Upload trial task_e_6a9f475770348322b2aca68b54cae987 failed before implementation with `Startup script timed out after 1200 seconds` (two failed attempts visible).
- Its full setup log nevertheless included Prisma DB synchronization, successful current_database query, Chromium/Firefox/WebKit launch OK, gh2.96.0 and CLAIRKEYS_SETUP_OK.
- Thus package installation alone was not the missing evidence. A lingering process/output handle after service/browser startup is a hypothesis, not an established root cause.

## Saved environment v2

- Browser saved and read back the updated existing ClairKeys environment6a9f450184388191908f370ed83a11a5.
- Setup installs npm dependencies without audit/funding, generates Prisma, installs CI's Pillow10.1.0, Playwright with system dependencies and PostgreSQL packages. Each command has a bounded timeout and visible output/start/end markers.
- Setup/maintenance no longer starts PostgreSQL or launches browsers. Test DB startup/creation and browser checks are performed by the agent after startup when needed.
- Python installation narrowed from the full OMR server requirements to the dependency used by existing CI; this is a web/UI work environment, not an Audiveris production image.
- Maintenance refreshes npm/Prisma/Pillow/Playwright without starting services. Existing Node22/Python3.10, test-only variables, cache and user-approved GitHub-only domains retained.

## New cloud task

- [Cloud priority task](https://chatgpt.com/codex/cloud/tasks/task_e_6a9f610924d8832299fc4a466de6d38d).
- Selected ClairKeys environment and main. Requested branch codex/issue-146-playback-controls-cloud.
- Requested regression-first cloud implementation, actual test/type/lint/build/browser verification, Lore commits, review-ready PR and actionable CI/review handling. No local implementation substitute.
- Prompt explicitly requires continuing without this coordinator/local PC, normal implementation choices handled autonomously, and reporting genuine credential/external-data blockers.
- Initial task acceptance observed. Agent execution and final results must be confirmed from the task, not inferred from dispatch.

## Independent second issue and observed startup failure

- User explicitly requested multiple independent issues. Read-only analysis confirmed #110 callback-origin validation changes OMR Python files, while #146 changes frontend playback. Shared recovery documents must preserve concurrent appends.
- Submitted [Implement issue #110 as independent cloud task](https://chatgpt.com/codex/cloud/tasks/task_e_6a9f619af7e083228648e7c39c9734d2), branch codex/issue-110-callback-origin-cloud, code/tests/deployment-preparation docs only. No production rollout or issue closure.
- Recovered #110 review: fail-closed configured origin, HTTPS except explicit development, strict origin equality, malformed/userinfo/redirect cases, zero-send regression and completed-result preservation; new Python tests must actually run in CI (existing service-contract suite is not fully wired into the Jest wrapper).
- #146 first v2 attempt failed with code124. Full log identifies npm ci success in34 seconds followed by `timeout 60 npx --no-install prisma generate`, which printed the Prisma schema path then timed out.
- Saved/read back v3: removed Prisma generation from both setup and maintenance, and environment description directs agent-phase generation with CHECKPOINT_DISABLE=1. Other dependency installation and GitHub-only access remain. This is a startup diagnostic change, not a claim that Prisma is unnecessary or successfully generated.
- Retried #146 through its existing task after saving v3. Check live state for setup/agent entry; no implementation completion is inferred here.
