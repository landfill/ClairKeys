# Branch, Validation, PR, and Review Workflow

## 1. 작업 시작

```text
read AGENTS.md
→ read HANDOFF.md and current phase
→ inspect git branch/status
→ create codex/<phase>-<topic> branch from master
→ write or update phase plan
```

- 기본 브랜치에서 파일을 수정하지 않는다.
- 작업 트리가 dirty하면 기존 변경의 소유권을 확인하고 자신의 파일만 선별한다.
- 단계별 브랜치를 재사용하지 않는다. 이미 PR이 종료된 브랜치는 새 작업에 사용하지 않는다.

## 2. 구현 순서

1. 문제를 재현하거나 golden fixture를 추가한다.
2. 실패하는 검증 결과를 기록한다.
3. 하나의 원인 또는 계약을 수정한다.
4. 좁은 테스트에서 전체 검증 순으로 실행한다.
5. `validation/YYYY-MM-DD-<phase>-<slug>.md`를 작성한다.
6. `HANDOFF.md`와 단계 상태를 갱신한다.

## 3. 커밋

- 관련 파일만 명시적으로 stage한다. `git add .`는 사용하지 않는다.
- 한 커밋은 하나의 결정 또는 검증 가능한 변화만 담는다.
- Lore Commit Protocol을 사용한다.

예시:

```text
Make animation data portable across conversion and playback

The Python converter and TypeScript player used incompatible note and
hand fields, so the boundary now uses one versioned contract.

Constraint: Existing stored animation files require a compatibility reader
Rejected: Cast remote JSON to PianoAnimationData | hides malformed data
Confidence: high
Scope-risk: moderate
Directive: Change the animation schema only through a versioned migration
Tested: Contract fixtures and parser unit tests
Not-tested: Full Audiveris output corpus
```

## 4. PR 생성

- PR base는 실제 기본 브랜치인 `master`를 사용한다.
- 초안 PR로 시작하고 검증 결과가 준비되면 ready 상태로 전환한다.
- PR 본문에는 목적, 범위, 제외 범위, 위험, 검증, baseline 차이, rollback 방법을 포함한다.
- PR 번호가 생기면 즉시 `reviews/PR-<number>.md`를 생성한다.

## 5. 리뷰·CI 반복

```text
fetch PR checks and unresolved comments
→ classify every item
→ reproduce actionable feedback
→ make smallest fix
→ run focused and required verification
→ update review log and handoff
→ commit and push
→ repeat until clean
```

리뷰 항목 상태:

- `OPEN`: 미검토
- `ACCEPTED`: 유효하며 수정 예정
- `FIXED`: 수정·검증·커밋 완료
- `REJECTED`: 적용하지 않으며 근거 기록
- `SUPERSEDED`: 후속 리뷰나 설계 변경으로 대체

다음 조건을 모두 만족할 때만 리뷰 루프가 끝난다.

- 필수 CI가 모두 성공하거나 저장소 기준선상 불가능한 이유와 후속 단계가 명시됨
- 해결되지 않은 actionable review가 없음
- 새 실패가 없음
- review log와 `HANDOFF.md`가 최신임

## 6. 병합 정책

- 코드 에이전트는 사용자의 명시적 지시 없이 병합하지 않는다.
- 병합 후에만 단계 상태를 `DONE`으로 바꾼다.
- 병합 직후 다음 단계는 최신 `master`에서 새 브랜치를 만든다.

## Current repository caveat

현재 GitHub Actions는 대부분 `main/develop`을 대상으로 하지만 실제 기본 브랜치는 `master`다. P0-D에서 정렬하기 전까지 PR 생성 시 workflow가 실행되지 않을 수 있으므로 수동 검증 결과를 반드시 남긴다.
