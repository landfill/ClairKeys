# Validation — 메트로놈·준비 박자 (PR192)

Date: 2026-09-27 KST · Branch `codex/feat-metronome-count-in` · heads `4390d9e` → `545bf41`

| 단계 | 명령 | 결과 |
|---|---|---|
| 선실패 | beatGrid / 오디오 클릭 / 훅 준비 박자·메트로놈 / 플레이어 UI | 모듈 없음 + 4·3·4 fail |
| 구현 후 | `PATH=<py3.10 venv>/bin:$PATH npx jest` | 1130/1130 |
| | `npx tsc --noEmit`, `npm run lint`, `npm run build` | PASS |
| | Playwright metronome-count-in(`OscillatorNode.start` 계측, 악보 map 경로 포함) + playback + score specs | 86 pass / 18 기존 skip |
| 리뷰 수정 `545bf41` | 준비 박자 겹침·마디 안 템포 변화·대기 중 격자 테스트 선실패 → 157/157, tsc/lint, Playwright metronome 20/20 | PASS |

미검증: 클릭의 실제 청취 레벨(사용자 청취 판단 불가 — 메모리 참조), `<offset>` 전용 템포 표기, map 없는 score 출처 곡을
템포 변화 뒤에서 재개할 때 준비 박자 빠르기.
