# FEAT — 연습 기록

Status: `IN_PROGRESS` — branch `codex/feat-practice-records`.
Base: 2026-09-27 main `5645b60`.

## Objective

`PracticeSession` 테이블(001_init)은 운영 DB에 있지만 쓰는 코드가 없다. 로그인한 사용자의 연습 한 번을
기록하고 악보 페이지에 그 곡의 내 기록(횟수·총 시간·최고 진행률·마지막 날짜)을 보여준다.

## 선행 결함

`PracticeSession.sheetMusicId` FK는 `ON DELETE RESTRICT`인데 악보 삭제 route는 "cascade가 처리한다"는
주석과 함께 악보만 지운다. 기록이 쓰이기 시작하면 그 악보는 삭제할 수 없게 되고, 공개 악보는 다른 사용자의
기록 때문에 소유자도 삭제하지 못한다. 기록을 쓰기 전에 삭제를 한 트랜잭션으로 고친다. 스키마 migration은
운영 DB 작업이 필요하므로 사용하지 않는다.

## Work stages

1. 삭제 트랜잭션·연습 API·보고 훅·요약 문구 테스트를 먼저 실패시킨다.
2. 악보 삭제: `practiceSession.deleteMany({ sheetMusicId })` → `sheetMusic.delete`를 한 트랜잭션에서 실행한다.
3. `POST/GET /api/sheet/[id]/practice`: 로그인 필수, 재생할 수 있는 악보만(남의 비공개는 404), 1초~6시간·0~100%
   검증, 본인 기록만 집계, `no-store`.
4. `usePracticeReport`: 소리가 난 실제 시간(일시정지 제외)과 도달한 가장 먼 위치를 재고, 연습 종료·페이지 숨김 때
   10초 이상이면 보고한다. 숨김 보고 뒤에는 카운터를 다시 시작해 중복 집계하지 않는다.
5. 악보 페이지: 로그인 시 `keepalive` POST와 기록 요약, 비로그인 시 로그인하면 기록이 남는다는 안내.
   존재하지 않는 "짧은 미리보기" 제한 문구를 사실대로 바꾼다.

## Completion criteria

- 기록이 있는 악보도 소유자가 삭제할 수 있다(모든 사용자의 해당 악보 기록이 함께 삭제됨).
- 비로그인 사용자는 측정·요청하지 않는다. 로그인 사용자의 기록 실패는 연습을 방해하지 않는다.
- 관련 unit/E2E·타입·lint·build 통과, non-draft PR과 CI·리뷰 처리. 사용자 승인 전 병합하지 않는다.

## Out of scope

FK를 `CASCADE`로 바꾸는 migration(운영 DB 작업), 사용자 탈퇴 시 기록 처리, 전체 연습 통계 페이지,
탐색의 인기 순위(D-080이 실제 신호가 생기면 다시 결정하기로 함), 사용하지 않는 `SheetMusicRepository` 삭제 경로(P2-A).
