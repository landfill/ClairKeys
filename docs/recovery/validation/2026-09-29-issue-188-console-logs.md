# Validation — #188 운영 콘솔의 디버그 로그와 내부 URL

Date: 2026-09-29 KST · Branch `codex/issue-188-console-logs` · head `f771739` · tree `36423a8a`

## 운영 재현 (변경 전, main `fb1e961` 배포본, 비로그인 헤드리스 Chromium)

| 경로 | 콘솔 |
|---|---|
| `/`, `/explore` | `[log] ClairKeys SW registered: https://clairkeys.vercel.app/` 1회 |
| `/sheet/95` | SW 로그 + `🔍 Fetching animation data…`, `🔗 Fetching animation file from: https://…supabase.co/storage/v1/object/public/animation-data/…json`, `📡 … status: 200`, `📝 Raw animation file content (first 200 chars): { "version": "1.1", "title": "Clair de Lune", …`, `✅ Successfully validated animation data {…}` |
| `/sheet/92` (이슈 경로) | 이제 404(악보 없음). SW 로그와 404 오류 1개 |

- SW 등록 로그 4회는 재현되지 않았다. 문서를 한 번 열 때 1회다(main-frame 이동 2회 측정에서도 1회).
- 서버 로그(코드로 확인): `/api/categories` POST가 `JSON.stringify(authOptions)`를 찍었다.
  `JSON.stringify(GoogleProvider({clientId, clientSecret}))`에 secret이 포함됨을 로컬 node로 확인했다.
  이 코드는 `272d9a0`(2025-08-05)부터 있었다. NextAuth `session` 이벤트는 세션 조회마다 이메일을 찍었다.
  운영 로그에 실제로 남았는지는 Vercel 로그를 보지 않아 확인하지 않았다.

## 재현 (변경 전 코드, 로컬 production 빌드)

`NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, `npm run build && npm start`.

- `npx playwright test e2e/console-quiet.spec.ts --project=chromium`: 3 failed(`/` +3, `/explore` +3, 악보 +8줄 diff).
- `no-console` 규칙 추가 후 `npm run lint`: 86건(19개 파일). `layout.tsx` 인라인 스크립트 문자열은 lint 밖이라 E2E가 잡는다.

## 로컬 검증 (`f771739`)

| 검사 | 결과 |
|---|---|
| `npx playwright test e2e/console-quiet.spec.ts e2e/auth-session-once.spec.ts e2e/score-panel.spec.ts e2e/application-smoke.spec.ts` (6 projects, production 빌드) | 86 passed / 8 skipped(score-panel PC 전용) |
| `npm run lint` | PASS (`no-console` 0건, 경고 0) |
| `npx tsc --noEmit --incremental false` | PASS |
| 전체 Jest (uv Python 3.10.19 venv, Node v22.18.0) | 128 suites, 1278/1278 (기준선 1279 − 삭제한 `debug` 옵션 테스트 1) |

- 로그 제거로 남은 빈 블록·미사용 변수를 정리했고, 빈 줄 삭제는 모두 제거한 로그 바로 옆임을 diff로 확인했다.

## 운영 측정 (변경 후, 병합 `196baf4`, Production deployment 6729903475)

비로그인 헤드리스 Chromium, 서비스 워커 허용, `networkidle` + 3초.

| 경로 | 변경 전 콘솔 | 변경 후 콘솔 | 활성 SW |
|---|---|---|---|
| `/` | log 1 | 0 | `/sw.js` |
| `/explore` | log 1 | 0 | `/sw.js` |
| `/sheet/95` | log 6 (Storage URL·원문 포함) | 0 | `/sw.js` |
| `/auth/signin` | — | 0 | `/sw.js` |

- 운영 `https://clairkeys.vercel.app/sw.js`의 `console.log` 0개. 서비스 워커 등록·활성화는 그대로 된다.

## 미검증

- 업로드·실시간 처리·PWA 설치 흐름의 실제 동작(로그 줄만 지웠고 해당 E2E는 돌리지 않았다).
- 운영 Vercel 로그에 과거 secret·이메일이 남았는지.
