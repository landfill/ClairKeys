# Issue #114 main landmark validation

Date: 2026-09-03 KST
Issue: [#114](https://github.com/landfill/ClairKeys/issues/114)
PR: [#116](https://github.com/landfill/ClairKeys/pull/116)
Head: `3bec12e`

## Regression evidence

`RootLayout`의 기존 검사는 `SessionProvider`의 직계 자식만 확인해 `children` 아래 `MainLayout`이 만든
두 번째 `<main>`을 보지 못했다. `RootLayout`과 `MainLayout`을 함께 구성하고 전체 React 트리를 재귀적으로
세는 회귀를 먼저 추가했다.

- Regression commit: `db4cc6c`
- Pre-fix command: `npm test -- --runInBand src/app/__tests__/layout.test.tsx`
- Pre-fix result: FAIL, `Expected: 1`, `Received: 2`

## Implementation

`MainLayout`의 내부 `<main className="flex-1">`을 제거하고 기존 `<div className="min-h-screen">` 래퍼와
자식 내용은 유지했다. 루트 `src/app/layout.tsx`의 `<main className="flex-1 bg-canvas">`이 애플리케이션의
유일한 main landmark가 된다. 프로필 페이지 단위 테스트는 루트 레이아웃 없이 렌더되므로 공유 셸 래퍼와
제목 관계를 검사하도록 갱신했다.

## Verification

| Command | Result |
|---|---|
| `npm test -- --runInBand src/app/__tests__/layout.test.tsx src/app/profile/__tests__/page.test.tsx` | PASS — 2 suites, 18 tests |
| `npm test -- --runInBand` | PASS — 88 suites, 834 tests |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — 34 static/dynamic routes generated; build config skips type/lint, verified separately above |

프로필 테스트에서 기존 React `act(...)` 경고가 출력되지만 테스트 실패는 아니며 이 변경이 만든 경고가
아니다.

## Not tested

- 인증된 브라우저에서 `library`, `explore`, `upload`, `sheet/[id]`, `profile`의 시각 비교
- 실제 브라우저 접근성 트리 및 axe 실행

DOM 요소 하나를 제거했지만 기존 `min-h-screen` 래퍼와 콘텐츠 구조를 유지해 시각 위험은 낮다. 다만 위
항목을 실행하기 전에는 시각적으로 완전히 동일하다고 주장하지 않는다.
