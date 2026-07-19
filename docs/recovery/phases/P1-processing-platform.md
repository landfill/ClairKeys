# P1 — Processing Platform

Status: `NOT_STARTED`
Depends on: P0-A, P0-B, P0-C, P0-D

## Objective

중복 업로드 경로를 하나의 검증된 OMR 흐름으로 통합하고 재시작 가능한 처리 플랫폼을 만든다.

## Work stages

1. 네 업로드 경로의 사용자·운영 요구를 비교하고 canonical path를 선택한다.
2. deprecated 경로의 호출자를 제거하거나 명시적 demo 기능으로 격리한다.
3. 파일 버퍼와 job state를 프로세스 메모리에서 제거한다.
4. idempotency, retry, cancellation, progress 계약을 정의한다.
5. Next.js→OMR 서비스 인증과 request ownership을 적용한다.
6. 파일 내용·크기 제한, CORS, storage visibility를 강화한다.
7. 재시작과 다중 worker 통합 테스트를 추가한다.

## Completion criteria

- 동일 파일이 의도치 않게 중복 처리되지 않는다.
- 프로세스 재시작 후 작업 상태를 복구한다.
- 다른 사용자의 category/job/result에 접근할 수 없다.
- OMR endpoint는 인증되지 않은 고비용 요청을 거부한다.
