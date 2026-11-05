# HOME: 소개 영상

## Status

DONE — 2026-11-06. PR262 사용자 승인 병합·병합 후 확인·브랜치 정리 완료.

## Progress

- 구현·로컬 검증·CI·리뷰·사용자 승인 병합과 후속 확인을 마쳤다.
  [CI·리뷰·병합·정리 원본](../reviews/PR-262.md), [검증 원본](../validation/2026-11-06-home-intro-video.md).

## Objective

홈의 정적 연습 이미지와 설명을 사용자 제공 `clairkeys-demo-sound.mp4` 소개 영상으로 교체한다.

## Entry conditions

- 최신 main `d5ebd05`에서 `codex/home-intro-video` 분기.
- 사용자 승인 범위는 영상 최적화·교체·검증·PR 생성. 병합·운영 배포는 별도 승인.

## Work stages

1. 교체·수동 재생 회귀를 먼저 작성한다.
2. 웹 호환 MP4와 포스터를 만들고 네이티브 조작기를 제공한다(D-106).
3. Jest·타입·lint·변경 영역 E2E와 반응형 화면·실제 미디어 재생을 확인한다.
4. PR 생성 후 CI·리뷰를 확인하고 검증·리뷰 기록으로 인계한다.

## Completion criteria

- 기존 이미지와 설명이 사라지고 같은 위치에 28초 소개 영상이 표시된다.
- 소리를 유지하며 사용자 조작으로 재생하고 모바일에서 인라인 재생할 수 있다.
- 초기 진입 시 `preload="none"` 힌트로 미리받기 최소화를 요청하고 포스터와 고정 화면비로 표시한다.
  WebKit·Safari도 이 힌트를 무시할 수 있으므로 요청 0건은 완료 조건이 아니다(D-106의 CI 보완).
- 최적화 크기·미디어 스트림·재생 검증과 한계가 validation에 기록된다.
- 최신 head의 CI·actionable review 해소 후 사용자 병합 승인을 기다린다.

## Non-goals

앱 연습 재생기·OMR·DB 변경, 자동 재생, 운영 배포.
