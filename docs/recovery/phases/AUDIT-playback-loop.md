# AUDIT — A-B 반복의 프레임 수명주기

Status: `IN_PROGRESS`
Depends on: DS-5 (기존 A-B 구간 반복)

## Objective

2026-09-05 감사에서 확인한 첫 A-B 복귀 이후 애니메이션 중단을 복구한다.
오디오 seek가 끝난 뒤 다음 프레임을 예약하고, 기다리는 사이 정지·pause·unmount 또는
effect 교체가 일어나면 이전 루프가 다시 살아나지 않게 한다.

## Work stages

1. 실제 audio hook처럼 안정된 콜백을 쓰는 회귀 테스트로 B 통과 이후 프레임 누락을 재현한다.
2. 비동기 seek와 effect cleanup을 연결해 프레임 수명주기를 복구한다.
3. 연속 반복, 진행 중 pause/stop/unmount, 실패한 재시작을 검증한다.
4. focused/전체 Jest, typecheck, lint, build 후 독립 review-ready PR을 제출한다.

## Completion criteria

- 두 번 이상의 B→A 복귀 후에도 시각 시계가 오디오 시계를 따라간다.
- seek가 지연돼도 중복 seek나 중복 프레임 루프가 발생하지 않는다.
- 정지·pause·unmount 후 지연된 seek가 프레임을 되살리지 않는다.
- 재시작 실패 시 재생 상태가 해제된다.
- 관련 회귀 테스트가 수정 전 실패하고 수정 후 통과한다.
- 필수 검증과 PR 리뷰 대응이 기록되고 명시적 승인 후 병합된다.

## Out of scope

- 오디오 sample 로딩 정책과 프레임 처리 성능 최적화.
- #134/#137 템포, #135 유지음, #130 운지 비용 모델.
- A-B의 음표 잘라내기나 새로운 반복 음악 표현 계약.

Evidence: [감사](../validation/2026-09-05-codebase-audit.md),
[실행 가능한 진단](../validation/2026-09-05-codebase-audit-evidence.md).
