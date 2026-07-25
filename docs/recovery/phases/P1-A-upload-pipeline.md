# P1-A — Upload Pipeline Consolidation

Status: `IN_PROGRESS`
Depends on: P0-A, P0-B, P0-C, P0-D (all `DONE`)

## Progress

- 2026-07-25 — Work stage 1 done. `src/app/api/__tests__/uploadPathInventory.test.ts` (6 tests)
  pins each path's converter and callers. Only `/api/omr/upload` converts a score;
  `/api/upload-async`, `/api/processing`, and the caller-less `/api/upload` reach
  `pdfParser.createEnhancedDemo()` and persist its output as an ordinary `SheetMusic` row.
  Evidence: `docs/recovery/validation/2026-07-25-p1a-upload-path-inventory.md`.
- 2026-07-25 — Work stage 2 in review. **D-010** selects `/api/omr/upload` as canonical and records
  the migration plan. In PR [#34](https://github.com/landfill/ClairKeys/pull/34).
- Work stages 3–5 not started; they wait on D-010 being agreed.
- Note for stage 4: issue #20 (demo stub `pdfParser.ts`) is satisfied by this stage rather than
  separately. `/api/processing-queue` is a read-only listing endpoint, not an upload path.

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
- 기존 업로드 endpoint의 호출자가 0임을 검색·통합 테스트로 확인하고 endpoint를 제거하거나, 필요한 호환 경로는 canonical API와 명시적으로 격리했음을 검증한다.
- P1-B가 사용할 queue/auth 경계가 문서화된다.
