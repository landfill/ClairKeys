# 재생 모드 UI의 기능적 의미와 제거 근거

Date: 2026-09-22 KST
PR: https://github.com/landfill/ClairKeys/pull/184
Branch/head: `codex/playback-hide-inert-modes` / `a329dcd`
Decision: D-079 (same PR branch)

## 사용자 주석과 재현

운영 `/sheet/92`의 `전체 설정`에는 `🎵 듣기`, `🎹 따라하기`, `📚 연습 가이드`
선택과 `⏸️ 일시정지` 상태 문구가 있었다. 직접 다른 옵션을 선택해도 controlled
select가 `듣기`로 되돌아갔다. `FallingNotesPlayer`는 `listen`으로 고정하고
mode handler는 로그만 남겼다. 아래 상태는 버튼이 아니며 위에 실제 일시정지
버튼이 별도로 있다. 사용자는 이것이 특정 악보 문제가 아니라 기능 차이를
제공하지 못하는 공통 UI 문제라고 정정했다.

`AnimationPlayer`/`AdvancedPlaybackControls`에는 별도 mode props/handler가
있지만 앱 라우트에서 mount하는 사용처는 없고 export/LazyComponent 선언만 있다.
레거시 엔진을 새 기능으로 연결하거나 데이터 정확도를 암묵적으로 약속하지 않는다.

## 회귀 근거와 변경

`src/components/playback/__tests__/PlaybackControls.test.tsx`에서 공통 컨트롤에
모드 핸들러가 있어도 설정 UI가 없어야 한다는 테스트를 먼저 추가했다. 변경 전
**1 fail / 6 pass**: `전체 설정`이 남았다. 이후 공유 PlaybackControls의
해당 `<details>`와 미사용 mode props, 현재 FallingNotesPlayer의 로그-only
handler를 제거했다. 상단 재생/일시정지/중지, 속도, A-B, 별도 음량, 샘플 준비
live status, 키보드 단축키와 엔진 코드는 보존한다.

## 검증

- `npm run lint`: PASS, 경고0. `npx tsc --noEmit`: PASS.
- `npm run build`: PASS. 이 빌드는 type/lint 검사를 생략하므로 별도 실행했다.
- `PYTHON_BIN=/private/tmp/clairkeys-ui-python312/bin/python npm test -- --runInBand --silent`:
  **114 suites / 1101 tests PASS**. 저장소의 CI Python requirements를 사용한 격리 환경.
- `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000 npx playwright test
  e2e/playback-mode-clarity.spec.ts --project=chromium --project=firefox --project=webkit
  --project='Mobile Chrome' --project='Mobile Safari' --reporter=line`: **5/5 PASS**.
  공개 악보 fixture에서 설정/모드/중복 일시정지 DOM 0, 실제 transport·속도·음량
  접근 가능. [PC 화면](assets/playback-modes/desktop.png)과
  [모바일 화면](assets/playback-modes/mobile.png)을 열어 잘림/겹침을 확인했다.
- API, 오디오, MusicXML/노트, 데이터 저장은 변경하지 않았다. #177 PR183의 악보 높이
  코드는 이 브랜치에 없다.

## 남은 한계

PR184 Vercel 공개 preview `/sheet/92`에서 데스크톱 기본 viewport와 390×844 모바일을 실제 확인했다. 공통 설정·mode 선택·중복 pause 문구는 없고 상단 Play/Pause/Stop, 속도 및 음량이 보인다. 게스트 상태는 짧은 미리보기이므로 로그인한 전체 곡 재생을 검증한 것으로 보지 않는다. PR head `a329dcd`의 build/lint/type/unit/security/Vercel 및 두 E2E workflow는 모두 PASS, PR Checks All Checks Complete도 PASS다. Codex의 Lore trailer 누락 지적은 실제 commit `a329dcd`의 필수 `Confidence`/`Scope-risk` trailer와 본문에 반하므로 근거 댓글로 회신했다.

실제 운영 배포는 승인 전 하지 않는다. 물리 MIDI 건반 입력·실기기 스크린리더
출력은 이 UI 제거의 기능 검증으로 주장하지 않는다.

## PR183 병합 후 결합 검증

사용자 병합 승인에 따라 PR183을 먼저 `4803bba`에 병합했다. 겹치는
`FallingNotesPlayer.tsx`가 있는 PR184에 새 main을 merge한 `be68745`에서
`npx tsc --noEmit` PASS, `npm run lint` 경고0,
`npx jest src/utils/__tests__/playbackGeometry.test.ts src/components/playback/__tests__/PlaybackControls.test.tsx --runInBand --silent`
26/26 PASS. `NEXTAUTH_SECRET=local-e2e-test-secret NEXTAUTH_URL=http://localhost:3000
npx playwright test e2e/score-height-responsive.spec.ts e2e/playback-mode-clarity.spec.ts
--project=chromium --project=firefox --project=webkit --project='Mobile Chrome'
--project='Mobile Safari' --reporter=line`은 **20 PASS, PC 전용 10 SKIP**.
새 head의 hosted CI·재리뷰가 끝나기 전에는 병합하지 않는다.
