# Validation — 한 손 연습 (PR191)

Date: 2026-09-27 KST · Branch `codex/feat-hand-practice` · heads `2955979` → `d6d1752` → `00486e5`

| 단계 | 명령 | 결과 |
|---|---|---|
| 선실패 | handPractice / FallingNotes / 훅 audible notes / 플레이어 UI 테스트 | 모듈 없음 + 3·2 fail |
| 구현 후 | `PATH=<py3.10 venv>/bin:$PATH npx jest` | 1117/1117 |
| | `npx tsc --noEmit`, `npm run lint`, `npm run build` | PASS |
| | Playwright hand-practice + playback specs | 40/40 (5 projects) |
| 화면 | 로컬 build + fixture PC 1440·모바일 390 캡처 | 오른손 선택, 왼손 흐림·운지 제거 확인 |
| 리뷰 수정 `00486e5` | 추정 손·악보 운지·대기 중 변경 테스트 선실패 → utils/animation/hooks 통과, tsc/lint, Playwright hand-practice+score-panel 21 pass / 8 기존 skip | PASS |

미검증: 다른 손 소리를 끈 실제 청취, 재생 중 손 전환(미제공).
