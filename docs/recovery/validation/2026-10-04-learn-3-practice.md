# Validation — LEARN L-3 재생 화면 설명 이동과 계이름 표시 토글 (#212)

Date: 2026-10-04 KST
Branch/commits: `codex/learn-3-practice` — `93edb5c`(측정 spec), `c4c239b`(설명 이동·`/learn/practice`), `87cf076`(main 병합), `bd4dcf8`(계이름 토글),
`569dfb4`(리뷰 수정·측정 단위 교체), `3b6017e`(D-094 6)
Environment: macOS, production 빌드, `NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://localhost:3000`, Jest의 OMR 회귀는 기존 `ci-venv`.

## Claim being verified

재생 화면의 "연습 방법" 목록과 단축키 안내가 `/learn/practice`로 옮겨지고 재생 전에만 도움말 링크 하나가 남는다. 계이름 표시 설정(기본 꺼짐)이
재생 전 설정에만 있고, 켜면 건반 안에 계이름이 그려지며 레인을 가리지 않는다. 재생 중·일시정지의 조작 요소와 설명 텍스트는 늘지 않는다.

## 재생 화면 요소 수 (D-094 3·6)

측정: `e2e/playback-element-count.spec.ts`. 세는 단위는 spec 맨 위 주석이 원본이다. 요약: 재생 화면 루트 안에서 뷰포트에 보이는
`controls`(button, a[href], input, select, textarea, slider·switch·checkbox·tab 역할, summary)와 `textBlocks`(글자를 직접 가진 요소. 컨트롤·label·option·
건반·낙하 그림·`aria-hidden` 안은 제외). 건반 안의 표시는 `keyMarks`로 종류별(계이름·옥타브 표식·운지)로 따로 센다. 스크롤해야 보이는 것은 `belowFold`.
환경: 데스크톱 chromium 1280×720, 터치 Mobile Chrome 393×727. fixture: 양손 12음, 운지 포함, 악보 패널 없음.

변경 전은 L-3 이전 커밋 `9d18ce2`의 제품 코드에 같은 spec을 `ELEMENT_COUNT_MEASURE_ONLY=1`로 돌린 값이다(임시 워크트리). 변경 후는 `569dfb4`.
표기 `controls / textBlocks`, 재생 전은 화면 아래 포함 합계.

| 환경 | 상태 | 변경 전 | 변경 후(계이름 꺼짐) | 변경 후(계이름 켜짐) |
|---|---|---|---|---|
| 데스크톱 | 재생 전 | 14 / 17 (합 31) | 16 / 10 (합 26) | 16 / 10 (합 26) |
| 데스크톱 | 재생 중 | 8 / 3 | 8 / 3 | 8 / 3 |
| 데스크톱 | 일시정지 | 8 / 3 | 8 / 3 | 8 / 3 |
| 터치 | 재생 전 | 14 / 13 (합 27, 그중 화면 아래 8) | 합 26 (보이는 것 16 / 7, 화면 아래 3) | 합 26 |
| 터치 | 재생 중 | 7 / 1 | 7 / 1 | 7 / 1 |
| 터치 | 일시정지 | 7 / 1 | 7 / 1 | 7 / 1 |

건반 안의 표시(재생 중·일시정지. 재생 전에는 건반이 화면 아래라 0):

| 환경 | 변경 전 | 꺼짐 | 켜짐 |
|---|---|---|---|
| 데스크톱 | 옥타브 표식 7 | 옥타브 표식 7 | 계이름 50, 옥타브 표식 0 |
| 터치 | 옥타브 표식 2 | 옥타브 표식 2 | 계이름 16, 옥타브 표식 0 |

- 새 요소와 보이는 상태: 도움말 링크(`연습 방법과 단축키 보기`)와 계이름 체크박스는 **재생 전에만** 보인다. 재생 중·일시정지에 더한 조작 요소·설명 텍스트는 없다.
- 재생 전 감소분: 연습 방법 3줄, 단축키 안내(문단 1 + `kbd` 3) 제거. 증가분: 링크 1, 체크박스 1.
- 재생 중에 늘어나는 것은 사용자가 계이름을 켰을 때의 건반 표시뿐이다(데스크톱 7→50, 터치 2→16). 지운 설명은 원래 재생 중 숨겨져 있어 이를 상쇄하지 않는다.
  D-094 6에 따라 상쇄하지 않고 이 숫자를 기록한다. 기본값(꺼짐)의 재생 화면은 변경 전과 같다.
- 재생 중 textBlocks 데스크톱 3: 시간 표시 `0:01 / 0:23`, 음량 `78%`, 빠르기 표시. 터치 1: 빠르기 표시.

### 측정 단위를 바꾼 이력

처음 단위(`93edb5c`·`c4c239b`)는 textBlocks를 태그 목록(`p, li, h1~h6 …`)으로 세어 `div`·`span` 안내를 빠뜨렸다. 재생 중 빠르기 표시가 0으로 세어졌고
(당시 기록: 재생 중 8/0, 7/0), 새 `div` 안내를 추가해도 단언이 통과했다. 로컬 리뷰가 찾았다. 위 표가 그 값을 대체한다.
spec은 이제 일부러 더한 `div`로 textBlocks가 1 늘어나는지, 루트·제외 선택자가 기대한 수의 요소를 잡는지 스스로 확인하고, 기준값이 없으면 실패한다.

