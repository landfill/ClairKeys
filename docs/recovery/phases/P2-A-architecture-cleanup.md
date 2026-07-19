# P2-A — Architecture Cleanup

Status: `NOT_STARTED`
Depends on: P1

## Objective

검증된 동작을 유지하면서 중복 구현과 중간 상태 리팩터링을 제거한다.

## Preconditions

- P0/P1 동작이 회귀 테스트로 보호된다.
- 삭제 대상의 실제 호출자를 검색하고 기록한다.

## Work stages

1. Prisma client wrapper를 하나로 통합한다.
2. cache와 queue 구현을 각각 하나의 책임 경계로 통합한다.
3. 사용되지 않는 Repository/Refactored 계층을 삭제하거나 완전히 채택한다.
4. Next config를 하나로 통합한다.
5. demo/test 페이지와 운영 페이지를 분리한다.
6. README, 환경 변수, CI 문서를 실제 구현과 맞춘다.

## Completion criteria

- 중복 경로가 제거되고 새 추상화는 추가되지 않는다.
- 보호된 테스트의 동작이 유지된다.
- 타입, lint, unit, integration, build가 통과한다.
