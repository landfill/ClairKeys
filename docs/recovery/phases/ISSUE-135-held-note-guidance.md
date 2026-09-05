# ISSUE-135 — 소리의 유지와 손가락 점유를 분리한다

Status: `IN_PROGRESS`
Depends on: phrase-dp-v3, canonical player boundary

Progress (2026-09-05): PR #140을 `193fcdd`로 병합했다. 병합 전 전체 hosted CI 통과,
post-merge 체크 확인 중. 자동 리뷰는 스킵됐고 corpus·경계·브라우저 직접 검증으로 판단했다.
사용자 설정 미커밋 변경 때문에 브랜치는 보존한다.

## Objective

Gymnopédie의 낮은 베이스를 계속 누른 채 23~28반음 위 화음을 누르라고 보이는 안내를 개선한다.
원본 음가와 오디오는 보존하며, 후속 타건과 공존할 수 없는 이전 손가락 점유에만 자동 손 떼기
제안을 추가한다. 이를 원본 페달 표기나 유일한 정답 연주로 표현하지 않는다.

## Work stages

1. #135 실제 283음 JSON을 fixture로 옮기고 원본 시간·finger 불변, 첫 두 마디와 전체 유지 상태를 회귀로 만든다.
2. 운지 비용 모델과 분리된 player-only release guidance를 정의한다(D-047).
3. 건반 활성 구간과 낙하 노트를 손 점유/소리 유지 부분으로 구분해 표시하고 출처를 설명한다.
4. 실제 corpus, 기존 운지/오디오/기하 테스트, 전체 검증 및 브라우저 표시를 확인한다.

## Completion criteria

- 첫 마디 G2와 둘째 마디 D2의 손 점유는 위 화음 타건 시 끝나지만 원본 duration는 바뀌지 않는다.
- 실제 corpus의 모든 onset에서 안내가 계속 누르라고 하는 음들의 finger reach가 유효하다.
- 성립하는 겹침은 유지하고, 같은 onset의 음표를 임의로 순차화하지 않는다.
- source finger와 inferred finger 모두 기존 값·출처가 보존된다.
- 자동으로 제안한 손 떼기 이후의 유지음은 옅은 표기와 설명을 가지며 손가락 번호를 반복 표시하지 않는다.
- 같은 입력에 결정적이고, 기존 오디오 재생 시간과 저장 계약을 변경하지 않는다.
- 검증·리뷰·병합 결과를 기록한다.

## Out of scope

- #130의 아르페지오 비용 모델 재조정 및 사람의 정답 운지 대체.
- 페달 이벤트 자동 생성, 원본 duration 잘라내기, 동시 시작 화음의 hand 재배정.
- 이미 한 onset 자체가 도달 불가인 악보의 교정. 이 경우는 별도 경고/hand-assignment 문제다.
