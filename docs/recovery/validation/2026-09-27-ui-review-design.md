# Validation — UI-2026 운영 점검 디자인 정리 (PR189)

Date: 2026-09-27 KST
Branch/head: `codex/ui-2026-review-design` / `bba38de`
Phase: [UI-2026-review-design](../phases/UI-2026-review-design.md), decision D-080

## 운영 점검 근거 (변경 전, 2026-09-27)

비로그인 운영 `https://clairkeys.vercel.app`, 내장 브라우저 PC 1440×900 / 모바일 375×812.

- `/explore`: `추천 악보`·`인기 악보`·`최신 악보`에 공개 악보 90/91/92 세 곡이 반복됨. 코드상 인기·추천은
  `/api/sheet/public?limit=8&sortBy=newest` 결과를 자른 것.
- 검색 탭: 결과가 `div` 클릭 핸들러, 남색(`tone=info`) 카테고리 배지, 파란 스피너·보라/파랑 포커스,
  비로그인에게 `공개 설정: 내 비공개만`과 `(공개: 3, 비공개: 0)` 노출.
- `/sheet/92` 재생 준비: 한 줄 안내문, `음량 (master gain)` 슬라이더와 `0.50` 표기, 손 색 설명 없음.
- `/library` 비로그인 → 로그인 화면 제목 `악보를 맡기기 전에 로그인해 주세요`.
- `/sheet/99999` → 카드 안에 오류 카드 중첩.
- `public/manifest.json`: `theme_color #2563eb`, `background_color #000000`.
- 점검 도구의 접근성 트리에서 탐색 탭 버튼 이름이 비어 보였으나, 기존 E2E
  `announces which explore tab is selected`가 `getByRole('button', { name: '탐색' })`로 통과한다.
  도구 표시 한계로 판단해 범위에 넣지 않았다.

## 재현 테스트 (구현 전 실패)

| 대상 | 변경 전 결과 |
|---|---|
| `PublicSheetMusicBrowser.test.tsx` (단일 목록·공통 행동) | 11개 중 9 fail (새 제목 미존재 포함) |
| `SheetMusicSearch.test.tsx` (링크·비로그인 필터·토큰) | 4 fail |
| `FallingNotesPlayer.test.tsx` / `CompactPlaybackBar.test.tsx` (음량·안내·범례) | 5 fail |
| `src/lib/__tests__/signinCopy.test.ts` | suite fail (모듈 없음) |
| `globalStyles.test.ts` manifest 브랜드 색 | 1 fail |

## 구현 후 검증

| 명령 | 결과 |
|---|---|
| `npx jest` | 1115 pass / 2 fail — 실패 2개는 Python bridge(`fastapi` 미설치: 로컬 시스템 Python 3.14) |
| `PATH=<uv venv py3.10 + omr-service/requirements-ci.txt>/bin:$PATH npx jest -t "passes test_score_artifact.py\|Python callback regressions"` | 2 pass → 전체 1117/1117 |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (warning 0) |
| `npm run build` | PASS (33 static pages) |
| `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 npx playwright test e2e/explore-cards-responsive.spec.ts e2e/playback-mode-clarity.spec.ts e2e/playback-session-transition.spec.ts e2e/application-smoke.spec.ts` | 109 pass / 1 fail (5 projects) |

실패 1건: `[webkit] playback-session-transition … on phone portrait`의 viewport 변경 후 `재생 위치` 슬라이더
`toBeFocused`. 브랜치에서 `--repeat-each=3` 18개 중 1 fail, **main 워크트리에서 `--repeat-each=5` 30개 중
1 fail**(같은 assertion). 이 PR과 무관한 기존 간헐 실패로 분류한다. 수정은 범위 밖 후속 후보.

## 미검증 / 후속

- 운영 데이터 화면은 Vercel Preview에서 확인 후 [리뷰 로그](../reviews/PR-189.md)에 기록한다.
- 로그인 상태(공개 설정 필터 표시)는 단위 테스트로만 확인. 실제 OAuth 로그인은 미실행.

## 후속 head `5f3f9a9` — 로그인 복귀 경로 (2026-09-27)

로컬 production build에 fixture 데이터로 PC/모바일 화면을 캡처하던 중, 비로그인 `/library`가 경로별 문구가 아닌
일반 문구를 보였다. 원인: next-auth `/api/auth/signin`이 로그인 화면으로 보낼 때 `callbackUrl`을 같은 origin의
절대 URL(`http://localhost:3000/library`)로 넘기고, 로그인 화면의 `toSafeReturnPath`가 이를 `/`로 떨어뜨림.
그 결과 로그인 후 원래 보호 경로가 아니라 홈으로 돌아가는 기존 결함도 확인(운영에서도 같은 절대 URL 관찰).

| 명령 | 결과 |
|---|---|
| `npx jest src/lib/__tests__/returnPath.test.ts` (구현 전) | `toSafeReturnPathFrom` 없음으로 fail |
| `PATH=<py3.10 venv>/bin:$PATH npx jest` | 1122/1122 pass |
| `npx tsc --noEmit`, `npm run lint`, `npm run build` | PASS |
| Playwright explore/playback-mode/session-transition/smoke/**signin-return-path** (5 projects) | **125/125 pass** |

- 이전 head의 WebKit phone-portrait seek focus 간헐 실패는 이번 실행에서 재현되지 않았다(기존 분류 유지).
- 로컬 캡처 중 `pkill -f "next start"`가 `next-server` 프로세스를 끄지 못해 Playwright가 오래된 빌드를
  재사용했고 chunk 400으로 로그인 화면이 멈췄다. 포트 기준(`lsof -ti tcp:3000 | xargs kill`) 정리 후 재실행한
  결과만 위에 기록했다.
- 화면 확인: Vercel Preview는 배포 보호 로그인이 필요해 열지 못했다. 로컬 build + fixture로 PC 1440×900·모바일
  390×844의 탐색·검색·재생 준비·없는 악보·로그인 화면을 캡처해 확인했다(카드 1회 표시, `연습 시작 →`, 토큰 색,
  3단계 안내, `음량 78%`, 손 색 범례, 중첩 없는 오류 카드). 캡처는 세션 scratchpad에만 있다.
