# Current Handoff

Last updated: 2026-07-22 KST

## Current state

- Program status: `IN_PROGRESS`
- Current phase: **P0-C `IN_REVIEW`**. Stages 4–5 are implemented in review-ready PR [#26](https://github.com/landfill/ClairKeys/pull/26) at `e175314`; merge is pending CI/review and the user's explicit approval.
- Phase document: `docs/recovery/phases/P0-C-playback-sync.md` (`IN_REVIEW`)
- Base branch: `main`
- Handoff delivery: none pending. `AGENTS.md` § "핸드오프 문서는 즉시 `main` 커밋" now governs this file's own updates — they commit straight to `main`, no PR to track here.
- Open pull request: [#26](https://github.com/landfill/ClairKeys/pull/26) — `OPEN`, review-ready (non-draft), branch `codex/p0-playback-sync-stages-4-5`, head `e175314`. All CI/Vercel checks are green; GitHub REST reports `mergeable=true`, `mergeable_state=clean`; inline comments and submitted reviews are both empty. Awaiting the user's explicit merge approval.
- Completed pull requests:
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
- Current objective: obtain the user's explicit merge approval for clean PR #26, then re-check live state, merge, clean branch refs, and close P0-C. The implementation shares one AudioContext score-time anchor across scheduling and visuals, derives key activation in the same render, and gates 1-minute/5-minute drift below 1 ms.

## Latest verified result

- PR #26 local verification on `e175314`: 39 Jest suites / 362 tests passed; `npx tsc --noEmit`, repository lint, and production build passed; Chromium + Mobile Chrome Playwright smoke checks passed 6/6. Firefox/WebKit local projects could not run because their Playwright browser binaries are not installed. Authenticated live `/sheet/2` playback remains unverified. Full evidence: `docs/recovery/validation/2026-07-22-p0c-shared-clock-and-drift.md`; review log: `docs/recovery/reviews/PR-26.md`.
- PR #26 CI verification on `e175314`: `Run Tests`, both `E2E Tests`, `Lint`, `Lint and Type Check`, `Unit Tests`, `Security Audit`, `Security Scan`, `Build Check`, `Accessibility Check`, `CodeQL`, `All Checks Complete`, PR summary, and Vercel all passed. No actionable GitHub review was present at the final 2026-07-22 check.
- P0-D is `DONE`. `docs/recovery/phases/P0-D-quality-gates.md` records all four completion criteria met.
- Issue [#7](https://github.com/landfill/ClairKeys/issues/7) is `CLOSED`: PR #12 replaced the aspirational `piano-player.spec.ts`/`sheet-music-workflow.spec.ts` (dashboard/auth fixtures absent from the product) with `e2e/application-smoke.spec.ts`, 15 cross-browser public-route smoke checks. The `E2E Tests` check has passed on every subsequent `main` HEAD checked, including PR #12's own merge commit `271f4c6`.
- Issue [#9](https://github.com/landfill/ClairKeys/issues/9) is `CLOSED`: `main` branch protection is configured with required status checks `Lint`, `Security Audit`, `Run Tests`, `E2E Tests` (`strict: false`, `enforce_admins: false`). `gh api repos/landfill/ClairKeys/branches/main/protection` confirms this (previously `404 Branch not protected`). The agent's write attempt was blocked by the local auto-mode classifier as a repository-admin action; the user applied the payload directly via `gh api -X PUT`.
- Whether to additionally require pull requests / forbid direct pushes to `main` (issue #9's fourth checklist item) remains an explicit open decision, not yet made.
- PR #14 (P0-D closeout docs) and PR #15 (agent contract consolidation: sibling-project practices adopted into `AGENTS.md`/`WORKFLOW.md`/`LORE_COMMIT_PROTOCOL.md`, `CLAUDE.md` reduced to a pointer) were both merged with the user's explicit approval, checked out clean at merge time, and had their remote/local work branches deleted only after confirming both tips were included in updated `main`.
- Full evidence: `docs/recovery/validation/2026-07-20-p0d-branch-protection-and-issue-closeout.md`; PR review logs at `docs/recovery/reviews/PR-14.md` and `docs/recovery/reviews/PR-15.md`.
- OBSERVED (pre-existing, unrelated to P0-C): post-push verification for handoff commit `3d35513` passed all jobs in [Tests run 29889125369](https://github.com/landfill/ClairKeys/actions/runs/29889125369), including E2E. [Deploy run 29889125398](https://github.com/landfill/ClairKeys/actions/runs/29889125398) failed in `Deploy to production` because `vercel-token` was not supplied, in `Run database migrations` because `DATABASE_URL` was empty (Prisma `P1012`), and consequently in `Notify deployment status` because its failure branch exits 1. These deployment failures predate this session and still have no dedicated GitHub issue.

## Next actions

1. Wait for the user's explicit merge approval for PR #26. Do not infer approval from green CI, clean mergeability, or the absence of review comments.
2. After approval, re-check PR #26 head/checks/reviews/mergeability, merge, verify `main`, clean both work-branch refs only after tip containment is proven, then mark P0-C `DONE` in the direct-to-`main` handoff records.
3. Still unverified: authenticated live browser playback of `/sheet/2`, including issue #18's >10-second audio fix end-to-end. Local Chromium public-route smoke checks passed, but they do not exercise this authenticated score.
4. Open a dedicated GitHub issue for the post-merge `Run database migrations` / `Deploy to production` / `Notify deployment status` failures.
5. P0-B leftovers remain non-blocking: cross-staff/missing-hand fallback is corpus-covered but not separately documented; ties spanning >2 measures and same-measure conflicting per-part tempos are untested (see `docs/recovery/reviews/PR-24.md`).
6. OMR pipeline defects remain filed and deferred: issue #20 (TS demo stub) and issue #22 (server-side Docker-in-Docker/Audiveris runtime defect). Hosting choice D-008 remains `Proposed`.
7. If the direct-push policy for `main` is decided, extend the branch protection payload with `required_pull_request_reviews` / `restrictions` accordingly.

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

새 세션은 이 HANDOFF, 현재 phase 문서(`P0-C-playback-sync.md`), `docs/recovery/reviews/PR-26.md`를 읽고 PR #26의 live CI/review 상태부터 확인한다. P0-A/P0-B/P0-D는 `DONE`이며 P0-C만 병합 전 `IN_REVIEW`다.
