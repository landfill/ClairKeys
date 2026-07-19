# ClairKeys Recovery Program

이 디렉터리는 ClairKeys 복구·정확도 개선 작업의 영구 기록이다. 어떤 코드 에이전트나 새 세션에서도 여기서 현재 상태와 다음 작업을 복원할 수 있어야 한다.

## 읽기 순서

1. [현재 핸드오프](HANDOFF.md)
2. [우선순위 로드맵](ROADMAP.md)
3. [검증 기준선](BASELINE.md)
4. [브랜치·PR·리뷰 흐름](WORKFLOW.md)
5. [기술 결정 기록](DECISIONS.md)
6. `phases/` 아래의 현재 단계 문서

## 기록 구조

```text
docs/recovery/
├── README.md                 # 프로그램 진입점
├── ROADMAP.md                # 전체 우선순위와 단계 상태
├── HANDOFF.md                # 현재 세션 상태와 바로 다음 행동
├── BASELINE.md               # 최초 분석 및 검증 결과
├── WORKFLOW.md               # 브랜치, 커밋, PR, 리뷰 반복 규칙
├── DECISIONS.md              # 변경하지 말아야 할 결정과 근거
├── phases/                   # 단계별 범위, 테스트, 완료 조건
├── validation/               # 실행한 검증 결과
├── reviews/                  # PR별 리뷰 및 대응 기록
└── templates/                # 이후 기록용 템플릿
```

## 상태 표기

- `NOT_STARTED`: 아직 시작하지 않음
- `READY`: 선행 조건이 충족되어 시작 가능
- `IN_PROGRESS`: 전용 브랜치에서 작업 중
- `IN_REVIEW`: PR 생성 후 리뷰·CI 대응 중
- `BLOCKED`: 외부 권한 또는 결정이 필요함
- `DONE`: PR이 병합되고 완료 조건을 충족함

상태는 PR 생성이나 코드 작성만으로 `DONE`이 되지 않는다. 단계 문서의 완료 조건, 검증 기록, 리뷰 해결이 모두 충족되어야 한다.
