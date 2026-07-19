# ClairKeys Agent Operating Contract

이 파일은 ClairKeys에서 작업하는 모든 코드 에이전트의 공통 진입점이다. 새 세션은 코드 수정 전에 반드시 다음 문서를 순서대로 읽는다.

1. `docs/recovery/README.md`
2. `docs/recovery/HANDOFF.md`
3. 현재 작업 단계 문서
4. `docs/recovery/WORKFLOW.md`
5. `docs/recovery/BASELINE.md`

## 절대 규칙

- `master` 또는 `main`에 직접 커밋하지 않는다.
- 모든 작업은 `codex/<phase>-<topic>` 형식의 별도 브랜치에서 수행한다.
- 기존 미커밋 변경은 사용자 소유로 간주하고 되돌리거나 함께 커밋하지 않는다.
- 한 PR에는 하나의 단계 또는 하나의 명확한 목적만 포함한다.
- 동작 변경 전 회귀 테스트 또는 재현 fixture를 먼저 추가한다.
- 구현 완료 주장은 검증 명령과 결과가 기록된 경우에만 한다.
- 커밋은 저장소 최상위 지침의 Lore Commit Protocol을 따른다.
- PR 생성 후 CI와 리뷰 피드백을 확인하고, 수정·검증·커밋·푸시를 반복한다.
- 사용자가 명시적으로 지시하지 않는 한 PR을 직접 병합하지 않는다.

## 세션 시작 체크리스트

1. `git branch --show-current`와 `git status --short`를 확인한다.
2. 기본 브랜치라면 코드를 수정하기 전에 작업 브랜치를 만든다.
3. `docs/recovery/HANDOFF.md`에서 `Current phase`, `Next action`, `Known blockers`를 확인한다.
4. 현재 단계 문서의 진입 조건과 완료 조건을 확인한다.
5. 작업 계획을 세우고 범위를 벗어나는 문제는 새 단계 후보로 기록한다.

## 세션 종료 체크리스트

1. 단계별 필수 검증을 실행한다.
2. 결과를 `docs/recovery/validation/`에 기록한다.
3. `docs/recovery/HANDOFF.md`를 실제 현재 상태로 갱신한다.
4. 결정이 바뀌었다면 `docs/recovery/DECISIONS.md`에 추가한다.
5. 관련 파일만 선별해 커밋한다.
6. PR이 있다면 `docs/recovery/reviews/PR-<number>.md`를 갱신한다.

## 금지되는 완료 상태

- 빌드가 타입 검사 또는 린트를 생략했는데 전체 검증 성공으로 기록하는 것
- 테스트 실패를 설명 없이 기존 실패로 간주하는 것
- 인메모리 큐를 영속 큐로 표현하는 것
- 데모 멜로디 생성을 실제 악보 변환으로 표현하는 것
- 리뷰 코멘트나 실패한 CI가 남은 상태를 완료로 표시하는 것
