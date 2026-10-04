# Validation — #229 도달하지 않는 `AnimationPlayer`·`PracticeGuideControls` 정리

Date: 2026-10-04 KST
Branch/commit: `codex/issue-229-unused-animation-player` / `36b4efa`
Environment: macOS, production 빌드(`npm run build && npm start`), `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, Playwright 1.57.0.

## Claim being verified

`AnimationPlayer`와 그것만 쓰던 코드는 `src/app`의 어느 라우트에서도 도달하지 않으며, 지워도 재생 화면(`FallingNotesPlayer`)의 동작과 요소 수가 바뀌지 않는다.

## 어디에서도 import하지 않음의 근거 (main `3bcffa7`에서 `grep -rnwE` over `src`, `e2e`)

| 지운 것 | 지우기 전 참조(자기 자신·자기 테스트 제외) |
|---|---|
| `src/components/animation/AnimationPlayer.tsx` | `animation/index.ts`의 re-export, `ui/LazyComponent.tsx`의 `LazyAnimationPlayer`. 둘 다 import하는 곳이 없다 |
| `src/components/animation/index.ts` | `AnimationPlayer`만 내보냈다. `@/components/animation` barrel을 import하는 곳 0 (`FallingNotesPlayer`는 파일 경로로 import된다) |
| `LazyAnimationPlayer` (`ui/LazyComponent.tsx`의 한 항목) | 참조 0 |
| `src/components/practice/PracticeGuideControls.tsx` | `AnimationPlayer`만 |
| `src/components/practice/PracticeKeyHighlight.tsx` | `AnimationPlayer`만 |
| `src/components/practice/index.ts` | `AnimationPlayer`와 그 테스트의 mock만 |
| `src/hooks/useKeyboardShortcuts.ts` | `AnimationPlayer`와 그 테스트의 mock만. 재생 화면 단축키는 이 훅을 쓰지 않는다(`e2e/playback-shortcuts.spec.ts` 통과) |
| `src/components/animation/__tests__/AnimationPlayer.test.tsx` | 아래 "테스트 이동" 참조 |

`AnimationPlayer`가 쓰던 것 중 남긴 것(다른 사용처가 있다): `PlaybackControls`·`TempoDisplay`(`FallingNotesPlayer`), `createLoopSection`(`useFallingNotesPlayer`),
`getTempoDisplay`(`TempoDisplay`, `lib/learn/songIntro.ts`), `PracticeState` 타입(`services/animationEngine.ts`).

## 테스트 이동

지운 테스트 파일의 7건 중 5건은 `AnimationPlayer`가 아니라 `getTempoDisplay`(남는 코드)의 단위 테스트였고, 이 함수를 직접 검증하는 테스트는 그 파일뿐이었다.
5건을 `src/utils/__tests__/tempoDisplay.test.ts`로 그대로 옮겼다. 나머지 2건(`AnimationPlayer` 렌더, throttled 콜백)은 컴포넌트와 함께 지웠다.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| `PATH=<ci-venv>/bin:$PATH npx jest` | PASS | 154 suites, 1531 tests. main은 154 suites, 1533 tests([#222 기록](2026-10-04-issue-222-console-quiet-flake.md)): 파일 1개 삭제·1개 추가, 테스트 −7 +5 |
| `npx tsc --noEmit --incremental false` | PASS | exit 0 |
| `npm run lint` | PASS | no warnings or errors |
| `npx playwright test e2e/playback-{element-count,shortcuts,controls-responsive,mode-clarity,note-names,session-transition}.spec.ts --project=chromium` | PASS | 17 passed, 1 skipped. `playback-element-count`의 기준 단언 통과 |

## P2-A와의 범위

[P2-A](../phases/P2-A-architecture-cleanup.md)의 단계는 Prisma wrapper, cache·queue, Repository/Refactored 계층, Next config, demo/test 페이지, 문서다. 재생 컴포넌트는 없어 겹치지 않는다.

## Gaps and risks

- 다른 브라우저와 production build 전체는 PR CI에 맡긴다.
- 이번에 지우지 않은 도달 불가 코드(범위 밖, 후속 후보): `src/services/animationEngine.ts`와 `src/hooks/useAnimationEngine.ts`는 이제 자기 테스트에서만 참조된다
  (`AnimationPlayer`는 훅이 아니라 `getAnimationEngine`을 직접 썼다). `ui/LazyComponent.tsx`는 파일 전체를 import하는 곳이 없다.
  `docs/limitations.md`의 미구현 표에서 `AnimationPlayer` 행을 `AnimationEngine` 행으로 바꿨다.
- 정적 문자열 검색에 의존한다. 문자열로 조립한 동적 import는 찾지 못하지만, `src`에서 `AnimationPlayer`를 가리키던 동적 import는 `LazyComponent`의 한 곳뿐이었고 tsc와 production 빌드가 통과했다.
