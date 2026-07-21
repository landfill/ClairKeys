# P0-C — Playback Synchronization

Status: `IN_PROGRESS` (Work stages 1–3 DONE via PR #19, merged at `47e30af`; stages 4–5 `NOT_STARTED`)
Depends on: P0-A, P0-B (Work stages 1–3 landed early per D-007 — issue #18 is a live playback defect independent of the animation contract; stages 4–5 still depend on P0-A/P0-B)

## Objective

canonical timeline의 음표와 falling-note 시각화가 짧은 곡과 긴 곡 모두에서 같은 AudioContext 시계를 따른다.

## Work stages

1. 현재 10초 스케줄 제한 재현 테스트를 추가한다.
2. rolling look-ahead scheduler와 안전한 voice cleanup을 구현한다.
3. play/pause/stop/seek/speed-change 상태 전이를 통합한다.
4. 시각화와 키 활성화가 동일 current time을 사용하도록 고정한다.
5. 1분·5분 재생 시뮬레이션으로 누적 drift를 측정한다.

## Completion criteria

- 10초 이후 음표가 정상 재생된다.
- seek와 속도 변경 후 중복·누락 음표가 없다.
- 정의된 장시간 drift 허용치를 만족한다.
- AudioContext가 unavailable/suspended인 상태를 테스트한다.
