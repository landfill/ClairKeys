# 레슨 목차 재시도 원인 제거 (#253)

Status: IN_PROGRESS
Date: 2026-10-11

## Objective

Chromium 계열에서 레슨 맨 아래의 현재 목차 표시 단언이 재시도로 통과하는 원인을 재현하고 제거한다. 제품 결함과 테스트 전제 오류를 구분한다.

## Work stages

1. 기존 spec 반복 실행과 위치·해시·문서 높이 계측으로 원인을 확인한다. 회귀 fixture 또는 테스트의 수정 전 실패를 기록한다.
2. 확인한 원인만 수정한다. 목차 계약 D-099, 좌표 클릭, 재생 화면 불변을 지킨다. timeout·retries 증가나 skip을 쓰지 않는다.
3. 관련 Jest·전체 Jest·타입·lint 및 Chromium/Mobile Chrome 반복 실행, Firefox 관련 spec을 검증한다.
4. PR의 전체 CI·리뷰를 확인하고 대상 spec을 CI에서 여러 번 재시도 없이 확인한다. 사용자 승인 후 병합한다.

## Completion criteria

- 원인과 수정 전 실패, 수정 후 결과가 validation에 있다.
- 기존 목차 동작 계약을 유지하고 관련 필수 검증과 PR CI가 통과한다.
- CI의 여러 실행에서 대상 테스트가 재시도 없이 통과한다.
- actionable review를 해결하고 사용자 승인으로 병합한다.

## Progress

- 2026-10-11: 사용자 착수 지시. 최신 main에서 전용 브랜치 생성. #254는 별도 브랜치·PR로 처리한다.
