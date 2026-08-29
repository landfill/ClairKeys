# Validation — DS-1/token-contrast

Date: 2026-08-29
Commit: `e9aa371` (토큰 도입), `cb8a74b` (도달 경로 변경)
Environment: macOS, Node 로컬 계산 + `npm` 스크립트

## Claim being verified

DS-1이 도입한 라이트 팔레트가 WCAG AA(본문 4.5:1, 비텍스트 3:1)를 실제로 충족하는가. 그리고 공통 셸
변경이 기존 계약(`playback-chrome`, E2E 스모크)을 깨지 않는가.

## 명도 대비 계산

색을 고른 뒤 재는 대신, 후보 팔레트의 모든 사용 조합을 계산해 통과하는 값만 채택했다. 계산은
WCAG 2.x 상대 휘도 공식(sRGB 선형화 후 0.2126R + 0.7152G + 0.0722B)을 그대로 쓴다.

| 조합 | 비율 | 기준 |
|---|---:|---:|
| 본문 `#1b1f2a` / 페이지 `#faf6ee` | 15.27 | 4.5 |
| 본문 `#1b1f2a` / 카드 `#ffffff` | 16.46 | 4.5 |
| 본문 `#1b1f2a` / 보조 표면 `#f3eee3` | 14.22 | 4.5 |
| 보조 텍스트 `#565c6b` / 페이지 | 6.21 | 4.5 |
| 보조 텍스트 `#565c6b` / 카드 | 6.69 | 4.5 |
| 강조 `#a8452a` / 페이지 | 5.49 | 4.5 |
| 강조 `#a8452a` / 카드 | 5.92 | 4.5 |
| 흰 텍스트 / 강조 버튼 `#a8452a` | 5.92 | 4.5 |
| 흰 텍스트 / 강조 hover `#8e3822` | 7.67 | 4.5 |
| 왼손 `#35618e` / 페이지 | 5.99 | 4.5 |
| 오른손 `#416349` / 페이지 | 6.27 | 4.5 |
| 연습 가능 `#2f6b4f` / 페이지 | 5.84 | 4.5 |
| 처리 중 `#7a5b12` / 페이지 | 5.85 | 4.5 |
| 오류 `#a32e2e` / 페이지 | 6.52 | 4.5 |
| 연습 가능 / 카드 | 6.29 | 4.5 |
| 처리 중 / 카드 | 6.30 | 4.5 |
| 오류 / 카드 | 7.03 | 4.5 |
| 포커스 링 `#a8452a` / 보조 표면 | 5.11 | 3.0 |
| 입력 테두리 `#8c836f` / 페이지 | **3.48** | 3.0 |
| 입력 테두리 `#8c836f` / 카드 | 3.76 | 3.0 |

19개 조합 전부 통과. 가장 빡빡한 것이 `--ck-rule-strong`의 3.48이다.

`--ck-rule`(`#e0d9c9`, 페이지 대비 1.30)은 **장식용 구분선 전용**이다. WCAG 1.4.11은 이해에 필요한
UI 컴포넌트 경계에 적용되므로, 입력·컨트롤 테두리에는 `--ck-rule-strong`을 쓴다. 이 구분이 지켜지지
않으면 대비가 아니라 토큰 선택이 잘못된 것이다.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| 명도 대비 계산 (위 표) | PASS | 19/19 통과, 최소 3.48 |
| `npm run lint` | PASS | `✔ No ESLint warnings or errors` |
| `npx tsc --noEmit` | PASS | `.next` 정리 후 오류 0 (삭제한 라우트의 stale 타입이 남아 있으면 오탐이 난다) |
| `npx jest` (커밋 A 시점) | PARTIAL | 63 suites / 603 tests 중 601 통과. 실패 2건은 커밋 B가 할 내비게이션 축소를 가리키는 **의도된 실패** |
| `npx jest` (커밋 B 시점) | PASS | **63 suites / 603 tests 전부 통과** |
| `npm run build` | PASS | 라우트 목록에서 `demo-*`·`test-*`·`/processing`이 사라졌다 |
| `npx playwright test --project=chromium` | PASS | 스모크 3/3 |
| `npx playwright test` (firefox/webkit/Mobile Safari) | NOT_RUN | 로컬에 브라우저 바이너리가 없다 (`Executable doesn't exist ... firefox-1497`). CI가 실행한다 |

로컬 E2E는 `NEXTAUTH_SECRET` 없이는 웹서버가 뜨지 않는다(`NO_SECRET`). 더미 값을 넣어 실행했다.
`DATABASE_URL`이 없어 `/api/sheet/public`이 Prisma 검증 오류를 내지만, 스모크가 검사하는 공개 경로
렌더에는 영향이 없었다.

## Baseline comparison

- Fixed failures: 없음
- Remaining pre-existing failures: 없음. 커밋 A 시점의 실패 2건은 이 작업이 스스로 만든 회귀 근거였고
  커밋 B에서 해소됐다
- New failures: 없음

## 라우트 응답 코드 — 변경 전 (운영, 익명 `curl`)

| 라우트 | 변경 전 | 의도 |
|---|---:|---|
| `/` | 200 | 유지 |
| `/explore` | 200 | 유지 |
| `/auth/signin` | 200 | 유지 |
| `/auth/error` | 200 | 유지 |
| `/upload` | 307 | 유지 (middleware 리다이렉트) |
| `/library` | 307 | 유지 |
| `/profile` | 307 | 유지 |
| `/processing` | 200 | **제거 → 404** |
| `/demo-animation` `/demo-category` `/demo-playback` `/demo-practice` | 200 | **제거 → 404** |
| `/test-piano` `/test-finger` `/test-background-processing` | 200 | **제거 → 404** |
| `/admin/update-finger-data` | 200 | **격리 → 307** (middleware `protectedPaths`에 `/admin` 추가) |

변경 후 실측은 배포 프리뷰에서 수행하고 아래에 기록한다.

## 라우트 응답 코드 — 변경 후 (배포 프리뷰)

(PR 프리뷰 URL 확보 후 기록)

## Manual checks

- 재생 중 셸 숨김 계약: `appShell.test.tsx`가 Header·Footer의 `playback-chrome` 클래스를 단언한다.
  실기기 재생 확인은 DS-5·DS-7의 종단 검증 대상이다.

## Gaps and risks

- **axe 자동 검사와 수동 접근성 검사(키보드 순회, 포커스 가시성, 200% 확대)를 실행하지 않았다.**
  DS-7의 종단 판정 항목이며, DS-1은 토큰 수준의 대비만 보장한다.
- `BackgroundFileUpload`에 `/processing`으로 가는 링크가 두 곳 남아 있다. P1-A가 호출자 0으로 확인해
  P2-A로 넘긴 고아 컴포넌트라 이 단계에서 건드리지 않았다.
- 대체 도달 경로 공백: `처리 상태`를 대신할 내 악보 상태 배지는 DS-4가 만든다. 제거 전에도 그 화면은
  비어 있었으므로 잃는 정보는 없다.
- 실기기·실화면 확인은 하지 않았다.
