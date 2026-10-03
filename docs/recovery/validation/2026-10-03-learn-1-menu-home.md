# Validation — LEARN L-1 `배우기` 메뉴와 `/learn` 홈 (#210)

Date: 2026-10-03 KST
Branch/commit: `codex/learn-1-menu-home` / `06e741a` (계획 문서 `6159e30`)
Environment: macOS, production 빌드(`npm run build && npm start`), `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`,
Jest의 OMR 회귀는 기존 `local-test-data/results/issue134-chord-split-2026-09-19/ci-venv`.

## Claim being verified

비로그인 방문자가 메뉴의 `배우기`로 `/learn`에 도달한다. 메뉴 순서는 `배우기`·`탐색`·`내 악보`·`새 악보`다.
단계 지도는 아직 없는 레슨을 링크하지 않는다. `/learn`은 보호 경로가 아니다.

## Commands and results

구현은 Codex `gpt-6.1-sol`(Orca 터미널), 아래 "오케스트레이터" 행은 같은 트리에서 Claude가 다시 실행했다.

| Command | Result | Evidence |
|---|---|---|
| 구현 전 변경 영역 Jest (Codex) | FAIL (의도) | 메뉴 순서 테스트 4개 실패, 미구현 모듈로 3개 스위트 실패 |
| 구현 후 변경 영역 Jest (Codex) | PASS | 33 passed |
| `PATH=<ci-venv>/bin:$PATH npx jest` (오케스트레이터) | PASS | 131 suites, 1291 tests |
| `npx tsc --noEmit --incremental false` | PASS | exit 0 |
| `npm run lint` | PASS | No ESLint warnings or errors |
| `npx playwright test e2e/learn-home.spec.ts e2e/console-quiet.spec.ts e2e/application-smoke.spec.ts --project=chromium --project="Mobile Chrome"` | PASS | 28 passed |
| 문서 링크(phase·ROADMAP 표의 상대 링크) | PASS | 대상 파일 존재 확인 |

`learn-home.spec.ts`가 고정하는 것: 비로그인 `/learn` 200과 로그인 화면 미이동, h1 하나, 단계 4개·링크 0개·`준비 중` 4개,
데스크톱 메뉴 진입, Tab·Enter만으로 진입, 320px 모바일 메뉴 진입과 가로 넘침 없음.

## 로컬 리뷰 (Codex `gpt-6-astra` high, read-only, Orca 터미널)

대상 `main...06e741a`. 코드 결함 없음. `available` 16개 조합의 이전·다음 계산 64건을 리뷰어가 따로 실행해 통과.

| # | Finding | State | Handling |
|---|---|---|---|
| 1 | P2: L-1 검증 기록이 저장소에 없고 HANDOFF가 "구현 미착수"로 남음 | FIXED | 이 문서와 HANDOFF 갱신 |

## Baseline comparison

- New failures: 없음. Jest 수는 main 대비 테스트 추가분만큼 늘었다.

## Gaps and risks

- Firefox·WebKit·Mobile Safari E2E와 6개 브라우저 전체 E2E는 PR CI에 맡긴다(D-088).
- Codex 샌드박스는 포트를 열 수 없어 E2E를 실행하지 못했다. E2E 결과는 오케스트레이터 실행분뿐이다.
- 스크린리더 실기 확인 없음. 공통 레슨 레이아웃은 이 단계에 쓰는 페이지가 없어 단위 테스트로만 검증했다.
- 리뷰어는 샌드박스 때문에 GitHub 이슈를 직접 조회하지 못해 phase 문서와 D-094를 기준으로 삼았다.
