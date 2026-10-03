# Validation — LEARN L-2 건반 익히기 `/learn/keyboard` (#211)

Date: 2026-10-04 KST
Branch/commits: `codex/learn-2-keyboard` / `2cc4734`(구현), `HEAD`(리뷰 수정)
Environment: macOS, production 빌드(`npm run build && npm start`), `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`,
Jest의 OMR 회귀는 `local-test-data/results/issue134-chord-split-2026-09-19/ci-venv`.

## Claim being verified

건반을 마우스·터치·키보드·MIDI로 누르면 계이름이 표시되고 소리가 난다. 가운데 도(C4, MIDI 60)가 표시되고 좁은 화면에서도 처음부터 보인다.
도 찾기 연습이 맞음/다시를 판정한다. 소리가 안 나거나 샘플 요청이 모두 실패해도 표시와 판정은 동작한다. 재생 화면은 달라지지 않는다.

## Commands and results

구현은 Codex `gpt-6.1-sol`(Orca 터미널). E2E와 "오케스트레이터" 행은 Claude가 실행했다(Codex 샌드박스는 포트를 열 수 없다).

| Command | Result | Evidence |
|---|---|---|
| 구현 전 학습 Jest (Codex) | FAIL (의도) | 신규 모듈 부재로 3개 스위트, 공개 플래그 테스트 2개 실패 |
| 범위·직전 제외 수정 전 Jest (Codex) | FAIL (의도) | 회귀 테스트 5개 실패 |
| 하이드레이션 수정 전 Jest (Codex) | FAIL (의도) | 실제 MIDI 훅 SSR→hydrate에서 `Hydration failed` 재현 |
| 하이드레이션 E2E, 수정 전 컴포넌트(`git stash`) (오케스트레이터) | FAIL (의도) | chromium 1 failed / 5 passed |
| `PATH=<ci-venv>/bin:$PATH npx jest` (오케스트레이터, 최종) | PASS | 135 suites, 1406 tests |
| `npx tsc --noEmit --incremental false`, `npm run lint` | PASS | exit 0, no warnings |
| `npx playwright test e2e/learn-keyboard.spec.ts e2e/learn-home.spec.ts e2e/console-quiet.spec.ts e2e/application-smoke.spec.ts e2e/playback-controls-responsive.spec.ts e2e/hand-practice.spec.ts --project=chromium --project="Mobile Chrome"` (최종) | PASS | 46 passed |

`learn-keyboard.spec.ts`가 고정하는 것: 로드 중 pageerror·console error 0건(하이드레이션 포함), 200과 h1 하나, 누른 건반의 계이름 표시,
Tab·Enter·Space만으로 누르기, 샘플 요청 30건을 모두 abort해도 표시·판정 동작(서비스 워커 등록 차단), 320px·390px에서 가로 넘침 없음과
가운데 도가 건반 영역의 보이는 범위 안에 있음. 재생 화면 회귀는 `application-smoke`·`playback-controls-responsive`·`hand-practice`로 봤다.

## 화면 확인 (오케스트레이터, chromium 스크린샷)

- 1280px: C3~C5, 검은 건반 2개·3개 묶음 표시, 가운데 도 강조 정상.
- 390px 1차 구현: 건반 영역이 왼쪽 끝에서 시작해 가운데 도가 오른쪽 끝에 반쯤 잘림 → 처음 스크롤 위치를 가운데 도에 맞추도록 수정, 재촬영으로 확인.

## E2E 실패 이력

1차 실행 40 passed / 2 failed: 샘플 요청을 막는 테스트가 서비스 워커를 끄지 않아 요청이 워커를 거쳐 나가 `page.route`가 가로채지 못했다
(제품 결함 아님). `addInitScript`로 등록을 막아 해결.

## 로컬 리뷰 (Codex `gpt-6-astra` high, read-only, Orca 터미널, 대상 `2cc4734`)

| # | Finding | State | Handling |
|---|---|---|---|
| 1 | P2: MIDI 지원 브라우저에서 하이드레이션 실패(MIDI status가 서버 `unsupported`, 브라우저 `idle`) | FIXED | 마운트 전 중립 상태 렌더, Jest·E2E 회귀 테스트 |
| 2 | P2: L-2 검증 기록·HANDOFF 누락 | FIXED | 이 문서와 HANDOFF |
| 3 | P3: 안내 어미 혼용, 터치 사용자에게 PC 조작만 안내 | FIXED | `-요`체 통일, 클릭·터치 안내 추가 |

계이름·옥타브 매핑, 검은 건반 묶음 위치, 직전 문제 제외, 재생용 렌더 경로, 오디오 생성 시점, MIDI 권한 요청 시점에서는 결함 없음.

## 결정한 것

- 검은 건반 표기는 샵으로 통일(`도#`). 한 건반에 이름 둘은 초보자가 헷갈린다.
- 보이는 범위 C3~C5(MIDI 48~72): 검은 건반 묶음이 두 번 반복되고 도가 세 개다.
- `SimplePianoKeyboard`에 선택 속성 `learningKeys`를 더해 재사용. 캔버스 건반은 건반별 포커스·이름이 없어 쓰지 않았다.

## Gaps and risks

- Firefox·WebKit·Mobile Safari E2E는 PR CI에 맡긴다(D-088).
- 실제 MIDI 장치, 실제 청취, 스크린리더(같은 건반 연속 입력의 재낭독 포함), 실기기 터치는 확인하지 않았다.
- 리뷰 수정 커밋에 대한 재리뷰는 하지 않았다(hosted 리뷰가 PR에서 본다).
