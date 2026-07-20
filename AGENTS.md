# ClairKeys Agent Operating Contract

이 파일은 ClairKeys에서 작업하는 모든 코드 에이전트(세션·머신·에이전트 종류를 가리지 않는다)의 공통 진입점이다.

## 핵심 원칙 — 맥락은 저장소 안에만 남긴다

에이전트의 개인 메모리(예: Claude Code의 `~/.claude/.../memory/`)는 세션·머신·에이전트 종류가 달라지면 접근할 수 없다. 이 프로젝트에 관한 진행 상태·결정·다음 할 일·막힌 지점은 전부 저장소 안 파일(`docs/recovery/`)에 기록하고, 개인 메모리에는 의존하지 않는다. 하위 에이전트(subagent)를 띄운 경우에도 그 결과와 결정은 이 규약대로 `docs/recovery/`에 회수하며, 하위 에이전트의 개인 메모리에만 남기지 않는다.

새 세션은 코드 수정 전에 반드시 다음을 순서대로 수행한다.

0. **원격 동기화** — 문서를 읽기 전에 저장소부터 최신으로 만든다. `git fetch origin` 후 로컬 `main`이 `origin/main`보다 뒤처져 있으면(`git rev-list --count main..origin/main`이 0이 아니면) `git pull --ff-only`로 먼저 동기화한다. 다른 머신·다른 에이전트(클라우드 세션 포함)가 병합한 결과가 원격에만 있을 수 있다 — 낡은 클론에서 읽은 HANDOFF는 낡은 진실이고, 낡은 base에서 딴 브랜치는 불필요한 충돌을 만든다.
1. `docs/recovery/README.md`
2. `docs/recovery/HANDOFF.md`
3. 현재 작업 단계 문서
4. `docs/recovery/WORKFLOW.md`
5. `docs/recovery/BASELINE.md`
6. `docs/recovery/LORE_COMMIT_PROTOCOL.md`

## 절대 규칙

- `master` 또는 `main`에 직접 커밋하지 않는다.
- 모든 작업은 `codex/<phase>-<topic>` 형식의 별도 브랜치에서 수행한다.
- 기존 미커밋 변경은 사용자 소유로 간주하고 되돌리거나 함께 커밋하지 않는다.
- 한 PR에는 하나의 단계 또는 하나의 명확한 목적만 포함한다.
- PR은 생성 시점부터 리뷰 가능한 상태여야 한다. Draft PR은 생성하지 않으며, 실수로 Draft가 생성되면 즉시 ready for review로 전환한다.
- 동작 변경 전 회귀 테스트 또는 재현 fixture를 먼저 추가한다.
- 구현 완료 주장은 검증 명령과 결과가 기록된 경우에만 한다.
- 구현이 스펙·phase 문서와 달라야 할 이유가 생기면 코드부터 고치지 않는다. 관련 phase 문서와 `docs/recovery/DECISIONS.md`를 먼저 갱신해 이유를 기록한 뒤 구현한다. 임의 이탈은 다음 세션에게 "문서와 코드 중 뭐가 맞나"라는 혼란을 남긴다.
- 커밋은 `docs/recovery/LORE_COMMIT_PROTOCOL.md`에 정의된 Lore Commit Protocol을 따른다. 커밋 메시지에 에이전트 서명이나 세션 트레일러(`Co-Authored-By:`, `Claude-Session:` 등)를 넣지 않는다 — Lore 형식이 정의한 trailer key만 사용한다.
- PR 생성 후 CI와 리뷰 피드백을 확인하고, 수정·검증·커밋·푸시를 반복한다.
- `main` 병합은 대상 PR에 대한 사용자의 명시적 승인 후에만 수행한다. 리뷰 준비 완료, 승인 리뷰, 초록 CI 또는 과거의 포괄적 지시는 병합 승인으로 간주하지 않는다.
- 병합 승인을 받으면 현재 CI와 리뷰 상태를 다시 확인하고 PR을 병합한 뒤, `main` 반영을 검증하고 원격·로컬 작업 브랜치를 정리한다.
- 정규 HANDOFF와 검증·리뷰 기록은 모두 이 프로젝트 경로 안에 저장한다. 채팅, `/tmp`, 홈 디렉터리, 에이전트 개인 메모리 또는 외부 노트만으로 인계를 대신하지 않는다.
- HANDOFF와 검증 기록은 세션 종료를 기다리지 않고, 작업 단위(커밋·PR·이슈 처리 등)가 끝날 때마다 즉시 갱신한다. 기록하는 날짜는 항상 실제 절대 날짜(YYYY-MM-DD)로 쓰고, "어제"·"다음에" 같은 상대 표현은 쓰지 않는다 — 다음 세션이 오독한다.

