# Validation — #226 내 연습 기록

Date: 2026-10-04 KST
Branch/head: `codex/issue-226-practice-history` / `f3f5487`
Baseline: `7459d2e` (PR232 병합 후 main).
Scope decision: 사용자 "1. 권장안", 로그인 사용자의 기존 곡별 연습 기록만. [조사](2026-10-04-issue-226-discovery.md).

## Verified behavior

`/practice`는 로그인 전용이며 배우기 홈에서 진입한다. `/learn` 공개 접근은 유지한다.
`/api/practice`는 세션의 사용자만 집계하고 현재 접근 가능한 악보만 제목 조회와 집계 양쪽에서 필터링한다.
최근 연습순(동률은 sheet ID) 20곡 단위 페이지, 횟수·총 재생 시간·최고 재생 위치·최근 연습일·곡 링크를 표시한다.
페이지/계정 전환 시 이전 요청을 abort하고 계정 key로 화면을 초기화한다. 빈 기록과 요청 실패를 구분하며 재시도할 수 있다.
DB schema·migration·쓰기 경로·재생 화면은 변경하지 않았다. 레슨 완료 판정과 비로그인 저장은 없다.

## Commands and results

| 명령/확인 | 결과 |
|---|---|
| 신규 API·UI 테스트(구현 전) | FAIL 의도: 신규 route/component 모듈 없음 |
| API·PracticeHistory·routeAccess 대상 Jest | PASS: 3 suites, 30 tests |
| `PYTHON_BIN=<기존 ci-venv>/bin/python3 npx jest --runInBand` | PASS: 157 suites, 1550 tests (Python 3.12) |
| `npx tsc --noEmit --incremental false`; `npm run lint` | PASS exit 0; lint 경고/오류 없음 |
| 최초 기본 Playwright 설정 실행 | 테스트 시작 전 FAIL: 브랜치 전환 중 남아 있던 dev 서버가 500을 반환했고 자동 webServer가 production build 후 같은 포트에 start를 시도해 EADDRINUSE. 코드 실패로 분류하지 않음. 자동 로컬 build는 불필요했으며 이후 막음 |
| dev 서버 종료·생성된 `.next` 정리 후 재시작, 로컬 전용 설정 | 서버 정상. 자동 build 대신 dev 서버를 쓰는 설정(아래)을 사용 |
| history·learn-home × Chromium/Firefox/Mobile Chrome | 최초 21 PASS/3 FAIL. 개발 모드 effect의 중복 요청 때문에 '첫 요청만 실패' fixture가 자동으로 성공해 오류 화면을 검증하지 못함. 지속 장애→재시도 직전 복구 fixture로 수정 |
| `npx playwright test --config=local-test-data/results/goal/playwright.config.ts e2e/practice-history.spec.ts --project=chromium --project=firefox --project='Mobile Chrome' --workers=2 --reporter=line` | PASS: 12 tests, 10.5초. 기존 지도 spec 12건은 앞선 실행에서 PASS |
| 화면 확인 | 320×800과 1280×800에서 기록·페이지 조작·여백·가로 넘침 확인. E2E는 로그인 fixture와 API 응답 fixture 사용 |
| `git diff --check`, phase 상대 링크 검사 | PASS |

로컬 전용 Playwright 설정(저장소 코드 변경 아님): 기존 config를 가져와 `testDir`을 e2e 절대/상대 경로로 맞추고
`webServer`를 `{ command: 'npm run dev', cwd: process.cwd(), url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120000 }`로 덮어쓴다.
서버는 `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 npm run dev`로 시작한다. 브랜치 전환 전 해당 서버를 종료한다.

## Gaps

운영 계정의 실제 기록·운영 DB 성능·실제 로그인 제공자 흐름·실기기·스크린리더 낭독 미검증.
API DB 집계는 Prisma mock 계약 테스트이며 실제 DB 쓰기를 수행하지 않았다. 브라우저에서는 실제 비로그인 API 401과 middleware 리디렉션을 확인했다.
전체 브라우저 매트릭스와 최종 production build는 PR CI에 맡긴다. preview는 PR 생성 후 확인한다.

## PR235 P2 수정 — `5425f79`

리뷰가 지적한 offset의 중복/누락 위험을 수용했다. 첫 조회의 asOf 이전 PracticeSession만 집계하고 마지막 MAX(createdAt)·sheet ID보다
뒤에 있는 그룹을 HAVING 조건으로 읽는다. 페이지 사이에 새 세션이 생겨도 기존 조회 순서를 바꾸지 않는다. 현재 악보 접근권한은 계속 검사한다.
응답은 현재 cursor와 nextCursor를 반환하며 이전 페이지도 같은 asOf cursor로 돌아간다. 새 기록은 새로고침 시 반영한다고 화면에 설명한다.

- 수정 전 cursor 회귀: 8 FAIL/3 PASS(기준 시각·cursor·입력 검증이 없고 offset을 사용함).
- 수정 후 API/UI 대상: 14 PASS. 잘못된 cursor, 다음/이전 snapshot 유지, aggregate timestamp/ID 경계, offset 미사용 검증.
- 전체 Jest: 157 suites / 1550 tests PASS.
- tsc: 최초 브랜치 전환 후 남은 `.next/types`의 course 경로 참조로 FAIL. 생성물을 정리한 현재 브랜치에서 재실행 PASS. 소스 타입 오류는 없었다.
- lint PASS. history E2E 12 PASS(11.4초), 실제 요청 cursor 흐름 `없음 → second → first` 단언 추가. 320px/데스크톱 screenshot 유지.
- `git diff --check` PASS.

DB를 mock한 단위 테스트와 API fixture E2E라는 한계는 유지된다. 운영 DB 성능 검증은 하지 않았다.
리뷰 회신·resolve와 새 CI 상태는 [PR235 로그](../reviews/PR-235.md)가 원본이다.
