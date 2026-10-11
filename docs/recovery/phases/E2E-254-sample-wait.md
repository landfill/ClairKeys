# Mobile Safari 샘플 대기 화면 재시도 원인 제거 (#254)

Status: IN_PROGRESS
Date: 2026-10-11

## Objective

worker 2개의 Linux CI에서 샘플 대기 중 재생 버튼의 viewport 단언이 재시도로 통과하는 원인을 확인하고 제거한다. 실제 화면 밖 이동과 테스트 타이밍 오류를 구분한다.

## Work stages

1. macOS 반복과 Linux CI 좌표·visual viewport·IntersectionObserver 계측으로 재현한다. 필요하면 이 브랜치 전용 임시 측정 워크플로를 사용하고 최종 PR 전에 제거한다.
2. 회귀 fixture 또는 테스트의 수정 전 실패를 기록한 다음 원인만 고친다. 대기 시간을 추측으로 늘리거나 retries·skip·worker 1로 덮지 않는다.
3. 관련 테스트·전체 Jest·타입·lint, 필요한 WebKit/Mobile Safari·Chromium spec을 확인한다.
4. 최종 PR CI·리뷰와 여러 CI 실행에서 재시도 없는 통과를 확인한다. 사용자 승인 후 병합한다.

## Completion criteria

- 제품 결함인지 테스트 전제 문제인지 계측과 수정 전 재현으로 구분된다.
- 대기 안내·샘플 사전 요청·재생 시작의 계약과 요소 수 27을 유지한다.
- 필수 검증·CI 통과, 여러 CI 실행에서 대상 테스트 재시도 없음, actionable review 해결.
- 사용자 승인 후 병합. 임시 측정 코드·워크플로는 최종 변경에 남기지 않는다.

## Progress

- 2026-10-11: 사용자 착수 지시. macOS Mobile Safari 기본 반복 5회와 worker 4 반복 20회는 모두 통과했다. Linux CI 계측을 진행한다.
