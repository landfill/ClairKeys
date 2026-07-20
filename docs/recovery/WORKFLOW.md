# Branch, Validation, PR, and Review Workflow

## 1. 작업 시작

DOC-1은 `main` 생성 전 기본 브랜치 rename을 준비하므로 `master`에서 분기하고 PR base도 `master`를 사용하는 일회성 예외다. 아래 일반 규칙은 DOC-1 병합과 GitHub branch rename이 완료된 뒤 적용한다.

```text
read AGENTS.md
→ read docs/recovery/README.md
→ read docs/recovery/HANDOFF.md
→ read the current phase document named by HANDOFF.md
→ read docs/recovery/WORKFLOW.md
→ read docs/recovery/BASELINE.md
→ read docs/recovery/LORE_COMMIT_PROTOCOL.md
→ inspect git branch/status
→ create codex/<phase>-<topic> branch from main
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
5. `docs/recovery/validation/YYYY-MM-DD-<phase>-<slug>.md`를 작성한다.
6. `docs/recovery/HANDOFF.md`와 단계 상태를 갱신한다.
7. 단계 완료 시점의 다음 행동과 blocker가 프로젝트 내부 HANDOFF에 남아 있는지 확인한다.

## 3. 커밋

- 관련 파일만 명시적으로 stage한다. `git add .`는 사용하지 않는다.
- 한 커밋은 하나의 결정 또는 검증 가능한 변화만 담는다.
- [`docs/recovery/LORE_COMMIT_PROTOCOL.md`](LORE_COMMIT_PROTOCOL.md)에 정의된 형식과 필수 trailer를 사용한다.

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

- PR base는 실제 기본 브랜치인 `main`을 사용한다.
- DOC-1 migration PR만 rename 전 실제 기본 브랜치인 `master`를 base로 사용한다.
- PR은 처음부터 review-ready 상태로 생성한다. Draft PR은 사용하지 않으며, 실수로 Draft가 생성되면 즉시 ready for review로 전환한다.
- PR 본문에는 목적, 범위, 제외 범위, 위험, 검증, baseline 차이, rollback 방법을 포함한다.
- PR 번호가 생기면 즉시 `docs/recovery/reviews/PR-<number>.md`를 생성한다.

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
- review log와 `docs/recovery/HANDOFF.md`가 최신임

## 6. 병합 정책

- 코드 에이전트는 대상 PR에 대한 사용자의 명시적 승인 없이 `main`에 병합하지 않는다. PR 생성, ready 전환, 초록 CI, 승인 리뷰 또는 이전 단계의 일반 지시는 병합 승인으로 해석하지 않는다.
- 병합 승인 후에도 현재 head의 필수 CI, unresolved actionable review, mergeability를 다시 확인한 뒤 병합한다.
- 병합 후에만 단계 상태를 `DONE`으로 바꾼다. 단, 마감 PR이 상태 변경 자체를 운반할 때는 `DONE`을 병합 예정 상태로 기록하고 해당 표시는 `main` 병합 순간에만 효력이 생긴다.
- 마감 PR이 열려 있는 동안에는 `DONE` 예정 표시만으로 의존 단계 브랜치를 시작하지 않는다.
- 병합 직후 원격 `main`에 병합 커밋이 반영됐는지 확인하고 최신 `main`으로 이동한다.
- 삭제 전에 원격 ref를 fetch하고 최신 `main`에 로컬 작업 브랜치 tip과 원격 작업 브랜치 tip이 모두 포함됐는지 확인한다. 어느 한쪽에라도 고유 커밋이 있거나 사용자 소유 미커밋 변경이 있으면 원격·로컬 브랜치를 모두 보존하고 프로젝트 HANDOFF에 blocker로 기록한다.
- 두 tip이 모두 병합된 경우에만 원격 작업 브랜치를 삭제한 뒤 로컬 작업 브랜치도 삭제한다.
- 병합 결과와 다음 행동은 프로젝트 내부 HANDOFF·phase·validation·review 기록에 반영한다. 병합 이후에만 확정 가능한 SHA나 상태는 다음 단계 또는 전용 handoff-sync 브랜치의 첫 커밋으로 기록한다.
- 다음 단계는 최신 `main`에서 새 `codex/<phase>-<topic>` 브랜치를 만든다.

## 7. HANDOFF 저장 위치

- canonical HANDOFF는 `docs/recovery/HANDOFF.md`다.
- 단계 범위와 완료 조건은 `docs/recovery/phases/`, 실행 증거는 `docs/recovery/validation/`, PR 피드백은 `docs/recovery/reviews/`, 변경된 결정은 `docs/recovery/DECISIONS.md`에 저장한다.
- 채팅 메시지, `/tmp`, 홈 디렉터리, 외부 메모 또는 도구 내부 상태는 보조 정보일 뿐이며 단독 인계 수단이 될 수 없다.
- 각 단계의 커밋, PR, 리뷰 수정, 병합, 브랜치 정리 결과는 다음 세션이 프로젝트 파일만 읽고 복원할 수 있도록 기록한다.
- durable HANDOFF에는 병합 순간 stale해지는 PR `OPEN`/ready 상태나 현재 작업 브랜치를 고정하지 않는다. transient 상태는 `reviews/PR-<number>.md`와 GitHub live state에서 확인한다.

## Default branch invariant

DOC-1 완료 후 GitHub default branch, `origin/HEAD`, 로컬 추적 브랜치와 신규 PR base는 모두 `main`이어야 한다. 과거 clone은 GitHub 안내에 따라 로컬 브랜치 이름과 upstream을 갱신하고, Actions·배포·ruleset에서 남은 `master` 참조가 없는지 확인한다.
