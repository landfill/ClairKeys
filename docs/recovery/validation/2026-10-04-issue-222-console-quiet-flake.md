# Validation — #222 `console-quiet` 악보 테스트의 CI 반복 실패

Date: 2026-10-04 KST
Branch/commit: `codex/issue-222-console-quiet-flake` / `75904df`
Environment: macOS, production 빌드(`npm run build && npm start`), `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, Playwright 1.57.0.

## Claim being verified

`e2e/console-quiet.spec.ts:40`이 CI에서 다섯 번 연속 첫 시도에 실패하고 재시도에서 통과한 원인은 서비스 워커와의 경합이며, fixture를 컨텍스트 수준에서
응답하면 결과가 순서에 의존하지 않는다. 서비스 워커는 계속 켜 두어 D-093의 콘솔 검사 범위가 줄지 않는다.

## 원인 (재현으로 확인)

- `public/sw.js`는 `install`에서 `skipWaiting()`, `activate`에서 `clients.claim()`을 불러 활성화 즉시 열린 탭을 제어한다. `src/app/layout.tsx`는 `load` 뒤에 등록한다.
- 워커의 `ROUTE_PATTERNS`는 `/^\/(?!api)/`(NETWORK_FIRST)로 API가 아닌 모든 경로를 처리한다. `/api/sheet/<id>`는 어느 패턴에도 걸리지 않는다.
- 악보 페이지는 클라이언트에서 `/api/sheet/188`을 받은 뒤 `animationDataUrl`을 받는다. 워커가 그사이 제어권을 잡으면 애니메이션 요청은 워커가 네트워크로 보내고,
  `page.route`는 워커의 요청을 가로채지 못한다. 실제 서버가 404를 돌려주고 악보 제목이 그려지지 않는다.

재현(임시 spec, chromium, CDP `Emulation.setCPUThrottlingRate`, 각 4회):

| CPU 감속 | 제목 표시 | `/api/sheet/188` | `/console-quiet-animation.json` | 가로채기 호출(애니메이션) |
|---|---|---|---|---|
| 1배 | 4/4 | 200, 워커 아님 | 200, 워커 아님 | 1 |
| 6배 | 0/4 | 200, 워커 아님 | **404, 워커 경유** | 0 |
| 20배 | 0/4 | 200, 워커 아님 | **404, 워커 경유** | 0 |

모든 실행에서 로드 뒤 `navigator.serviceWorker.controller`가 있었다. 차이는 애니메이션 요청이 워커 제어 전에 나갔는지뿐이다.

## 수정안 비교 (6배 감속, 워커 켜 둠, 각 3회)

| 안 | 결과 | 채택 |
|---|---|---|
| A. `context.route`로 같은 경로 응답 | 제목 3/3, 응답 200이 **워커 경유**이면서 가로채기 1회 | 채택. 워커의 경로 표에 의존하지 않고 운영과 같은 경로(워커가 처리하는 애니메이션 요청)를 지난다 |
| B. `page.route` + 워커가 무시하는 `/api/…` 경로 | 제목 3/3, 워커 아님 | 기각. 워커의 경로 표가 바뀌면 다시 깨진다 |
| 서비스 워커 등록 차단(다른 spec의 방식) | 시험하지 않음 | 기각. 이 spec은 등록 로그를 감시한다(D-093) |

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| 새 회귀 테스트(워커가 제어한 뒤 악보 열기), 수정 전, `--project=chromium --project="Mobile Chrome" --repeat-each=3` | FAIL (의도) | 새 테스트 6/6 실패. 같은 실행에서 기존 테스트도 1회 실패(경합의 로컬 재현) |
| `npx playwright test e2e/console-quiet.spec.ts` 5개 프로젝트 `--repeat-each=5` (수정 후) | PASS | 210 passed, 15 skipped(새 테스트는 Chromium 계열에서만 실행) |
| `PATH=<ci-venv>/bin:$PATH npx jest` | PASS | 154 suites, 1533 tests |
| `npx tsc --noEmit --incremental false`, `npm run lint` | PASS | exit 0, no warnings |

새 테스트는 애니메이션 응답이 워커를 거쳤음(`response.fromServiceWorker()`)을 단언해, 경합 상황이 실제로 만들어졌음을 고정한다.

## 다른 spec

서비스 워커를 막지 않으면서 `page.route`를 쓰는 spec은 이 파일뿐이다. 26개 spec은 `addInitScript`로 등록을 막고, `library-delete-dialog.spec.ts`는 `serviceWorkers: 'block'`을 쓴다.

## Gaps and risks

- CI 러너에서의 확인은 PR CI에 맡긴다. 실패가 관측된 곳이 CI이므로 PR CI에서 재시도 없이 통과하는지(Playwright `flaky` 0건)를 봐야 한다. 이슈의 완료 조건은 연속 실행 확인이다.
- Firefox·WebKit에서는 이 실패가 관측되지 않았다. 그 엔진들에서 워커가 탭을 제어하는지는 조사하지 않았다.
- 제품 동작은 바꾸지 않았다. 워커가 등록 직후 탭을 제어하고 비API 경로를 모두 처리하는 것은 기존 설계다.
