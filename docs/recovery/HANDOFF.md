# Current Handoff

Last updated: 2026-07-22 KST

## Current state

- Program status: `IN_PROGRESS`
- Current phase: `P0-B` — MusicXML 변환 정확도 재구현 (`docs/recovery/phases/P0-B-musicxml-converter.md`), now `IN_PROGRESS` with **PR [#24](https://github.com/landfill/ClairKeys/pull/24) OPEN** (review-ready). The converter rewrite is done and the accuracy gate is green: all 7 golden fixtures match within the 10 ms tolerance. Awaiting hosted CI, CodeRabbit review, and the user's explicit merge approval.
- Phase document: `docs/recovery/phases/P0-B-musicxml-converter.md`
- Base branch: `main`
- Handoff delivery: none pending. `AGENTS.md` § "핸드오프 문서는 즉시 `main` 커밋" now governs this file's own updates — they commit straight to `main`, no PR to track here.
- Open pull request: [#24](https://github.com/landfill/ClairKeys/pull/24) — `codex/p0-musicxml-converter` (P0-B). Two commits: `55acbb6` regression-first gate (`omr/cli.py` + `converterCorpus.test.ts`, red on 7/7), `d1a74b6` converter rewrite (seconds-based onset, backup/chord cursor, tie merge, staff-based hands). Review log: `docs/recovery/reviews/PR-24.md`.
- Completed pull requests:
  - [#23](https://github.com/landfill/ClairKeys/pull/23) — `MERGED` at `d59ea9d` (**P0-A** `DONE`: canonical MIDI animation contract + legacy-tolerant validator, 7-case golden corpus + `compareAnimationData`, render-path wiring replacing the `as` cast, `converter.py` emits `version`. Three review waves (14 findings) handled incl. two by-design rejects keeping fixtures as ground truth; D-009 recorded. Work branch deleted after tip confirmed in `main`)
  - [#21](https://github.com/landfill/ClairKeys/pull/21) — `MERGED` at `3349fd3` (docs-only: `DECISIONS.md` D-008 `Proposed`, OMR hosting Fly.io-reuse vs Cloud Run. CodeRabbit C1–C7 accuracy fixes resolved — notably C3: the deployed service does not silently emit demo output; on a Docker-less host the OMR job **fails**. Work branch deleted after tip confirmed in `main`)
  - [#19](https://github.com/landfill/ClairKeys/pull/19) — `MERGED` at `47e30af` (issue #18: one-shot 10s-capped audio scheduler → rolling look-ahead scheduler; P0-C Work stages 1–3. CodeRabbit R1–R3 resolved; work branch deleted after both tips confirmed in `main`)
  - [#14](https://github.com/landfill/ClairKeys/pull/14) — `MERGED` at `05c70df` (P0-D handoff closeout)
  - [#15](https://github.com/landfill/ClairKeys/pull/15) — `MERGED` at `992615f` (agent contract consolidation, `CLAUDE.md` reduced to a pointer at `AGENTS.md`)
  - [#16](https://github.com/landfill/ClairKeys/pull/16) — `MERGED` at `32b5739` (recorded PR #14/#15 merge results; last PR of its kind — see #17)
  - [#17](https://github.com/landfill/ClairKeys/pull/17) — `MERGED` at `a78d0f2` (handoff documents now commit directly to `main`, ending the self-referential "PR records that a PR merged" pattern PR #16 exemplified)
- Superseded pull request: [#11](https://github.com/landfill/ClairKeys/pull/11) — `CLOSED`
- Current objective: land P0-B via PR #24. The converter now matches the golden corpus; next is CI/review handling and, on explicit approval, merge. P0-C stages 4–5 remain and depend on P0-A/P0-B (P0-B nearly complete).

## Latest verified result

- P0-D is `DONE`. `docs/recovery/phases/P0-D-quality-gates.md` records all four completion criteria met.
- Issue [#7](https://github.com/landfill/ClairKeys/issues/7) is `CLOSED`: PR #12 replaced the aspirational `piano-player.spec.ts`/`sheet-music-workflow.spec.ts` (dashboard/auth fixtures absent from the product) with `e2e/application-smoke.spec.ts`, 15 cross-browser public-route smoke checks. The `E2E Tests` check has passed on every subsequent `main` HEAD checked, including PR #12's own merge commit `271f4c6`.
- Issue [#9](https://github.com/landfill/ClairKeys/issues/9) is `CLOSED`: `main` branch protection is configured with required status checks `Lint`, `Security Audit`, `Run Tests`, `E2E Tests` (`strict: false`, `enforce_admins: false`). `gh api repos/landfill/ClairKeys/branches/main/protection` confirms this (previously `404 Branch not protected`). The agent's write attempt was blocked by the local auto-mode classifier as a repository-admin action; the user applied the payload directly via `gh api -X PUT`.
- Whether to additionally require pull requests / forbid direct pushes to `main` (issue #9's fourth checklist item) remains an explicit open decision, not yet made.
- PR #14 (P0-D closeout docs) and PR #15 (agent contract consolidation: sibling-project practices adopted into `AGENTS.md`/`WORKFLOW.md`/`LORE_COMMIT_PROTOCOL.md`, `CLAUDE.md` reduced to a pointer) were both merged with the user's explicit approval, checked out clean at merge time, and had their remote/local work branches deleted only after confirming both tips were included in updated `main`.
- Full evidence: `docs/recovery/validation/2026-07-20-p0d-branch-protection-and-issue-closeout.md`; PR review logs at `docs/recovery/reviews/PR-14.md` and `docs/recovery/reviews/PR-15.md`.
- OBSERVED (pre-existing, unrelated to this session's changes): the merge commit's `Run database migrations`, `Deploy to production`, and `Notify deployment status` jobs have been failing since before this session and still have no dedicated GitHub issue.

## Next actions

1. Drive PR #24 (P0-B) to merge: watch hosted CI, handle any CodeRabbit findings (update `docs/recovery/reviews/PR-24.md` per fix), then wait for the user's explicit merge approval. On approval, merge, confirm `main` reflects both branch tips, delete remote+local `codex/p0-musicxml-converter`, and flip the P0-B phase Status to `DONE`. Remaining phase Work stages 5 (cross-staff / missing-hand fallback beyond the current staff→hand rule) and 6 (accuracy report) are lightly covered by the corpus but not separately documented — note if a follow-up wants them fleshed out.
2. Open a dedicated GitHub issue for the post-merge `Run database migrations` / `Deploy to production` / `Notify deployment status` failures.
3. P0-C Work stages 4 (visual/key-activation share the same clock) and 5 (long-run drift measurement) remain; they still depend on P0-A/P0-B. Also still unverified: live browser playback of `/sheet/2` confirming issue #18's fix end-to-end.
4. OMR pipeline demo/failure defects surfaced this session are now both filed and **deferred to post-P0-B** (not on the current critical path — the roadmap runs on fixtures, not live OMR): (a) TS demo stub — [#20](https://github.com/landfill/ClairKeys/issues/20); (b) server-side container defect — [#22](https://github.com/landfill/ClairKeys/issues/22): `omr-service/Dockerfile.audiveris` installs no JRE/Audiveris and `app.py` selects `audiveris_docker` at import time, so on a Docker-less host the OMR job **fails** (not demo — corrected via PR #21 review C3). Analysis in D-008. Hosting choice (D-008) stays `Proposed`, deferred to P0-B maturity.
5. If the direct-push policy for `main` is decided, extend the branch protection payload with `required_pull_request_reviews` / `restrictions` accordingly.

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

새 세션은 `docs/recovery/ROADMAP.md`, 현재 phase 문서(`P0-A-animation-contract.md`), 이 HANDOFF 순서로 읽는다. P0-D는 `DONE`이고 PR #14~#17이 모두 병합되어 추적할 열린 PR이 없다 — 다음 작업은 P0-A다. `docs/recovery/reviews/PR-12.md`, `PR-14.md`~`PR-17.md`는 품질 게이트·규약 복구의 역사적 근거로만 참조한다.
