# Cloud priority work and startup correction

## Current independent dispatch (supersedes earlier task scope below)

- While this work was in progress, origin/main advanced to cda9024 including PR150 (d78217b) and verified cloud-v4 repair/sample records. Preserved those records when rebasing the local status-only commit.
- Read back the actual saved v4 environment: closed stdin, installed Prisma CLI, full Python requirements, Ubuntu archive mirror, Playwright/PostgreSQL packages and cache maintenance. Retained that verified configuration; v2/v3 below are historical diagnostic attempts.
- Prior overlapping #146 P1 attempt and mixed-history #110 retry were cancelled before starting clean tasks. P1 pause/session behavior already shipped in PR150 and must not be reimplemented.
- Current user explicitly renewed authorization for actual independent issue implementation in cloud, continuing if the local PC disconnects. This is separate from the earlier environment-only scope correction recorded in HANDOFF.
- [Fix CompactPlaybackBar responsive defect](https://chatgpt.com/codex/cloud/tasks/task_e_6aa00288378c8322ba9c72f475b5fa32): remaining #146 narrow pointer:fine390px overflow/zero-width seek; preserve D-056/session/audio/orientation. Requested branch codex/issue-146-compact-toolbar-cloud.
- [Implement issue110 callback URL validation](https://chatgpt.com/codex/cloud/tasks/task_e_6aa002b0e40c8322a876e3d379366416): independent OMR code/test/deploy-preparation docs. Requested branch codex/issue-110-callback-origin-cloud-v4. Do not reuse/publish prior cancelled dde7bfe.
- Both fresh tasks were accepted on main in ClairKeys environment; initial cache-maintenance/repo-refresh states observed. Prompts require cloud-local implementation, tests, Lore commits and ready PR preparation without local-coordinator dependency. gh credentials remain absent unless independently verified; PR creation may need the Codex UI. No merge/deploy/issue closure authorized.

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