## 단계별 전달·병합 수명주기

각 작업 단계는 아래 순서를 끝까지 따른다.

1. 최신 `main`에서 `codex/<phase>-<topic>` 작업 브랜치를 만든다.
2. 회귀 근거와 검증 기록을 먼저 준비하고, 하나의 결정 단위로 Lore 커밋한다.
3. 단계 범위가 검증되면 Draft가 아닌 review-ready PR을 생성한다.
4. PR 번호를 `docs/recovery/HANDOFF.md`와 `docs/recovery/reviews/PR-<number>.md`에 기록하고, CI·리뷰 수정마다 프로젝트 내부 기록을 갱신한다.
5. 모든 필수 체크와 actionable review를 처리한 뒤에도 사용자의 명시적 병합 승인을 기다린다.
6. 승인을 받으면 PR을 병합하고 `main`의 반영 커밋·체크를 확인한다.
7. 원격 ref를 fetch한 뒤 최신 `main`에 로컬·원격 작업 브랜치 tip이 모두 포함됐는지 확인한다. 사용자 소유 미커밋 변경이나 어느 tip에든 고유 커밋이 있으면 어떤 브랜치도 삭제하지 않고 HANDOFF에 blocker로 기록한다. 두 tip이 모두 병합된 경우에만 원격 작업 브랜치를 삭제하고, 로컬에서 `main`으로 이동한 뒤 로컬 작업 브랜치도 삭제한다.
8. 병합 결과와 다음 단계를 프로젝트 내부 HANDOFF·phase·validation·review 기록에 남긴 뒤 다음 단계용 새 브랜치를 만든다.

HANDOFF의 canonical entrypoint는 `docs/recovery/HANDOFF.md`다. 세부 근거는 `docs/recovery/phases/`, `docs/recovery/validation/`, `docs/recovery/reviews/`, `docs/recovery/DECISIONS.md`에 둔다. PR이 병합되면 stale해질 `OPEN`, `READY_FOR_REVIEW`, 작업 브랜치 같은 transient 상태는 durable HANDOFF에 고정하지 않고 PR review log와 GitHub live state로 확인한다.

## 세션 시작 체크리스트

1. `git fetch origin` 후 로컬 `main`이 뒤처져 있으면 `git pull --ff-only`로 동기화한다.
2. `git branch --show-current`와 `git status --short`를 확인한다.
3. 기본 브랜치라면 코드를 수정하기 전에 작업 브랜치를 만든다.
4. `docs/recovery/HANDOFF.md`에서 `Current phase`, `Next action`, `Known blockers`를 확인한다.
5. 현재 단계 문서의 진입 조건과 완료 조건을 확인한다.
6. 작업 계획을 세우고 범위를 벗어나는 문제는 새 단계 후보로 기록한다.

## 세션 종료 체크리스트

1. 단계별 필수 검증을 실행한다.
2. 결과를 `docs/recovery/validation/`에 기록한다.
3. `docs/recovery/HANDOFF.md`를 실제 현재 상태로 갱신한다.
4. 결정이 바뀌었다면 `docs/recovery/DECISIONS.md`에 추가한다.
5. 관련 파일만 선별해 커밋한다.
6. PR이 있다면 `docs/recovery/reviews/PR-<number>.md`를 갱신한다.
7. PR은 Draft가 아닌 review-ready 상태인지 확인한다.
8. 병합을 수행했다면 `main` 반영과 원격·로컬 작업 브랜치 정리를 확인한다.
9. HANDOFF와 모든 인계 근거가 프로젝트 경로 안에 존재하는지 확인한다.

## 금지되는 완료 상태

- 빌드가 타입 검사 또는 린트를 생략했는데 전체 검증 성공으로 기록하는 것
- 테스트 실패를 설명 없이 기존 실패로 간주하는 것
- 인메모리 큐를 영속 큐로 표현하는 것
- 데모 멜로디 생성을 실제 악보 변환으로 표현하는 것
- 리뷰 코멘트나 실패한 CI가 남은 상태를 완료로 표시하는 것
