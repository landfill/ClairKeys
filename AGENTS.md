# ClairKeys Agent Operating Contract

모든 세션·머신·에이전트의 공통 규약이다. 핵심 규칙과 커밋 분류는 이 파일,
실행 절차는 [WORKFLOW](docs/recovery/WORKFLOW.md), 커밋 형식은 [Lore](docs/recovery/LORE_COMMIT_PROTOCOL.md)가 기준이다.

## 세션 시작

1. 문서를 읽기 전에 `git fetch origin`을 실행하고 `git branch --show-current`, `git status --short`를 확인한다.
2. `git rev-list --count main..origin/main`이 0이 아니면 로컬 `main`을 fast-forward한다.
   현재 `main`이면 `git pull --ff-only`, 다른 브랜치이면 `git fetch origin main:main`을 사용한다.
   충돌·분기·사용자 변경 때문에 안전하게 동기화할 수 없으면 덮어쓰지 말고 blocker를 기록한다.
3. 다음 순서로 읽는다:
   [README](docs/recovery/README.md) → [HANDOFF](docs/recovery/HANDOFF.md) → HANDOFF의 현재 phase →
   [WORKFLOW](docs/recovery/WORKFLOW.md) → [BASELINE](docs/recovery/BASELINE.md) → [Lore](docs/recovery/LORE_COMMIT_PROTOCOL.md).
4. HANDOFF의 `Current phase`, `Next action`, `Known blockers`와 phase의 진입·완료 조건으로 범위를 정한다.
   사용자 요청이 다른 작업이면 해당 범위를 우선하고, 범위 밖 문제는 후속 단계 후보로 기록한다.
5. 코드·규약·계획 변경은 최신 `main`에서 `codex/<phase>-<topic>` 브랜치를 만든 뒤 시작한다.
   종료된 PR 브랜치는 재사용하지 않는다. 상태 기록은 아래 직접 커밋 예외를 따른다.

## 변경·검증·승인

- 기존 미커밋 변경은 사용자 소유다. 되돌리거나 자신의 커밋에 섞지 않는다.
- 한 PR에는 하나의 단계 또는 명확한 목적만 담는다. 관련 파일만 명시적으로 stage한다.
- 동작 변경 전에 회귀 테스트 또는 재현 fixture를 추가한다. 관련 필수 검증의 명령·결과·한계를 기록해야 구현 완료를 주장할 수 있다.
- 스펙·phase와 달라야 한다면 관련 phase와 `docs/recovery/DECISIONS.md`에 이유를 먼저 기록한 뒤 구현한다.
- 모든 커밋은 Lore 형식을 따른다. Lore에 정의된 trailer key만 허용하며 `Co-Authored-By:`·`Claude-Session:` 등 에이전트 서명을 넣지 않는다.
- PR은 생성부터 review-ready여야 한다. Draft로 생성했다면 즉시 ready로 전환한다.
- PR 생성 후 CI와 리뷰를 확인하고 actionable feedback의 수정·검증·커밋·푸시를 반복한다.
- **main 병합은 대상 PR에 대한 사용자의 명시적 승인 후에만 한다.** 초록 CI·승인 리뷰·리뷰 준비·과거 포괄적 지시는 병합 승인이 아니다.
- 승인 후에도 현재 head의 CI·리뷰·병합 가능 상태를 다시 확인하고, 병합 후 main 반영을 검증한다.
- 브랜치 삭제 전 원격 ref를 fetch하고 로컬·원격 tip 모두 최신 main에 포함됐는지 확인한다.
  사용자 미커밋 변경 또는 어느 tip의 고유 커밋이라도 있으면 둘 다 보존하고 HANDOFF에 blocker를 기록한다.
  모두 포함된 경우에만 원격 브랜치 삭제 → 로컬 main 이동 → 로컬 브랜치 삭제 순서로 정리한다.

## 커밋 대상 분류

기본 브랜치 `main`/`master`에 직접 커밋하지 않는다. 아래 **상태 기록만** PR·리뷰·병합 승인 없이 main에 즉시 커밋·푸시한다.
분류는 파일명뿐 아니라 변경 내용으로 판단하며, 혼합 변경은 분리한다.

| main 직접 커밋: 사실·상태 기록 | 작업 브랜치와 PR: 판단·동작 변경 |
|---|---|
| `docs/recovery/HANDOFF.md` 현재 상태 | 애플리케이션 코드 |
| `docs/recovery/phases/*.md`의 Status·Progress | phase의 Objective·Work stages·Completion criteria 등 계획 |
| `docs/recovery/validation/*.md` 검증 기록 | `AGENTS.md`, `WORKFLOW.md`, `LORE_COMMIT_PROTOCOL.md`, `BASELINE.md`, `README.md` 등 규약 |
| `docs/recovery/reviews/*.md` PR 리뷰 기록 | `docs/recovery/DECISIONS.md` 신규 결정: 관련 변경과 같은 PR |
| `docs/recovery/ROADMAP.md` 상태 칼럼 | ROADMAP 단계 구성·선행조건, 기타 상태 기록이 아닌 문서 |

직접 커밋도 매번 원격 동기화 → 해당 파일만 stage·검토 → Lore 커밋 → main push 순서로 수행한다.
명령·SHA·결과를 스스로 재확인한다. 직접 push는 required checks를 우회할 수 있으므로 직후
`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`로 확인하고, 실패는 즉시 다음 상태 기록 커밋에 남긴다.
작업 브랜치와 상태 기록을 분리하는 상세 절차는 [WORKFLOW](docs/recovery/WORKFLOW.md)를 따른다.

## 인계와 완료

- 진행·결정·다음 행동·blocker와 하위 에이전트 결과는 모두 저장소 `docs/recovery/`에 회수한다.
  개인 메모리·채팅·임시 경로·외부 노트만으로 인계하지 않는다.
- 커밋·PR 생성·리뷰 수정·병합·이슈 처리 등 작업 단위가 끝나면 즉시 상태 기록을 갱신한다.
  세션 종료까지 미루지 않고 날짜는 `YYYY-MM-DD`로 쓴다.
- HANDOFF는 **현재 상태·다음 행동·제약·근거 링크**를 갱신한다. 과거 세션 본문을 계속 덧붙이지 않는다.
  상세 범위는 phase, 검증은 validation, 리뷰는 reviews, 결정은 DECISIONS에 둔다.
- 병합 후 낡을 PR OPEN·READY_FOR_REVIEW·작업 브랜치 상태는 HANDOFF에 고정하지 않는다.
  해당 리뷰 로그와 GitHub live state로 확인한다. 세션 종료 전 모든 근거가 저장소에 있는지 확인한다.
- 타입 검사·린트를 생략한 빌드를 전체 검증 성공으로, 설명 없는 테스트 실패를 기존 실패로 기록하지 않는다.
- 인메모리 큐를 영속 큐로, 데모 멜로디 생성을 실제 악보 변환으로 표현하지 않는다.
- 미해결 actionable review·실패 CI가 남은 작업을 완료로 표시하지 않는다.

## 필요할 때 읽을 문서

- [프로젝트 구조·환경·DB 명령](docs/recovery/PROJECT_REFERENCE.md)
- [로드맵](docs/recovery/ROADMAP.md) · [기술 결정](docs/recovery/DECISIONS.md)
