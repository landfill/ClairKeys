# P1-B — Durable Queue and OMR Security

Status: `NOT_STARTED`
Depends on: P1-A

Progress (2026-08-28): 이 phase는 아직 착수하지 않았다. 다만 인접한 결함 하나가 별도로 처리됐다 —
이슈 #55(화면 이탈 시 결과 유실)가 D-018의 생산자 소유 콜백으로 해소되어 2026-08-28 종단
확인까지 마쳤다. **이를 Work stages 1~3의 착수로 읽지 않는다.** job 상태와 전달 재시도는 여전히
OMR 프로세스 메모리에 있고, 재시작 복구·영속 idempotency key는 손대지 않았다. 근거:
`docs/recovery/validation/2026-08-28-issue-55-page-leave-end-to-end.md`, D-018.

Progress (2026-08-29): 사용자가 P1-B 전체를 후순위로 두고 이슈 #70만 분리하도록 지시했다. PR
[#85](https://github.com/landfill/ClairKeys/pull/85)는 `omrJobId` nullable unique/index와 finalize
`findUnique`만 다룬다. 이는 callback 대상의 DB 무결성·성능을 보완하지만 durable queue work stages
1–6에는 착수하지 않는다. 따라서 Status는 `NOT_STARTED`를 유지한다.

Progress (2026-08-29): PR #85가 `5e36bbe`으로 병합됐고 운영 unique-index migration도 코드 배포 전에
적용·검증됐다. 이슈 #70은 닫았고 로컬·원격 작업 브랜치도 정리됐다. 이는 P1-B work stages 1–6의
진척이 아니므로 Status는 계속 `NOT_STARTED`다.

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
- 허용하지 않은 파일 content/type과 크기 제한 초과 요청이 경계 테스트에서 거부된다.
- 허용된 origin만 CORS를 통과하며 원본·중간·결과 storage의 visibility가 사용자와 서비스 권한으로 제한됨을 검증한다.
- retry, cancellation, progress 상태 전이가 영속화되고 재시작·다중 worker 통합 테스트에서 유실되거나 역행하지 않는다.
- P1-A의 업로드 계약을 변경하지 않는다.
