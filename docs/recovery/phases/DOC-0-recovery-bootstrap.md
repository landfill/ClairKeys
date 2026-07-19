# DOC-0 — Recovery Documentation Bootstrap

Status: `DONE`
Branch: `codex/clairkeys-recovery-roadmap`
PR: https://github.com/landfill/ClairKeys/pull/1
Completed by merge commit: `6174ed088edc5d488c1bc9e16078bbee5081db97`

## Objective

새 세션과 다른 코드 에이전트가 현재 상태, 우선순위, 검증 근거, PR 리뷰 대응을 저장소 안에서 복원할 수 있는 운영 체계를 만든다.

## Entry criteria

- 코드베이스 분석과 최초 검증 결과가 확보되어 있다.
- 실제 기본 브랜치와 기존 사용자 변경이 확인되어 있다.
- 전용 문서 브랜치가 생성되어 있다.

## In scope

- 프로젝트 `AGENTS.md` 운영 계약
- 복구 로드맵과 단계 문서
- 현재 핸드오프와 최초 기준선
- validation, handoff, PR review 템플릿
- PR 생성과 최초 리뷰 대응 기록

## Out of scope

- 애니메이션 변환 코드 변경
- 인증, CI, 큐, OMR 서비스 구현 변경
- PR 병합

## Completion criteria

### Documentation gate

- 모든 상대 Markdown 링크가 유효하다.
- 현재 단계 ID와 문서 경로가 `docs/recovery/HANDOFF.md`에 명시된다.
- staged/committed 범위가 사용자 기존 변경을 제외한다.
- PR이 생성되고 모든 actionable review가 기록·반영된다.
- 문서 PR에 적용되는 필수 검사가 성공하고 PR #1이 병합된다.

PR #1의 병합이 DOC-0의 `DONE` 전환을 확정하는 사건이다. 브랜치에서 `IN_REVIEW`인 상태를 병합 전에 `DONE`으로 미리 바꾸지 않는다.

### Deferred application quality gates

TypeScript, ESLint, Jest와 GitHub Actions branch filter의 기준선 실패는 `docs/recovery/BASELINE.md`에 증거와 함께 보존하며 P0-D가 소유한다. 이 실패는 DOC-0 문서 체계의 완료 조건과 구분하지만, 해결 전까지 애플리케이션 전체 검증 성공으로 표현하거나 후속 단계에서 누락할 수 없다.
