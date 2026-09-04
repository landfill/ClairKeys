# ISSUE-120 — 운지 없는 악보의 phrase-aware 학습 힌트

Status: `IN_PROGRESS`
Depends on: ISSUE-103

## Objective

운지 표기가 없는 일반적인 피아노 악보를 손별 시간순 악구로 분석해, 음 하나의 절대 음높이만 보는 기존
기본 자동 운지보다 일관되고 연주 가능한 결정론적 운지 힌트를 만든다. 원본 운지는 고정 제약으로 보존하고 자동값은
출처를 구분한다.

## Evidence

- 이슈 #120에 기록된 운영 JSON은 411음 전부 `finger`가 없지만 staff 기반 `L` 169음, `R` 242음은 정상이다.
- 운지 표기가 없는 높은음자리표/낮은음자리표 악보는 예외적인 누락 데이터가 아니라 제품의 기본 입력 형태다.
- 같은 PDF를 다시 변환해도 없는 운지가 생기지 않는다. 기본 자동 운지는 canonical JSON 이후의 player boundary가 소유한다.
- 기존 자동 운지는 정확한 8음 CAGED 장음계와 같은-onset 화음 외에는 MIDI 음역/나머지만 본다.

## Work stages

1. 상·하행 5음 위치, 반복음, 도약, 화음, 양손, 원본 보존, 운영 사례 축약 fixture를 회귀로 추가한다.
2. 원본을 제약으로 삼는 손별 phrase/event 비용 모델을 구현한다.
3. 자동 운지에 player-bound provenance와 알고리즘 버전을 부여한다.
4. 운영 관리자 backfill의 무작위 경로를 같은 추론기로 통합하고 오래된 독립 스크립트를 정리한다.
5. focused/full Jest, typecheck, lint, build와 실제 운영 악보·모바일 가로 화면을 검증한다.

## Completion criteria

- 이슈 #120의 GitHub 완료 조건을 모두 충족한다.
- 저장 canonical v1.0/v1.1 계약과 원본 `finger`는 변경하지 않는다.
- 같은 입력은 실행마다 같은 결과를 내며 `Math.random()` 기반 운지 경로가 운영 코드에 남지 않는다.
- 실제 악보 수동 검증에서 자동값을 전문 편집 운지 또는 유일한 정답으로 표현하지 않는다.
