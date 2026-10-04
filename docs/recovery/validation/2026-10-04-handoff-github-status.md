# Validation — 핸드오프와 GitHub 잔여 이슈 대조

Date: 2026-10-04 18:39 KST
Baseline: main / origin/main `a4ce65f` (점검 시작 시 동일), working tree clean.

## 확인 범위와 결과

열린 GitHub 이슈 6개와 PR 1개는 HANDOFF의 목록과 일치한다. 이슈 종료·신규 등록·코드 변경·PR 병합은 수행하지 않았다.

| 이슈 | 현재 상태·남은 일 |
|---|---|
| [#229](https://github.com/landfill/ClairKeys/issues/229) 미사용 재생 컴포넌트 | PR231의 검증 완료 확인과 사용자 병합 승인 필요. CI·리뷰 상세는 [PR231 로그](../reviews/PR-231.md) |
| [#225](https://github.com/landfill/ClairKeys/issues/225) 용어 사전 | 미착수. 명시된 선행 없음, 착수 시 용어·진입 위치 범위 확정 |
| [#226](https://github.com/landfill/ClairKeys/issues/226) 연습 진도 | 미착수. 진도 정의·저장 위치·레슨 완료 판정에 사용자 결정 필요 |
| [#227](https://github.com/landfill/ClairKeys/issues/227) 첫 곡 코스 | 미착수. OMR을 거치지 않는 검증된 악보 입력 경로가 선행 |
| [#228](https://github.com/landfill/ClairKeys/issues/228) 박자·조표 | 미착수. 출처 계약 추가 또는 악보 아티팩트 공유 방식 결정 필요 |
| [#121](https://github.com/landfill/ClairKeys/issues/121) OMR 운영 관측 | OPEN. HANDOFF에 기록된 사용자 보류 유지; 재개 지시 전 착수하지 않음 |

#208과 #222는 GitHub에서도 CLOSED다. LEARN phase DONE 및 HANDOFF의 종료 기록과 일치한다.

## 열린 이슈 목록 밖에 남은 작업

- [P1-B](../phases/P1-B-durable-omr.md): NOT_STARTED. 영속 큐·재시작 복구 등은 구현된 것으로 간주하지 않는다.
- [P2-A](../phases/P2-A-architecture-cleanup.md): IN_PROGRESS. Next config 통합(stage 4)만 완료됐고 나머지 단계는 미착수다. HANDOFF의 Other tracks 표에는 없지만 ROADMAP과 phase에 남아 있다.
- [OMR-Q2](../phases/OMR-Q2-page-scale.md): IN_PROGRESS. HANDOFF가 명시한 정상 악보·fallback 검증 제약을 유지한다.
- 추가 미사용 코드, 데모 경고의 레인 가림 가능성, 운영 DB migration, 실기기 검증과 사용자 결정 항목 등은 [HANDOFF](../HANDOFF.md)의 후보·제약이 원본이다. 이번 대조로 새 이슈를 만들거나 착수를 결정하지 않았다.

## Commands and results

| Command / query | Result |
|---|---|
| `git fetch origin`; `git branch --show-current`; `git status --short`; `git rev-list --count main..origin/main` | PASS: main, clean, 뒤처진 커밋 0. 최초 sandbox fetch는 `.git/FETCH_HEAD` 쓰기 제한으로 실패하여 승인된 escalation으로 재실행 성공 |
| `gh issue list --repo landfill/ClairKeys --state open --limit 200 --json number,title,url,labels,assignees,updatedAt,body` | PASS: 6개. 최초 sandbox 네트워크 실패 뒤 escalation 조회 성공 |
| `gh pr list --repo landfill/ClairKeys --state open --limit 100 ...` | PASS: PR231 하나, head `36b4efa0c19d0d91e9c9a03663bbcc6fad0b09ac` |
| `gh pr view 231 ...`; `gh pr checks 231 ...`; GraphQL `reviewThreads`; issue reactions API | PASS: 최신 조회 결과를 [PR231 로그](../reviews/PR-231.md)에 기록 |
| GraphQL `issue(number:208)` / `issue(number:222)` | PASS: 두 이슈 모두 CLOSED |
| 편집한 Markdown의 상대 링크 파일 존재 확인; `git diff --check` | PASS |

## Gaps

시점 점검이며 이후 CI·리뷰 변경은 포함하지 않는다. 코드·설정 변경이 없어 Jest·tsc·lint·E2E는 재실행하지 않았다. preview·운영 화면·VM·운영 DB·실기기는 확인하지 않았다.
