# 작업 규약 중복 정리

Status: IN_REVIEW
Date: 2026-09-28

## Objective

CI 중복 제거(D-087) 뒤에 남은 규약 쪽 중복을 없앤다. 같은 커밋 트리를 로컬과 CI에서 반복 검증하는 일,
같은 검증 결과를 여러 문서에 반복해 적는 일, 규칙이 여러 문서에 나뉘어 적힌 상태를 정리한다.
품질 기준(재현 테스트 선행, 필수 CI, 리뷰 해결, 사용자 병합 승인)은 바꾸지 않는다.

## 근거

- PR195: 로컬 Playwright를 head마다 실행 → CI가 같은 E2E를 두 벌 실행 → 병합 후 로컬 main에서 Playwright 372건과
  tsc·lint·Jest·build를 다시 실행 → 병합 커밋 CI가 또 실행([리뷰](../reviews/PR-195.md)).
- 한 검증 결과가 Lore `Tested`, validation, reviews, phase Progress, HANDOFF, PR 본문 표에 거의 같은 문장으로 들어갔다.
- HANDOFF는 규약("과거 세션 본문을 덧붙이지 않는다")과 달리 360줄이며 대부분 09-14~09-24에 끝난 작업이었다.
- 읽기 순서가 AGENTS와 `docs/recovery/README.md`에 서로 다르게 정의됐고, WORKFLOW가 AGENTS 규칙을 다시 적었다.

## Work stages

1. AGENTS: 검증 범위 규칙(로컬 = 재현·변경 영역·전체 Jest·tsc·lint, 전체 E2E·build는 CI, 병합 후는 Post-merge checks로 확인),
   기록 원본 표, HANDOFF 유지 규칙(끝난 작업 제거, 150줄), 읽기 순서 단일 정의, 커밋당 결정 하나.
2. WORKFLOW: 규칙 반복을 빼고 명령 절차만(venv 준비, 스레드 id로 resolve, `--match-head-commit` 병합, 브랜치 정리).
3. README 읽기 순서 제거, Lore `Tested` 한 줄 규칙, PR 템플릿 Validation을 링크로, HANDOFF 템플릿을 실제 구조로.
4. 병합 후 main 상태 기록으로 HANDOFF를 새 규칙에 맞게 축소한다(유효 제약·다음 행동 보존).

## Completion criteria

- 규칙이 AGENTS 한 곳에만 있고, WORKFLOW·README·템플릿은 그것을 다시 정의하지 않는다.
- 병합 후 HANDOFF가 150줄 이내이며, 아직 유효한 제약·다음 행동·운영 상태는 모두 남아 있다.

## Scope

AGENTS.md, WORKFLOW.md, `docs/recovery/README.md`, LORE_COMMIT_PROTOCOL.md, PR 템플릿, HANDOFF 템플릿, D-088.
제외: 애플리케이션 코드, CI 워크플로(D-087에서 완료), 과거 validation·reviews 파일 재작성.

## Progress

- 2026-09-28: 규약 문서 수정. PR 진행(CI·리뷰·병합)은 [리뷰 로그](../reviews/PR-199.md), 검증은
  [validation](../validation/2026-09-28-doc2-harness-dedupe.md)이 원본이다. 병합 뒤 상태는 main에서 갱신한다.
