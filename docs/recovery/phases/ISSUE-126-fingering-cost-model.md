# ISSUE-126 — 손 이동과 엄지 넘김을 담은 운지 비용 모델

Status: `IN_REVIEW`
Depends on: ISSUE-120 (`phrase-dp-v1`이 이 단계의 수정 대상이다)

Progress (2026-09-05): 2순위(비용 모델)를 브랜치 `codex/issue-126-fingering-cost-model`에서 구현했다.
1순위(경계 문맥 전달)와 3순위(계약 확장)는 이 단계에 포함하지 않는다.

## Objective

`phrase-dp-v1`이 하행·반복·비CAGED 구간에서 엄지를 연속 반복하는 원인을 제거한다. 원인은 비용 함수 자체다 —
엄지 넘김은 정의상 "음 진행과 반대 방향의 손가락 이동"인데 `transitionCost`가 그 전이를 일괄 처벌했고, 같은
손가락 반복은 어떤 처벌도 받지 않았다. 손 이동과 넘김을 비용으로 표현해, 정석 운지가 최고 비용이 아니라 최저
비용이 되게 한다.

## Evidence

- 이슈 [#126](https://github.com/landfill/ClairKeys/issues/126)의 재현 표를 이 저장소에서 그대로 재현했다.
  RH 하행 C장음계 8음 `5 4 3 2 1 1 1 1`, RH 하행 12음은 엄지 8연속, LH 하행 8음 `1 1 1 1 2 3 4 5`,
  F장조 상행 `1 1 1 2 2 3 4 5`, A화성단조는 같은 손가락 5연속.
- 정석이 나오는 유일한 경우는 `applyMajorScaleRuns`가 매칭되는 상행 CAGED 8음이었다.
- 패턴 층은 DP 결과를 사후에 덮어써 경계 불연속을 만든다. G장조 9음에서 DP 자체 답은 일관된
  `1 2 3 4 1 2 3 4 5`인데, 앞 8음만 덮어써 `1 2 3 1 2 3 4 5 5`가 나왔다.
- 손 위치를 별도 DP 상태로 넣을 수 없다(이슈가 명시한 복잡도 제약: 전이 25 → 10,000).

## Work stages

1. 이슈의 재현 표를 회귀 테스트로 고정하고 실패를 기록한다.
2. 손 위치를 `(손가락, 음높이)`에서 유도하는 anchor로 표현하고, 손 이동·레가토 단절·조건부 엄지 넘김·
   반복음 교대·검은건반 제약을 비용으로 넣는다.
3. `applyMajorScaleRuns`를 삭제한다 — 비용 모델이 같은 답을 만들고, 사후 덮어쓰기는 경계 불연속을 만든다.
4. `FINGERING_ALGORITHM_VERSION`을 `phrase-dp-v2`로 올리고 결정을 `DECISIONS.md`(D-041)에 기록한다.
5. focused/전체 Jest, typecheck, lint, build, 24개 조성 전수 스윕, 12,000음 성능을 검증한다.

## Completion criteria

- 이슈 #126 완료 조건 중 2순위에 속하는 항목을 충족한다.
- 어떤 phrase에서도 같은 손가락이 3회 이상 연속되지 않는다.
- CAGED 밖 조성과 단음계 상·하행에서도 엄지가 연속되지 않는다.
- 원본 `finger`가 있는 노트는 한 음도 바뀌지 않고, 같은 입력은 같은 결과를 낸다.
- 12,000음 추론 시간이 `phrase-dp-v1` 대비 한 자릿수 배수 안에 머문다.
- 저장 canonical v1.0/v1.1 계약은 바꾸지 않는다.

## Out of scope

- 1순위: `keySignature`·`timeSignature`·`staff`·`voice`의 player boundary 전달과 `voice` 기반 이벤트 묶기.
- 3순위: 마디 번호·쉼표·이음줄·음표 값의 계약 확장 (D-040, #125 단계 B와 함께 처리).
- 411음 운영 JSON의 연주 가능성 수동 검토 — 원본이 저장소에 없어 앱에서 수행해야 한다.
