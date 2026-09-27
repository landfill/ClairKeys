# Validation — 재생 키보드 단축키 (PR190)

Date: 2026-09-27 KST
Branch/head: `codex/feat-playback-shortcuts` / `a77c7cd`
Phase: [FEAT-playback-shortcuts](../phases/FEAT-playback-shortcuts.md), decision D-081

## 재현 테스트 (구현 전 실패)

- `src/hooks/__tests__/usePlaybackShortcuts.test.tsx`: 모듈 없음으로 suite fail.
- `FallingNotesPlayer.test.tsx` `keyboard shortcuts`: 3 fail(Space 재생, Space 일시정지, 안내). 로딩 중 미시작
  테스트는 단축키가 없어서 우연히 통과했으며, 구현 후에도 통과를 유지한다.

## 구현 후

| 명령 | 결과 |
|---|---|
| `npx jest src/components/animation src/hooks` | 142/142 pass |
| `PATH=<py3.10 venv>/bin:$PATH npx jest` | 1115/1115 pass |
| `npx tsc --noEmit`, `npm run lint`, `npm run build` | PASS |
| `npx playwright test e2e/playback-shortcuts.spec.ts e2e/playback-session-transition.spec.ts e2e/playback-mode-clarity.spec.ts` | 41 pass / 4 skip(Mobile Chrome·Safari: 물리 키보드 없음) |

- E2E는 Space가 페이지를 스크롤하지 않는 것, ←/→ 5초 이동, 포커스된 select의 방향키와 포커스된 `중지` 버튼의
  Space가 재생을 시작하지 않는 것을 실제 브라우저에서 확인한다.
- 이 실행은 이전 서버가 없는 상태에서 Playwright가 새로 띄운 서버로 수행했다.

## 미검증

- 휴대폰·태블릿에 연결한 물리 키보드.
- PR189와 같은 파일을 수정하므로 먼저 병합되는 쪽 이후 main 병합·충돌 해결과 재검증이 필요하다.
