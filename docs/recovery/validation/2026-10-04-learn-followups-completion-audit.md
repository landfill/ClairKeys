# Completion audit — #225·#226·#227·#228

Started: 2026-10-04 KST
Last checked: 2026-10-05 KST
Audited app merge: `07ff563717be7d6d926e60e4c9f04eefa63239c6`
Completed: 2026-10-05 KST
Overall: PASS — 네 이슈의 요구사항·승인 병합·Post-merge·종료·정리 근거를 확인했다. 이 마감 기록 push와 원격 동기화를 확인한 뒤 goal 도구를 complete로 전환한다.

## 요구사항과 근거

| 요구사항 | 판정 | 현재 근거 |
|---|---|---|
| #225 실제 레슨 용어·짧은 정의·해당 절 링크 | PASS | `src/lib/learn/glossary.ts`, `/learn/glossary`, [검증](2026-10-04-issue-225-glossary.md). 25항목·4분류, 새 마디/세로줄 정의의 Alfred 원문 대조 |
| #225 공개 접근·홈/레슨 진입·320px·모든 링크 | PASS | `e2e/learn-glossary.spec.ts`, PR232 CI 및 preview 근거 |
| #226 사용자 범위 결정 | PASS | 사용자 "1. 권장안". [범위 조사](2026-10-04-issue-226-discovery.md), D-098. 로그인 사용자의 기존 곡별 기록만, 비로그인 저장·레슨 완료 없음 |
| #226 기존 모델 재사용·로그인 보호·사용자 분리 | PASS | `src/app/api/practice/route.ts`, `src/lib/routeAccess.ts`, `PracticeHistory.tsx`. schema/migration 변경 없음 |
| #226 기록 집계·목록·빈 상태·실패·페이지 이동 | PASS | [검증](2026-10-04-issue-226-practice-history.md), API/UI 회귀와 `e2e/practice-history.spec.ts`. 최고 %를 재생 위치로 설명 |
| #226 추가 리뷰 대응 | PASS | DB 최대 기록 ID 상한, keyset cursor, 현재 접근권한 재검사. [PR235 리뷰](../reviews/PR-235.md)의 FIXED·REJECTED 근거와 개별 thread resolve |
| #226 운영 읽기·비로그인 차단 | PASS | 기존 로그인 세션의 실제 첫 페이지와 이전 곡별 요약 대조, unauth API 401/no-store. 개인 식별 정보는 보관하지 않음 |
| #227 OMR 없는 입력 경로·선택 이유 | PASS | D-096, `scripts/build-learn-course.py`, 기존 converter 직접 호출. 런타임 VM/DB/OMR 의존 없음 |
| #227 원본·권리·정확성 | PASS | 직접 작성한 MusicXML 3곡과 정적 animation/score JSON. [원본 대조 검증](2026-10-04-issue-227-first-course.md)의 음높이·시작·길이·손·운지 및 결정적 재생성 검사 |
| #227 레슨→코스→재생·원본 악보·다음 곡 | PASS | `e2e/learn-course.spec.ts`, 실제 preview 재생·악보 표시, 모바일 배치 |
| #227 오디오 시작 실패 복구 | PASS | 영구 pending resume의 수정 전 실패, 4초 상한·늦은 완료·재시도 회귀. Firefox 장치 미기동은 실제 재생 성공으로 표현하지 않음 |
| #228 검증된 박자·조표만 표시 | PASS | D-097, `scoreProvenance.ts`, `useScoreProvenance.ts`, 실제 score artifact 공유. 기본값·복합/변경/모호한 값 생략, 장·단조 추정 없음 |
| #228 저장된 1.0·1.1 호환·출처 유/무 | PASS | `e2e/song-provenance.spec.ts`, [검증](2026-10-04-issue-228-score-provenance.md), 정규화 계약 변경 없음 |
| #228 내장곡과 사용자 악보 연결 | PASS | CoursePlayer의 scoreUrl 전달, 세 실제 내장곡 component/E2E, 공개 사용자 악보 preview |
| 재생 화면 요소 수·기존 토큰·접근 규칙 | PASS | 기본 UI 요소 수 전후 동일, production CI 요소 수 spec 통과. 기존 status 줄에서 실패 안내, 추가 설명은 player 루트 밖 |
| 비공개 악보 보호 | PASS | 기존 owner/공개 규칙 유지. 운영 score GET 404 및 metadata GET 403 확인(서로 다른 기존 계약) |
| 회귀 우선·필수 로컬 검증·CI | PASS | 각 validation의 수정 전 실패·최종 Jest/tsc/lint·관련 E2E. 각 최종 PR의 전체 CI 통과, CI 통과 트리 로컬 중복 재검증 없음 |
| 대상별 명시적 병합 승인 | PASS | [PR232](../reviews/PR-232.md), [PR233](../reviews/PR-233.md), [PR234](../reviews/PR-234.md), [PR235](../reviews/PR-235.md)에 승인·고정 head·merge SHA 기록 |
| 이슈 종료·PR 병합 | PASS | GitHub live: #225·226·227·228 CLOSED, PR232·233·234·235 MERGED. 열린 PR 0개 |
| 브랜치 안전 정리 | PASS | 각 병합 뒤 tip 포함·clean 확인. 마지막 `ls-remote`와 `for-each-ref`에서 네 작업 ref가 모두 없음 |
| #121 제외 | PASS | #121 OPEN, updatedAt `2026-09-20T00:46:03Z`로 점검 시작과 같음. 목표 시작 `9f1e052` 이후 omr-service와 CI workflow 변경 없음 |
| 최종 main 앱 코드 | PASS | `git diff e5f77ac..HEAD -- src prisma public e2e scripts package*.json next.config.mjs` 차이 없음. 추가 main 커밋은 상태 문서 |
| 마지막 병합 후 검사 | PASS | [run 37210345935](https://github.com/landfill/ClairKeys/actions/runs/37210345935) 전부 PASS. E2E 747 passed/67 skipped/재시도 0. 상세는 [PR235](../reviews/PR-235.md) |
| 최종 phase·HANDOFF 상태 | PASS | 관련 phase DONE, HANDOFF에 완료와 근거 링크 반영. goal 상태 전환은 이 기록의 push 확인 뒤 수행 |

## 한계와 범위 밖

- 실기기 터치/회전·실제 MIDI·청취·스크린리더 및 운영 DB 부하 검증은 하지 않았다. 사용자 지시대로 청취는 완료 조건이 아니다.
- 운영 첫 페이지 읽기는 검증했으나 운영 계정 다중 페이지와 새 기록 쓰기는 검증하지 않았다. 해당 분기는 API 단위/E2E fixture로 확인했다.
- PR235 CI의 기존 내 악보 계측 flaky 1건은 [리뷰 로그](../reviews/PR-235.md)의 후속 후보다. CI는 최종 통과했고 해당 실패는 신규 기록 페이지에서 발생하지 않았다.
- #121, 영속 OMR 큐, 기존 공개 animation URL 제약 및 별도 운영 DB migration은 이 goal의 완료 범위가 아니다.
