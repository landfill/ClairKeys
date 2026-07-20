# Current Handoff

Last updated: 2026-07-20 KST

## Current state

- Program status: `IN_PROGRESS`
- Current phase: `P0-A` — 애니메이션 계약과 golden fixture 확립 (P0-D is `DONE`; P0-A is the next `READY` phase per `docs/recovery/ROADMAP.md`)
- Phase document: `docs/recovery/phases/P0-A-animation-contract.md`
- Base branch: `main`
- Handoff delivery: [PR #14](https://github.com/landfill/ClairKeys/pull/14) from `codex/p0d-handoff-closeout`; consult GitHub and `docs/recovery/reviews/PR-14.md` for its live review state
- Completed pull request: [#12](https://github.com/landfill/ClairKeys/pull/12) — `MERGED` at `271f4c6` (P0-D quality gates)
- Superseded pull request: [#11](https://github.com/landfill/ClairKeys/pull/11) — `CLOSED`
- Current objective: start P0-A on a fresh `codex/p0-animation-contract` branch; P0-D no longer blocks it.

## Latest verified result

- P0-D is `DONE`. `docs/recovery/phases/P0-D-quality-gates.md` records all four completion criteria met.
- Issue [#7](https://github.com/landfill/ClairKeys/issues/7) is `CLOSED`: PR #12 replaced the aspirational `piano-player.spec.ts`/`sheet-music-workflow.spec.ts` (dashboard/auth fixtures absent from the product) with `e2e/application-smoke.spec.ts`, 15 cross-browser public-route smoke checks. The `E2E Tests` check passed both on PR #12's own merge commit `271f4c6` and on current `main` HEAD `5ec5e84` (PR #13's merge commit).
- Issue [#9](https://github.com/landfill/ClairKeys/issues/9) is `CLOSED`: `main` branch protection is configured with required status checks `Lint`, `Security Audit`, `Run Tests`, `E2E Tests` (`strict: false`, `enforce_admins: false`). `gh api repos/landfill/ClairKeys/branches/main/protection` confirms this (previously `404 Branch not protected`). The agent's write attempt was blocked by the local auto-mode classifier as a repository-admin action; the user applied the payload directly via `gh api -X PUT`.
- Whether to additionally require pull requests / forbid direct pushes to `main` (issue #9's fourth checklist item) remains an explicit open decision, not yet made.
- On `main` HEAD `5ec5e84` (PR #13's merge commit, distinct from PR #12's `271f4c6`), `Build application`, `E2E Tests`, `Test before deploy`, `Run Tests`, `Lint`, and `Security Audit` passed. `Run database migrations`, `Deploy to production`, and `Notify deployment status` failed and still have no dedicated GitHub issue.
- Full evidence: `docs/recovery/validation/2026-07-20-p0d-branch-protection-and-issue-closeout.md`.

## Next actions

1. Start P0-A (`docs/recovery/phases/P0-A-animation-contract.md`) on a new `codex/p0-animation-contract` branch from the latest `main`.
2. Open a dedicated GitHub issue for the post-merge `Run database migrations` / `Deploy to production` / `Notify deployment status` failures observed on `5ec5e84`.
3. If the direct-push policy for `main` is decided, extend the branch protection payload with `required_pull_request_reviews` / `restrictions` accordingly.

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

새 세션은 `docs/recovery/ROADMAP.md`, 현재 phase 문서(`P0-A-animation-contract.md`), 이 HANDOFF, `docs/recovery/reviews/PR-14.md` 순서로 읽고 GitHub에서 PR #14의 live state를 확인한다. P0-D는 `DONE`이므로 더 이상 선행 조건이 아니며, `docs/recovery/reviews/PR-12.md`는 품질 게이트 복구의 역사적 근거로만 참조한다.
