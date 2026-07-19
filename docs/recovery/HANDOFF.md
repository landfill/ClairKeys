# Current Handoff

Last updated: 2026-07-19 KST

## Current state

- Program status: `IN_PROGRESS`
- Current phase: `P0-D` — 인증·타입·테스트·CI 기준선 복구
- Phase document: `docs/recovery/phases/P0-D-quality-gates.md`
- Working branch: `codex/p0-quality-gates`
- Base branch: `main`
- Pull request: https://github.com/landfill/ClairKeys/pull/4
- PR state: `READY_FOR_REVIEW` (draft 해제 완료)
- Current objective: 실패를 숨기지 않고 Jest·TypeScript·ESLint·보안 감사 문제를 작은 회귀 수정 단위로 해결한다.

## Latest verified result

- Node 22 / npm 10 clean `npm ci`: PASS
- Focused playback regression tests: PASS — 3 suites, 63 tests
  - `src/services/__tests__/audioService.test.ts`
  - `src/services/__tests__/animationEngine.test.ts`
  - `src/hooks/__tests__/useAnimationEngine.test.ts`
- 오디오 활성화, 코드 재생/해제, 곡 종료 시각 보존, practice 모드 계약을 복구했다.
- `Security Audit`의 즉시 실패 원인은 삭제된 `securecodewarrior/github-action-add-sarif@v1` 참조였다. 표준 JSON 아티팩트 업로드로 교체했고, 현재 lockfile의 로컬 audit은 0건으로 통과했다.
- 전체 TypeScript 검사는 현재 기준선 규모 때문에 제한 시간 내 완료되지 않았다. 변경 파일의 집중 Jest 검증은 통과했다.

## Next actions

1. 현재 재생·오디오 회귀 수정과 CI 보안 워크플로 수정을 커밋하고 PR #4에 푸시한다.
2. PR #4의 CodeRabbit/리뷰어 피드백과 새 CI 결과를 확인한다.
3. Unit Tests의 다음 실패 묶음을 고립해 수정한다.
4. TypeScript 오류를 route params, Prisma, 컴포넌트 계약 순으로 줄인다.
5. ESLint 오류를 파일 범위별로 제거한다.
6. 새 CI에서 security audit 아티팩트와 0건 결과를 재확인한다.

## Existing user-owned working tree changes

아래 파일은 이번 PR 작업 이전부터 존재한 사용자 변경이며, 명시적으로 제외한다.

- `.claude/settings.local.json`
- `.claude/settings.json`
- `prisma/schema.prisma`
- `.omx/`
- `docs/.bkit-memory.json`
- `docs/.pdca-status.json`

## Product-critical follow-up order

P0-D와 독립 파일 범위로 진행 가능한 다음 핵심 작업은 다음 순서를 유지한다.

1. P0-A: canonical animation contract와 양손·다성부 golden fixture
2. P0-B: MusicXML 박자/voice/staff/backup 변환 정확도
3. P0-C: AudioContext 기준 시계와 애니메이션 동기화

새 세션은 `docs/recovery/ROADMAP.md`, 현재 phase 문서, 이 HANDOFF, `docs/recovery/reviews/PR-4.md` 순서로 읽는다.
