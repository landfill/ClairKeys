# Current Handoff

Last updated: 2026-07-20 KST

## Current state

- Program status: `IN_PROGRESS`
- Current phase: `P0-D` — 인증·타입·테스트·CI 기준선 복구
- Phase document: `docs/recovery/phases/P0-D-quality-gates.md`
- Working branch: `codex/p0d-handoff-sync`
- Base branch: `main`
- Current pull request: [#13](https://github.com/landfill/ClairKeys/pull/13) — `OPEN`, `READY_FOR_REVIEW`, `MERGEABLE`
- Completed pull request: [#12](https://github.com/landfill/ClairKeys/pull/12) — `MERGED` at `271f4c6`
- Superseded pull request: [#11](https://github.com/landfill/ClairKeys/pull/11) — `CLOSED`
- Current objective: review and land the documentation-only handoff synchronization in PR #13, then finish P0-D by configuring `main` branch protection and required checks in issue #9.

## Latest verified result

- PR #12 merged into `main` on 2026-07-20 at 13:28 KST. Its final head was `5d7afc3`; the merge commit is `271f4c6`.
- PR #11 was closed as superseded after its accessibility changes were included in PR #12.
- PR #12 final-head checks passed: lint, type, unit, build, accessibility, both E2E jobs, security audit/scan, CodeQL, Vercel, `All Checks Complete`, and `PR Summary`.
- The Playwright suite now has 15 real cross-browser public-application smoke checks. The PR jobs completed in under three minutes, and the `main` merge commit's `E2E Tests` check passed.
- GitHub still reports issues [#7](https://github.com/landfill/ClairKeys/issues/7) and [#9](https://github.com/landfill/ClairKeys/issues/9) as open. Issue #7's implementation and runtime completion criteria are satisfied by PR #12 and need administrative closure.
- The `main` branch-protection endpoint returns `404 Branch not protected`. Required-check enforcement is therefore not configured, so P0-D is not complete.
- On merge commit `271f4c6`, `Build application`, `E2E Tests`, `Test before deploy`, `Run Tests`, `Lint`, and `Security Audit` passed. `Run database migrations`, `Deploy to production`, and `Notify deployment status` failed and require separate deployment triage; they must not be represented as green.
- Local production build remains externally blocked when `next/font` cannot reach Google Fonts; hosted CI remains the build authority for the quality-gate iteration.

## Next actions

1. Configure `main` branch protection and required-check wiring to resolve issue #9 and finish P0-D.
2. Confirm issue #7 against the merged PR #12 evidence and close it as completed.
3. Triage the failed post-merge database migration and production deployment jobs in a separate GitHub issue.
4. After P0-D closes, continue with the product-critical P0-A/P0-B/P0-C sequence.

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

P0-D 이후 핵심 제품 작업은 다음 순서를 유지한다.

1. P0-A: canonical animation contract와 양손·다성부 golden fixture
2. P0-B: MusicXML 박자/voice/staff/backup 변환 정확도
3. P0-C: AudioContext 기준 시계와 애니메이션 동기화

새 세션은 `docs/recovery/ROADMAP.md`, 현재 phase 문서, 이 HANDOFF, `docs/recovery/reviews/PR-12.md` 순서로 읽는다.
