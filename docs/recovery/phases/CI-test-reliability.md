# CI 검사 신뢰성: 간헐 실패 테스트와 E2E 시간 상한

Status: DONE
Date: 2026-09-30

## Objective

검사 결과가 코드가 아니라 러너 상태에 따라 달라지거나, 멈춘 검사가 결과 없이 러너를 오래 붙잡는 두 문제를 없앤다.
검사 기준(무엇을 통과해야 병합되는가)은 바꾸지 않는다.

## 근거

- OMR 재시도 시간 초과 테스트(meter·whole-note·wedge 3건)는 실제 시계 기준 20ms 마감을 준다. 재시도 코드는 프로세스를
  띄우기 전에 마감이 지났으면 원래 결과를 돌려주므로, 전체 Jest 부하에서 가짜 JVM이 생기지 않아 `process.killed`가
  False로 남았다(PR199 로컬 전체 Jest 2회 중 1·2건 실패, [기록](../validation/2026-09-28-doc2-harness-dedupe.md)).
- `pr-checks.yml`의 `test-e2e`와 `deploy.yml`의 `e2e`에 `timeout-minutes`가 없어 멈추면 기본 360분 동안 돈다.
  최근 E2E job 29건은 중앙값 16.5분, 최대 19.4분이다.

## Work stages

1. 세 테스트에서 `omr.audiveris.monotonic`을 고정해 프로세스 생성 전까지 전체 예산(50ms)을 유지하고,
   `asyncio.wait_for`의 실제 타이머로 kill 경로를 검증한다(wedge 수락 테스트의 기존 방식).
2. 두 E2E job에 `timeout-minutes: 30`을 두고 `src/ci` 구조 테스트로 고정한다.

## Completion criteria

- 모듈 시계 읽기마다 30ms를 더하는 부하 모사에서 수정 전 3건 모두 실패하고, 수정 후 반복 실행이 모두 통과한다.
- 두 E2E job의 상한이 30분이며 `src/ci` 테스트가 이를 확인한다.
- 전체 Jest·tsc·lint·actionlint 통과, PR CI 통과.

## Scope

`omr-service/tests/test_{meter,whole_note,wedge}_retry_runtime.py`, `.github/workflows/{pr-checks,deploy}.yml`,
`src/ci/__tests__/{prChecks,postMerge}Workflow.test.ts`.
제외: 다른 job의 시간 상한(수 분 안에 끝나고 멈춘 이력이 없다), 재시도 코드 자체의 동작 변경.

## Progress

- 2026-09-30: 두 수정 커밋(`d06332c`, `6d21565`)과 로컬 검증 완료. [검증](../validation/2026-09-30-ci-test-reliability.md).
- 2026-09-30: Security Audit이 새 brace-expansion advisory로 막혀 PR207(`09011cc`)로 분리 수정 후 main 반영(`b049724`), CI 12/12 PASS.
  사용자 승인으로 PR206을 `8bb3fda`에 병합. [리뷰](../reviews/PR-206.md).
