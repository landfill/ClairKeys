# FEAT — 악보 재생 키보드 단축키

Status: `IN_PROGRESS` — branch `codex/feat-playback-shortcuts`.
Base: 2026-09-27 main `8563266`.

## Objective

2026-09-27 운영 점검에서 `/sheet/[id]` 재생 화면에 키보드 단축키가 없음을 확인했다(재생 위치 막대의
방향키만 동작). 연습 중 손을 건반에서 떼지 않고 재생·일시정지·짧은 되감기를 할 수 있도록
페이지 단위 단축키를 추가한다. D-079가 범위 밖으로 둔 항목을 별도 기능으로 다룬다.

## Work stages

1. 단축키 판정(`resolvePlaybackShortcut`)과 훅의 포커스 규칙 테스트, 플레이어 통합 테스트를 먼저 실패시킨다.
2. `usePlaybackShortcuts`를 추가하고 `FallingNotesPlayer`에 연결한다. 레거시 `useKeyboardShortcuts`
   (레거시 `AnimationPlayer` 전용)는 바꾸지 않는다.
3. 재생 준비 화면에 키보드 사용자용 안내를 둔다(터치 기기 `pointer: coarse`에서만 숨김. 키보드 전용 PC는
   `pointer: none`이므로 표시한다).
4. 실제 브라우저 E2E로 스크롤 방지와 포커스된 컨트롤의 키 보존을 확인한다.

## Completion criteria

- 포커스가 페이지(본문)에 있을 때 Space는 재생/일시정지, ←/→는 5초 이동(곡 범위로 제한)한다.
- 버튼·링크·입력·select·슬라이더 등 포커스된 컨트롤의 키를 가로채지 않고, 다른 핸들러가
  `preventDefault`한 키, 수정키 조합, Space 자동 반복은 무시한다. 샘플 로딩 중에는 재생 버튼처럼 시작하지 않는다.
- 단축키 재생은 재생 버튼과 같은 `handlePlay` 경로로 방향 전환 요청을 유지한다.
- 관련 unit/E2E·타입·lint·build 통과, non-draft PR과 CI·리뷰 처리. 사용자 승인 전 병합하지 않는다.

## Out of scope

속도·A-B·정지 단축키, 단축키 사용자 지정, 모바일 외장 키보드 전용 동작.
