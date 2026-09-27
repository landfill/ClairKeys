# Validation — 기다리기 모드 (PR195)

Date: 2026-09-27 KST · Branch `codex/feat-wait-mode-midi` · head `d270c8a`

| 단계 | 명령 | 결과 |
|---|---|---|
| 선실패 | waitSteps·parseNoteOn / useMidiInput / 화면 건반 입력 / playNoteNow / 훅 대기 4건 / 플레이어 UI 3건 | 모듈 없음 + 각 fail |
| 구현 후 | `PATH=<py3.10 venv>/bin:$PATH npx jest` | 1126/1126 |
| | `npx tsc --noEmit`, `npm run lint`, `npm run build` | PASS |
| | Playwright wait-mode-midi(가짜 Web MIDI 입력·화면 건반) + playback specs | 45/45 (5 projects) |
| 화면 | 로컬 build PC 1440 캡처 | 설정 화면 MIDI 연결 문구, 대기 중 남은 건반만 강조·안내 pill |

미검증: 실제 MIDI 피아노, Chrome의 실제 MIDI 권한 팝업, 모바일 회전 화면에서 실제 손가락 터치, 한 손 연습과 결합.