## Commands and results

구현은 Codex `gpt-6.1-sol`(Orca 터미널). E2E와 측정은 Claude가 실행했다(Codex 샌드박스는 포트를 열 수 없다).

| Command | Result | Evidence |
|---|---|---|
| 각 단계 구현 전 Jest (Codex) | FAIL (의도) | 설명 이동 5개, 계이름 렌더·토글·SSR, 리뷰 수정 2개 실패 확인 |
| `PATH=<ci-venv>/bin:$PATH npx jest` (최종 `569dfb4`) | PASS | 138 suites, 1422 tests |
| `npx tsc --noEmit --incremental false`, `npm run lint` | PASS | exit 0, no warnings |
| `npx playwright test` note-names, element-count, learn-practice, learn-keyboard, learn-home, console-quiet, playback-shortcuts, application-smoke, playback-controls-responsive, playback-mode-clarity, playback-session-transition, hand-practice, wait-mode-midi `--project=chromium --project="Mobile Chrome"` | PASS | 89 passed, 3 skipped(터치 프로젝트의 물리 키보드 테스트) |
| `ELEMENT_COUNT_MEASURE_ONLY=1` 기준 측정(`9d18ce2`) | PASS | 2 passed, 위 "변경 전" 열 |

`playback-note-names.spec.ts`가 고정하는 것: 기본 꺼짐, 켜면 표시, 새로고침 후 유지, `localStorage.setItem`이 던져도 켜고 끔, 재생 중 표시와 진행,
기다리기 모드의 화면 건반 클릭 유지, 844×390·390×844에서 토글 전후 건반·낙하 영역 boundingBox 동일과 표시가 건반 상자 안에 있음.

## 화면 확인 (chromium 스크린샷, 계이름 켜짐)

1280×720 재생 전·재생 중, 390×844 재생 중, 844×390 재생 중. 계이름이 흰 건반 안쪽 아래에만 있고 레인과 건반 위 선을 가리지 않는다.
가운데 도는 강조색·굵기·밑줄. 폰에서는 보이는 범위가 좁아 건반 폭이 넉넉해 모든 흰 건반에 표시된다.

## E2E 실패 이력

설명 이동 1차 실행 54 passed / 5 failed, 모두 테스트 결함: `learn-practice`가 h2를 페이지 전체에서 세어 푸터 제목 포함(4건),
`playback-shortcuts`에 지운 안내의 가시성 단언 잔존(1건). 수정 후 통과.

## main 병합 (`87cf076`)

PR218 병합 후 main을 브랜치에 병합. 충돌 5개(모두 `available` 사실에 묶인 테스트): 건반·연습 방법 2개 공개, 악보 읽기·손 준비 중으로 해소.

## 로컬 리뷰 (Codex `gpt-6-astra` high, read-only, Orca 터미널, 대상 `bd4dcf8`)

| # | Finding | State | Handling |
|---|---|---|---|
| 1 | P2: 측정 spec이 `div`·`span` 안내를 빠뜨려 재생 중 설명 추가를 막지 못함 | FIXED | `569dfb4`: 단위 교체, 계측 자기 검증, 기준 재측정 |
| 2 | P2: 계이름 표시의 D-094 상쇄 근거 없음, 옥타브 표식 대체 효과 미비교 | FIXED | `569dfb4` keyMarks 종류별 계측, `3b6017e` D-094 6 |
| 3 | P2: 기다리기 모드에서 준비 박자·자동 음표·메트로놈이 나오지 않는다는 예외가 레슨에 없음 | FIXED | `569dfb4` |
| 4 | P3: "터치 기기에는 단축키가 없다"는 부정확(물리 키보드 연결 시 동작) | FIXED | `569dfb4` |

설정 복원·저장 실패 처리, 임계값 18/14, 표시의 입력 통과, 상수 이동, 병합 테스트에서는 결함 없음.

## 결정·제약

- 계이름 설정은 재생 중에 바꿀 수 없다(정지 후 변경). 재생 중 조작 요소를 늘리지 않기 위해서다.
- 폭 임계: 흰 건반 18px 이상 전부, 14~18px 도만, 미만은 가운데 도 표식만. 저장 키 `clairkeys.noteNames`.
- 정리 후보 `PracticeGuideControls`는 [phase](../phases/LEARN-beginner-learning.md) Progress에 기록. 이번 범위에서 지우지 않았다.

## Gaps and risks

- Firefox·WebKit·Mobile Safari E2E는 PR CI에 맡긴다(D-088).
- 실기기 회전, Safari 비공개 모드 저장, 스크린리더는 확인하지 않았다. 회전은 뷰포트 844×390 에뮬레이션이다.
- 리뷰 수정 커밋(`569dfb4`, `3b6017e`)은 로컬 재리뷰를 하지 않았다.
- 악보 패널을 켠 상태(운지 표시가 건반에 그려지는 경우)는 측정 fixture에 없다. 계이름과 운지의 겹침은 Jest와 구현 배치(하단 4px·20px)로만 확인했다.
