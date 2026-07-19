# DOC-0 — Recovery Documentation Bootstrap

Status: `IN_REVIEW`
Branch: `codex/clairkeys-recovery-roadmap`
PR: https://github.com/landfill/ClairKeys/pull/1

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

- 모든 상대 Markdown 링크가 유효하다.
- 현재 단계 ID와 문서 경로가 `docs/recovery/HANDOFF.md`에 명시된다.
- staged/committed 범위가 사용자 기존 변경을 제외한다.
- PR이 생성되고 모든 actionable review가 기록·반영된다.
- 필수 검사가 성공하고 사용자 병합 승인만 남는다.
