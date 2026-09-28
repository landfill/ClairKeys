# Validation — #186 재생 화면 빠르기 표시 위치 (PR201)

Date: 2026-09-28 KST · Branch `codex/issue-186-tempo-overlap` · head `55d7ad9`

## 재현 (변경 전, 로컬 production 빌드, route fixture)

새 E2E `e2e/tempo-display-placement.spec.ts`, chromium. 빠르기 표시와 `playback-box`(레인·히트라인·건반)의 겹침 면적:

| 화면 | 결과 |
|---|---|
| 390×844 터치(회전) | FAIL, 25,536px² — 이슈와 같은 오른쪽 세로 띠 |
| 375×812 터치(회전) | FAIL, 25,536px² |
| 844×390 터치(가로) | FAIL, 25,536px² — 레인 윗부분 가로 띠 |
| 1280×720 | PASS(상자 위 여백에 떠 있음) |

- Jest `FallingNotesPlayer` 세션 중 빠르기 표시 배치 단언: 수정 전 FAIL(`fixed` 클래스).
- 참고: headless Chromium은 `requestFullscreen`을 허용하고, 전체 화면 요소에는 `transform: none`이 강제돼 회전이 풀린다.
  spec은 `screen.orientation.lock`을 제거해 iPhone과 같은 CSS 회전 경로를 쓰고, 회전 여부(`body.playback-rotated`)를 단언한다.

## 로컬 검증 (`55d7ad9`)

| 검사 | 결과 |
|---|---|
| 새 E2E, 전 프로젝트 | 17 pass / 3 skip(Firefox는 모바일 에뮬레이션 없음) |
| 관련 재생 E2E 12 spec, chromium·Mobile Chrome·Mobile Safari | 80 pass / 22 skip — 모두 기존 조건부 skip(터치 전용·PC 전용·키보드 없음 등) |
| 전체 Jest (uv py3.10 venv) | 1268/1268 |
| tsc `--noEmit --incremental false` / lint | PASS |

## 레인·건반 높이 (변경 전 → 후, px, 같은 fixture)

| 화면 | 상자 | 레인 | 건반 |
|---|---|---|---|
| 390×844 회전 | 326 → 314 | 172 → 160 | 152 → 152 |
| 375×812 회전 | 311 → 299 | 154 → 142 | 155 → 155 |
| 667×375 터치 가로 | 330 → 299 | 173 → 142 | 155 → 155 |
| 844×390 터치 가로 | 329 → 314 | 175 → 160 | 152 → 152 |
| 320×800 / 1280×720 / 1440×900 | 불변 | 불변 | 불변 |

- 변경 전 667×375·844×390은 상자가 뷰포트보다 커서 페이지가 19px·3px 넘쳤다(`min-h` 고정점). 변경 후 PC 844×390 `scrollHeight`
  390 = 뷰포트, 재생·일시정지 중 스크롤 0.
- 첫 구현(루트 `min-h` 유지)에서는 PC 844×390이 15px 넘쳐 `playback-session-transition`의 전송 버튼 위치 비교가 실패했다.
  루트 높이 고정 후 통과. 측정 스크립트는 세션 scratchpad에만 있었다(저장소에 두지 않음).

## 미검증

- 실기기(iPhone·Android)의 실제 회전·주소창 변화. 운영 `/sheet/92` 확인은 병합·배포 후.
