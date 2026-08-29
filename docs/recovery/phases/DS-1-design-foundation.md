# DS-1 — 디자인 토큰과 공통 셸

Status: `NOT_STARTED`
Depends on: **DS-G1** (내비게이션 구성이 G1-4의 답을 요구한다). DS-G1은 DS-0에 의존한다
Blocks: DS-2, DS-3, DS-4, DS-5, DS-6, DS-7
Issue: [#76](https://github.com/landfill/ClairKeys/issues/76) 1단계

## Objective

이후 모든 화면이 소비할 디자인 토큰과 공통 셸을 한 번에 정한다. 토큰 없이 개별 화면부터 고치면
색상·간격·대비가 화면마다 흩어지고, DS-7에서 상태 표현을 통일할 근거가 사라진다 (D-024 결정 4).

## In scope

이 단계는 성격이 다른 두 종류의 변경을 담는다. **같은 PR에 담더라도 커밋을 나눈다** — 회귀가 나면
어느 쪽이 원인인지 분리할 수 있어야 한다 (D-024).

**A. 시각 변경 (기능 불변)**

- 색·타이포그래피·간격·상태 색 토큰 (**라이트 팔레트 한 벌만** — D-025)
- `Header`, `Footer`, `Container`, `PageHeader`의 표현
- 포커스 링, 키보드 탐색 순서, 명도 대비, 색상 외 상태 구분을 공통 컴포넌트 단계에서 고정
- 아이콘 체계 도입과 이모지 제거
- DS0-5(죽은 Footer 링크·2024 저작권), DS0-10(죽은 다크 CSS)

**B. 도달 경로 변경 (기능 변경)**

- 내비게이션 5개 → 3개(`내 악보`·`새 악보`·`탐색`). `처리 상태` 메뉴와 `/processing` 라우트를
  제거한다 (D-026 G1-4). 메뉴 제거는 **사용자가 그 화면에 도달하는 경로를 없애는 것**이다
- DS0-3의 고아 라우트 8개 제거 또는 격리. 프로덕션에서 200을 반환하던 URL이 404가 되거나 인증 뒤로
  간다

B는 시각 개편이 아니라 라우팅 변경이므로 아래 "라우트 회귀 검증"을 별도로 갖는다.

## Out of scope

- 개별 제품 화면의 레이아웃·문구 (DS-2 이후)
- 다크 팔레트 (D-025)
- 플레이어 내부 (DS-5). `playback-chrome` 클래스 유지만 이 단계의 책임이다

## 변경 대상

| 경로 | 변경 |
|---|---|
| `src/app/globals.css` | 토큰 정의. 죽은 `prefers-color-scheme` 블록 처리 (DS0-10) |
| `src/app/layout.tsx` | `<main className="flex-1 bg-gray-50">`의 하드코딩 배경을 토큰으로 |
| `src/components/layout/Header.tsx` | 내비게이션 3개 구성, 워드마크, 이모지 제거 |
| `src/components/layout/Footer.tsx` | 죽은 링크 3개, 저작권 표기 (DS0-5) |
| `src/components/layout/Container.tsx`, `PageHeader.tsx` | 간격 토큰 적용 |
| `src/components/ui/*` | `Button`, `Card`, `Loading` 등 토큰 소비 |
| `src/app/demo-*`, `src/app/test-*`, `src/app/admin/*` | DS0-3 결론에 따라 제거 또는 격리 |

## 진입 조건 (DS-0이 확정한 6개)

1. **토큰 정의** — 이슈 #76 비주얼 시스템의 배경(아이보리)·기본색(잉크/네이비)·강조색(테라코타)·
   보조색(블루·세이지)과 상태 색(처리 중·연습 가능·오류).
2. **다크 모드 잔재 처리** — 구현하지 않는다(D-025). 죽은 블록을 제거할지, 남기고 주석을 달지.
3. **내비게이션 구성** — **확정됨 (D-026 G1-4).** `내 악보`·`새 악보`·`탐색` 3개로 줄이고
   **`처리 상태` 메뉴와 `/processing` 화면을 제거한다.** 대체 도달 경로는 내 악보의 파생 상태
   배지이며 그것은 DS-4가 만든다 — DS-1~DS-4 사이에 배지가 없는 기간이 생기지만, 현재도
   `/processing`은 빈 화면이라 잃는 정보가 없다. `/api/processing`·`/api/notifications`·
   `useBackgroundProcessing`·`ProcessingDashboard`의 **삭제는 P2-A 소유**다. DS-1은 도달 경로만
   없앤다.
4. **고아 라우트 처리** — DS0-3의 8개를 제거할지, 인증 뒤로 옮길지, 유지할지.
5. **아이콘 체계** — 세트 선택과 도입 방식(인라인 SVG / 라이브러리).
6. **`playback-chrome` 계약** — 새 Header·Footer도 이 클래스를 유지한다 (D-024 Directive).

## 회귀 기준

**기능 회귀 (A가 바꾸지 않아야 하는 것)**

- `body.playback-active .playback-chrome { display: none }`과 `body.playback-rotated`가
  그대로 동작한다. 새 Header·Footer가 `playback-chrome` 클래스를 갖는다.
- 로그인 상태에 따른 내비게이션 표시 분기가 유지된다.
- `AuthGuard`의 `callbackUrl` 보존이 깨지지 않는다.

**라우트 회귀 검증 (B)**

B는 의도적으로 도달 경로를 바꾸므로 "변하지 않음"이 아니라 "의도한 대로 변함"을 검증한다.

- 변경 전 라우트별 응답 코드를 먼저 기록한다 (DS-0이 남긴 8개 200이 기준선이다).
- 변경 후 각 라우트의 응답 코드가 **의도한 값**임을 확인한다. 제거 → 404, 격리 → 인증 리다이렉트,
  유지 → 200.
- 제품 라우트(`/`, `/explore`, `/sheet/[id]`, `/upload`, `/library`, `/profile`, `/auth/*`)의 응답
  코드는 **바뀌지 않는다**. 여기서 하나라도 바뀌면 회귀다.
- 제거한 라우트를 참조하는 코드가 남아 있지 않다 (`grep`으로 확인).
- 내비게이션에서 제거한 화면에 **다른 도달 경로가 있는지** 확인한다. `처리 상태`의 대체 진입점은
  DS-4가 만들 내 악보의 파생 상태 배지이므로, DS-1 시점에는 아직 없다. 이 공백이 의도된 것임을
  검증 기록에 명시한다 (제거 전 `/processing`이 빈 화면이었다는 DS-0 근거와 함께).

**시각 회귀** — `e2e/application-smoke.spec.ts`의 세 검사가 계속 통과한다.

- 홈 렌더와 접근 가능한 내비게이션
- **브라우저 확대 허용** — viewport meta에서 `user-scalable=no`나 `maximum-scale`을 되살리지 않는다
- `/explore` 진입

## 접근성·반응형 검증

- 모든 토큰 조합에 대해 본문 4.5:1, 큰 텍스트 3:1 이상.
- 키보드만으로 Header → 본문 → Footer 순회가 가능하고 포커스 링이 보인다.
- 상태 표시가 색상 외 수단(아이콘·텍스트·형태)을 함께 갖는다.
- 데스크톱 1440·1024, 모바일 390 세로에서 셸이 깨지지 않는다.

## Completion criteria

- 토큰이 `globals.css` 한 곳에 정의되어 있고, 변경 대상 파일에 색상 리터럴(`bg-white`, `text-gray-*`,
  `#hex`)이 남아 있지 않다.
- 내비게이션이 `내 악보`·`새 악보`·`탐색` 3개다. `처리 상태` 메뉴와 `/processing` 라우트가 제거됐다.
- `href="#"` 링크가 0건이고 저작권 표기가 현재 연도다.
- 이모지가 공통 셸에서 제거되고 선형 아이콘으로 대체되어 있다.
- DS0-3의 8개 라우트 각각에 대해 처리 결과(제거/격리/유지), 변경 전후 응답 코드, 이유가 표로
  기록되어 있다.
- 제품 라우트 7개의 응답 코드가 변경 전과 같다.
- 내비게이션에서 제거한 화면마다 대체 도달 경로가 명시되어 있다 (없다면 그 화면을 함께 제거한다).
- 시각 변경(A)과 도달 경로 변경(B)이 서로 다른 커밋에 있다.
- DS0-10의 죽은 다크 블록이 제거됐거나, 남긴 경우 죽은 코드임이 주석에 있다.
- 재생 화면에 진입해 재생을 시작하면 Header·Footer가 숨겨진다 (수동 확인, 근거 기록).

## 검증 명령

```bash
npm run lint
npx tsc --noEmit
npm test
npm run test:e2e
npm run build
grep -rn 'href="#"' src/components/layout/              # 0건
grep -rn 'bg-white\|text-gray-' src/components/layout/  # 0건
grep -rn 'playback-chrome' src/components/layout/       # Header·Footer 양쪽에 존재

# 라우트 회귀 (B) — 배포 프리뷰에서 변경 전후를 각각 실행해 표로 남긴다
for r in / /explore /upload /library /profile /auth/signin /auth/error \
         /demo-animation /demo-category /demo-playback /demo-practice \
         /test-piano /test-finger /test-background-processing /admin/update-finger-data; do
  printf '%-34s %s\n' "$r" "$(curl -s -o /dev/null -w '%{http_code}' "<프리뷰 URL>$r")"
done

git log --oneline origin/main..HEAD   # A 커밋과 B 커밋이 분리되어 있어야 한다
```
