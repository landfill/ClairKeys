# P0-A — Animation Contract and Golden Fixtures

Status: `DONE` (PR #23 merged at `d59ea9d`; all four completion criteria met — see `docs/recovery/reviews/PR-23.md`)

## Objective

OMR 결과부터 플레이어 입력까지 하나의 버전된 애니메이션 계약을 사용하고, 이후 정확도 작업을 판정할 golden corpus를 만든다.

## In scope

- canonical note, tempo, time signature, hand, voice, staff, fingering 필드
- Python serializer와 TypeScript runtime validator
- 기존 저장 JSON 호환 정책
- 최소 7종의 MusicXML/expected JSON fixture
- 정량 정확도 지표와 비교 도구

## Out of scope

- 전체 MusicXML 의미론 구현
- 오디오 스케줄러 변경
- 업로드 큐 구조 변경

## Required fixtures

- 단선율
- 동시 코드
- 쉼표와 붙임줄
- 양손 grand staff
- 한 staff 안의 다성부
- 셋잇단음표와 점음표
- 템포 또는 박자표 변경

## Completion criteria

- malformed 또는 구버전 JSON이 cast 없이 검증된다.
- Python 출력이 TypeScript validator를 통과한다.
- 모든 fixture에 기대 음높이, onset, duration, hand/staff/voice가 기록된다.
- 후속 단계가 사용할 비교 명령과 허용 오차가 문서화된다.
