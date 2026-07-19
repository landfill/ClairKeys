# P1-A — Upload Pipeline Consolidation

Status: `NOT_STARTED`
Depends on: P0-A, P0-B, P0-C, P0-D

## Objective

즉시, background, real-time async, external OMR 경로를 비교해 검증된 하나의 운영 경로로 통합한다.

## In scope

- 네 업로드 UI와 API 호출자 목록
- 실제 OMR과 demo/fallback 동작의 명시적 분리
- canonical upload API와 status contract
- 기존 데이터와 클라이언트의 migration 경로
- deprecated endpoint 제거 또는 격리

## Out of scope

- 영속 queue 구현
- OMR 서비스 인증과 네트워크 보안
- process restart recovery

## Work stages

1. 각 경로의 기능·호출자·결과 계약을 fixture로 고정한다.
2. canonical path 선택 결정과 migration 계획을 기록한다.
3. UI와 API 호출자를 canonical path로 이동한다.
4. demo 기능은 실제 변환 성공과 구분되는 상태로 격리한다.
5. 더 이상 호출되지 않는 경로를 제거한다.

## Completion criteria

- 운영 업로드가 하나의 API와 상태 계약을 사용한다.
- demo 결과가 실제 OMR 성공으로 저장되지 않는다.
- 기존 사용자 데이터와 지원 클라이언트 migration이 검증된다.
- P1-B가 사용할 queue/auth 경계가 문서화된다.
