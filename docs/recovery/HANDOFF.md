# Current Handoff

Last updated: 2026-07-22 KST

## Current state

- Program status: `IN_PROGRESS`
- Current phase: **P0-C `DONE`**. Stages 1–3 merged via PR #19; stages 4–5 merged via PR [#26](https://github.com/landfill/ClairKeys/pull/26) at `157c3b4`.
- Phase document: `docs/recovery/phases/P0-C-playback-sync.md` (`DONE`)
- Base branch: `main`
- Handoff delivery: none pending. `AGENTS.md` § "핸드오프 문서는 즉시 `main` 커밋" now governs this file's own updates — they commit straight to `main`, no PR to track here.
- Open pull request: none.
- Completed pull requests:
  - [#26](https://github.com/landfill/ClairKeys/pull/26) — `MERGED` at `157c3b4` (**P0-C** `DONE`: one AudioContext/score-time anchor for audio scheduling and visuals, same-render key activation, unavailable/suspended/stale-start lifecycle handling, and 1-minute/5-minute drift gates below 1 ms. Post-merge Tests run `29898010765` passed all jobs. Both work-branch tips are contained in `main`; deletion is deferred because user-owned untracked files remain. Review log: `docs/recovery/reviews/PR-26.md`)
  - [#24](https://github.com/landfill/ClairKeys/pull/24) — `MERGED` at `a63d51f` (**P0-B** `DONE`: `converter.py` rewritten — seconds-based onset accumulation, per-measure backup/chord cursor, `<tie>` duration merge, staff-based hands; `omr/cli.py` seam + Jest corpus gate `converterCorpus.test.ts` scoring the converter via `compareAnimationData`. CodeRabbit's 3 findings fixed in `1e902a4` — cross-barline tie (part-scope `open_ties`, fixture 09), multi-part global tempo timeline (fixture 08), test subprocess timeout/maxBuffer. 9-fixture corpus green on CI. Both branch tips confirmed in `main`; remote+local branches deleted. Review log: `docs/recovery/reviews/PR-24.md`)
  - [#25](https://github.com/landfill/ClairKeys/pull/25) — `MERGED` at `83de264` (dependency-only: pins `sharp >=0.35.0` via npm `overrides`, clearing the high libvips advisories, GHSA-f88m-g3jw-g9cj, that turned `Security Audit` red for every PR; `next` dropped high→moderate. No CodeRabbit findings. Merged first so #24 re-ran against a green audit baseline. Branch deleted after tip confirmed in `main`. Review log: `docs/recovery/reviews/PR-25.md`)
  - [#23](https://github.com/landfill/ClairKeys/pull/23) — `MERGED` at `d59ea9d` (**P0-A** `DONE`: canonical MIDI animation contract + legacy-tolerant validator, 7-case golden corpus + `compareAnimationData`, render-path wiring replacing the `as` cast, `converter.py` emits `version`. Three review waves (14 findings) handled incl. two by-design rejects keeping fixtures as ground truth; D-009 recorded. Work branch deleted after tip confirmed in `main`)
  - [#21](https://github.com/landfill/ClairKeys/pull/21) — `MERGED` at `3349fd3` (docs-only: `DECISIONS.md` D-008 `Proposed`, OMR hosting Fly.io-reuse vs Cloud Run. CodeRabbit C1–C7 accuracy fixes resolved — notably C3: the deployed service does not silently emit demo output; on a Docker-less host the OMR job **fails**. Work branch deleted after tip confirmed in `main`)
  - [#19](https://github.com/landfill/ClairKeys/pull/19) — `MERGED` at `47e30af` (issue #18: one-shot 10s-capped audio scheduler → rolling look-ahead scheduler; P0-C Work stages 1–3. CodeRabbit R1–R3 resolved; work branch deleted after both tips confirmed in `main`)
  - [#14](https://github.com/landfill/ClairKeys/pull/14) — `MERGED` at `05c70df` (P0-D handoff closeout)
  - [#15](https://github.com/landfill/ClairKeys/pull/15) — `MERGED` at `992615f` (agent contract consolidation, `CLAUDE.md` reduced to a pointer at `AGENTS.md`)
  - [#16](https://github.com/landfill/ClairKeys/pull/16) — `MERGED` at `32b5739` (recorded PR #14/#15 merge results; last PR of its kind — see #17)
  - [#17](https://github.com/landfill/ClairKeys/pull/17) — `MERGED` at `a78d0f2` (handoff documents now commit directly to `main`, ending the self-referential "PR records that a PR merged" pattern PR #16 exemplified)
- Superseded pull request: [#11](https://github.com/landfill/ClairKeys/pull/11) — `CLOSED`
- Current objective: choose the next bounded follow-up after P0-A through P0-D completion. The immediate evidence gaps are authenticated live `/sheet/2` playback and the unfiled deployment-workflow credential failures.

## Latest verified result

- PR #26 local verification on `e175314`: 39 Jest suites / 362 tests passed; `npx tsc --noEmit`, repository lint, and production build passed; Chromium + Mobile Chrome Playwright smoke checks passed 6/6. Firefox/WebKit local projects could not run because their Playwright browser binaries are not installed. Authenticated live `/sheet/2` playback remains unverified. Full evidence: `docs/recovery/validation/2026-07-22-p0c-shared-clock-and-drift.md`; review log: `docs/recovery/reviews/PR-26.md`.
- PR #26 CI verification on `e175314`: `Run Tests`, both `E2E Tests`, `Lint`, `Lint and Type Check`, `Unit Tests`, `Security Audit`, `Security Scan`, `Build Check`, `Accessibility Check`, `CodeQL`, `All Checks Complete`, PR summary, and Vercel all passed. No actionable GitHub review was present at the final 2026-07-22 check. The PR merged at `157c3b4`; post-merge Tests run `29898010765` also passed all jobs.
- P0-D is `DONE`. `docs/recovery/phases/P0-D-quality-gates.md` records all four completion criteria met.
- Issue [#7](https://github.com/landfill/ClairKeys/issues/7) is `CLOSED`: PR #12 replaced the aspirational `piano-player.spec.ts`/`sheet-music-workflow.spec.ts` (dashboard/auth fixtures absent from the product) with `e2e/application-smoke.spec.ts`, 15 cross-browser public-route smoke checks. The `E2E Tests` check has passed on every subsequent `main` HEAD checked, including PR #12's own merge commit `271f4c6`.
- Issue [#9](https://github.com/landfill/ClairKeys/issues/9) is `CLOSED`: `main` branch protection is configured with required status checks `Lint`, `Security Audit`, `Run Tests`, `E2E Tests` (`strict: false`, `enforce_admins: false`). `gh api repos/landfill/ClairKeys/branches/main/protection` confirms this (previously `404 Branch not protected`). The agent's write attempt was blocked by the local auto-mode classifier as a repository-admin action; the user applied the payload directly via `gh api -X PUT`.
- Whether to additionally require pull requests / forbid direct pushes to `main` (issue #9's fourth checklist item) remains an explicit open decision, not yet made.
- PR #14 (P0-D closeout docs) and PR #15 (agent contract consolidation: sibling-project practices adopted into `AGENTS.md`/`WORKFLOW.md`/`LORE_COMMIT_PROTOCOL.md`, `CLAUDE.md` reduced to a pointer) were both merged with the user's explicit approval, checked out clean at merge time, and had their remote/local work branches deleted only after confirming both tips were included in updated `main`.
- Full evidence: `docs/recovery/validation/2026-07-20-p0d-branch-protection-and-issue-closeout.md`; PR review logs at `docs/recovery/reviews/PR-14.md` and `docs/recovery/reviews/PR-15.md`.
- OBSERVED (pre-existing, unrelated to P0-C): [Deploy run 29898010779](https://github.com/landfill/ClairKeys/actions/runs/29898010779) on merge commit `157c3b4` passed pre-deploy tests and build, then failed in `Deploy to production` because `vercel-token` was not supplied, in `Run database migrations` because `DATABASE_URL` was empty (Prisma `P1012`), and consequently in `Notify deployment status` because its failure branch exits 1. These failures predate P0-C and still have no dedicated GitHub issue.
- CLEANUP BLOCKER: local and remote `codex/p0-playback-sync-stages-4-5` tips are fully contained in `main`, but both refs were retained because the worktree has pre-existing user-owned untracked files (`fix_*.js`, `src/components/performance/`, `test-results/`, and `ts_errors*.log`). Do not delete either branch until those files are resolved or explicitly cleared by the user.

## Next actions

1. Verify authenticated live browser playback of `/sheet/2`, including issue #18's >10-second audio fix end-to-end. Local Chromium public-route smoke checks passed, but they do not exercise this authenticated score.
2. Open a dedicated GitHub issue for the post-merge `Run database migrations` / `Deploy to production` / `Notify deployment status` failures, using run `29898010779` as current evidence.
3. P0-B leftovers remain non-blocking: cross-staff/missing-hand fallback is corpus-covered but not separately documented; ties spanning >2 measures and same-measure conflicting per-part tempos are untested (see `docs/recovery/reviews/PR-24.md`).
4. Resolve or explicitly clear the user-owned untracked worktree files before deleting the retained local and remote P0-C work branches.
5. OMR pipeline defects remain filed and deferred: issue #20 (TS demo stub) and issue #22 (server-side Docker-in-Docker/Audiveris runtime defect). Hosting choice D-008 remains `Proposed`.
6. If the direct-push policy for `main` is decided, extend the branch protection payload with `required_pull_request_reviews` / `restrictions` accordingly.

## Existing user-owned working tree changes

아래 파일은 이번 문서 현행화 이전부터 존재한 사용자 변경이며, 명시적으로 제외한다.

- `.claude/settings.local.json`
- `.claude/settings.json`
- `prisma/schema.prisma`
- `.omx/`
- `docs/.bkit-memory.json`
- `docs/.pdca-status.json`
- `fix_api_tests.js`
- `fix_semicolons.js`
- `fix_ts_errors_batch_*.js`
- `src/components/performance/`
- `test-results/`
- `ts_errors*.log`

## Product-critical follow-up order

P0-A는 파일 범위가 겹치지 않으면 P0-D와 병렬로 시작할 수 있다. 이후 핵심 제품 작업은 다음 의존 순서를 유지한다.

1. P0-A: canonical animation contract와 양손·다성부 golden fixture
2. P0-B: MusicXML 박자/voice/staff/backup 변환 정확도
3. P0-C: AudioContext 기준 시계와 애니메이션 동기화

새 세션은 이 HANDOFF와 필요한 후속 문서를 읽고 `/sheet/2` 실브라우저 검증 또는 배포 실패 이슈 신설 중 하나를 선택한다. P0-A/P0-B/P0-C/P0-D는 모두 `DONE`이며 열린 PR은 없다.
