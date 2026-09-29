# Validation — #187 한 페이지의 `/api/auth/session` 호출 (auth-session)

Date: 2026-09-29 KST · Branch `codex/issue-187-auth-session` · head `8926646` · tree `7fa1d4aa`

## 운영 측정 (변경 전, main `2fb3281` 배포본, 비로그인, 헤드리스 Chromium, Service Worker 차단)

로드 후 `networkidle` + 2.5~3초 동안 `/api/auth/*` 요청을 셌다.

| 경로 | `/api/auth/session` | 그 밖의 `/api/auth/*` |
|---|---|---|
| `/` | 1 | `signin?callbackUrl=%2Fupload` 1 (parser 시작, 세션 요청 아님) |
| `/explore` | 1 | — |
| `/sheet/87` | 1 | — |
| `/auth/signin` | **2** | `providers` 1 |
| `/upload` → `/auth/signin` | **2** | `signin?callbackUrl=%2Fupload` 1, `providers` 1 |
| `/profile` → `/auth/signin` | **2** | `signin?callbackUrl=%2Fprofile` 1, `providers` 1 |

- 이슈의 "한 페이지 4회"(2026-09-27)는 재현되지 않았다. 코드의 세션 호출 위치는 이슈 시점 `3df9702`와 같다.
- `/explore`에서 `visibilitychange`(hidden→visible)를 3회 흉내 내도 추가 요청 0. next-auth는 세션이 `null`이면
  탭 복귀 때 다시 가져오지 않는다. 로그인 상태의 탭 복귀 재조회는 측정하지 않았다(기본 동작, 범위 밖).
- 클라이언트 이동(`/explore` → `/`)에서도 추가 세션 요청 0.

## 재현 (변경 전 코드, 로컬 production 빌드)

`NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, `npm run build && npm start`.

`npx playwright test e2e/auth-session-once.spec.ts --project=chromium`: 3 failed / 2 passed.
`/auth/signin`·`/upload`·로그인 상태 로그인 페이지가 각각 2회(기대 1). `/`·`/explore`는 통과.

## 로컬 검증 (`8926646`)

| 검사 | 결과 |
|---|---|
| `npx playwright test e2e/auth-session-once.spec.ts e2e/signin-return-path.spec.ts` (6 projects, production 빌드) | 40/40 |
| 전체 Jest (uv Python 3.10.19 venv, `omr-service/requirements-ci.txt`, Node v22.18.0) | 128 suites, 1279/1279 (기준선과 같음) |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm run lint` | PASS |

- 로그인 상태는 `/api/auth/session`을 `page.route`로 사용자 세션 JSON으로 응답해 흉내 냈다. 실제 OAuth 로그인은 거치지 않았다.

## 미검증

- 운영 호출 횟수(변경 후). 병합(= 운영 배포) 후 같은 방법으로 `/auth/signin`·`/upload`를 잰다.
- 실제 Google 로그인 후 로그인 페이지 재방문 시 복귀.
