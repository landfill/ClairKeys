# P0-B — MusicXML Converter Correctness

Status: `NOT_STARTED`
Depends on: P0-A

## Objective

MusicXML의 음악적 시간과 피아노 양손 구조를 canonical animation timeline으로 정확하게 변환한다.

## Work stages

1. `divisions`, tempo map, measure start를 모델링한다.
2. chord/rest/tie/dot/time-modification을 처리한다.
3. backup/forward와 voice별 cursor를 처리한다.
4. part/staff/voice 기반 손·성부 정보를 보존한다.
5. cross-staff와 손 정보 누락 fallback을 정의한다.
6. P0-A corpus에 대해 정확도 리포트를 생성한다.

## Completion criteria

- pitch mismatch가 fixture 기준 0건이다.
- 명시된 hand/staff/voice가 손실되지 않는다.
- 동시 음표는 동일 onset을 유지한다.
- onset과 duration이 단계에서 정한 허용 오차를 만족한다.
- tempo/time-signature 변경 fixture가 통과한다.
