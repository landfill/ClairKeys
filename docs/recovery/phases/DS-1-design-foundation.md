# DS-1 — 디자인 토큰과 공통 셸

Status: `NOT_STARTED`
Depends on: DS-0 (`DONE`). 내비게이션 구성 항목은 **DS-G1의 G1-4**에 의존한다
Blocks: DS-2, DS-3, DS-4, DS-5, DS-6, DS-7
Issue: [#76](https://github.com/landfill/ClairKeys/issues/76) 1단계

## Objective

이후 모든 화면이 소비할 디자인 토큰과 공통 셸을 한 번에 정한다. 토큰 없이 개별 화면부터 고치면
색상·간격·대비가 화면마다 흩어지고, DS-7에서 상태 표현을 통일할 근거가 사라진다 (D-024 결정 4).

## In scope

- 색·타이포그래피·간격·상태 색 토큰 (**라이트 팔레트 한 벌만** — D-025)
- `Header`, `Footer`, `Container`, `PageHeader`와 주요 내비게이션
- 포커스 링, 키보드 탐색 순서, 명도 대비, 색상 외 상태 구분을 공통 컴포넌트 단계에서 고정
- 아이콘 체계 도입과 이모지 제거
- DS0-3(고아 라우트 8개), DS0-5(죽은 Footer 링크·2024 저작권), DS0-10(죽은 다크 CSS)

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
3. **내비게이션 구성** — 목표는 `내 악보`·`새 악보`·`탐색` 3개. 현재는 5개.
   **`처리 상태` 메뉴의 처리 방향은 DS-G1의 G1-4가 정한다.**
4. **고아 라우트 처리** — DS0-3의 8개를 제거할지, 인증 뒤로 옮길지, 유지할지.
5. **아이콘 체계** — 세트 선택과 도입 방식(인라인 SVG / 라이브러리).
6. **`playback-chrome` 계약** — 새 Header·Footer도 이 클래스를 유지한다 (D-024 Directive).

## 회귀 기준

**기능 회귀** — 이 단계는 기능을 바꾸지 않는다.

- `body.playback-active .playback-chrome { display: none }`과 `body.playback-rotated`가
  그대로 동작한다. 새 Header·Footer가 `playback-chrome` 클래스를 갖는다.
- 로그인 상태에 따른 내비게이션 표시 분기가 유지된다.
- `AuthGuard`의 `callbackUrl` 보존이 깨지지 않는다.

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
- 내비게이션이 3개로 정리되어 있고, `처리 상태` 메뉴의 처리가 DS-G1의 결정과 일치한다.
- `href="#"` 링크가 0건이고 저작권 표기가 현재 연도다.
- 이모지가 공통 셸에서 제거되고 선형 아이콘으로 대체되어 있다.
- DS0-3의 8개 라우트 각각에 대해 처리 결과(제거/격리/유지)와 이유가 기록되어 있다.
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
```
