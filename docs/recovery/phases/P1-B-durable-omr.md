# P1-B — Durable Queue and OMR Security

Status: `NOT_STARTED`
Depends on: P1-A

## Objective

P1-A의 canonical upload path를 재시작·수평 확장 가능한 작업 처리와 인증된 OMR 서비스 위에서 실행한다.

## In scope

- durable job payload와 state storage
- idempotency, retry, cancellation, progress contract
- Next.js-to-OMR service authentication
- file content/size limits, CORS, ownership validation
- restart and multi-worker recovery tests

## Out of scope

- 업로드 UX 또는 API 경로 재선정
- Repository/cache 구조 정리

## Work stages

1. 인메모리 queue와 status 의존을 재현 테스트로 고정한다.
2. 영속 job state와 idempotency key를 설계한다.
3. retry/cancel/progress 상태 전이를 구현한다.
4. 서비스 인증과 사용자 소유권 검증을 적용한다.
5. 파일 제한, CORS, storage visibility를 강화한다.
6. restart와 multi-worker 통합 테스트를 실행한다.

## Completion criteria

- 프로세스 재시작 후 작업 상태와 결과를 복구한다.
- 중복 요청이 의도치 않은 중복 변환을 만들지 않는다.
- 다른 사용자의 category, job, result에 접근할 수 없다.
- 인증되지 않은 고비용 OMR 요청이 거부된다.
- P1-A의 업로드 계약을 변경하지 않는다.
