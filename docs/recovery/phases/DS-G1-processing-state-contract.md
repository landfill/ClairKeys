# DS-G1 — 처리 상태 출처 계약 확정 (결정 gate)

Status: `NOT_STARTED`
Depends on: DS-0 (`DONE`)
Gates: DS-3, DS-4
Issue: [#76](https://github.com/landfill/ClairKeys/issues/76) 3·7단계의 선행 결정

## Objective

실제 업로드의 진행·완료·실패 상태를 **어느 필드에서 읽을지** 확정한다. DS-3의 "처리 단계 표시"와
DS-4의 "처리 중·오류 표시"가 같은 계약을 읽게 만들어, 두 화면이 서로 다른 상태를 보여주는 일을
막는다.

## In scope

- 상태 출처 결정: `SheetMusic.processingStatus`(자유 문자열) vs `ProcessingJob`(enum, 현재 미사용)
- 이슈 #76의 4개 처리 단계(PDF 분석 → 음표 인식 → 연주 데이터 생성 → 학습 화면 준비)와 실제 OMR
  `progress`/`message`의 대응 정의
- 완료 알림의 트리거와 저장 위치 결정
- 실패 상태의 사용자 대면 분류 (이슈 #47·#46과의 경계)

## Out of scope

- **코드 변경 일체.** 산출물은 결정 문서다
- 영속 큐 구현 (P1-B)
- 실제 UI (DS-3, DS-4, DS-7)

## 결정해야 할 것

DS-0이 확인한 사실이 출발점이다.

- canonical 경로(`/api/omr/upload`, `/api/omr/finalize`)는 `ProcessingJob` 행을 만들지 않는다.
- `/processing` 화면과 `/api/notifications`는 `ProcessingJob`·`ProcessingNotification`을 읽으므로
  악보 5건을 가진 계정에서도 비어 있다 (DS0-2, 운영 확인됨).
- 실제 상태는 `SheetMusic.processingStatus`에만 있고 이를 렌더하는 화면이 없다.
- OMR 서비스가 내보내는 것은 `status` 4종(PENDING/PROCESSING/COMPLETED/FAILED)과
  `progress` 5지점(0/10/30/60/100), 영문 `message` 5종이다.

| ID | 결정 항목 | 선택지 |
|---|---|---|
| G1-1 | 상태 출처 | (a) `SheetMusic.processingStatus`를 canonical로 하고 값 집합을 고정 / (b) canonical 경로가 `ProcessingJob`도 쓰게 한다 / (c) 둘 다 유지하고 읽기 전용 뷰를 만든다 |
| G1-2 | 4개 단계 표현 | (a) OMR `progress` 구간을 4단계로 매핑 / (b) 단계 자체를 서버가 보고하게 한다 / (c) 4단계를 포기하고 실제로 아는 만큼만 표시한다 |
| G1-3 | 완료 알림 | (a) `ProcessingNotification` 부활 / (b) 내 악보의 상태 배지로 대체하고 별도 알림 없음 / (c) 브라우저 알림 |
| G1-4 | `/processing` 화면 | (a) 유지하고 새 출처에 연결 / (b) 제거하고 내 악보로 흡수 (이슈 #76의 정보 구조 원안) |
| G1-5 | 실패 분류 | 사용자 대면 실패 유형과 각각의 복구 행동. 이슈 #47(스택 트레이스)·#46(저해상도 PDF)의 결론을 어디까지 끌어올지 |

**G1-4는 DS-1의 내비게이션 구성을 막고 있다.** `처리 상태` 메뉴를 지울지 여부가 여기서 정해진다.

## Work stages

1. 위 5개 항목의 선택지를 실제 코드·데이터로 검증한다 (각 선택지가 요구하는 변경 범위 산출).
2. 결정을 `DECISIONS.md`에 D-0xx로 기록한다. 선택하지 않은 대안과 이유를 함께 남긴다.
3. DS-3·DS-4·DS-7의 phase 문서에서 이 결정에 의존하는 문장을 확정 문구로 교체한다.

## Completion criteria

- G1-1~G1-5가 모두 `DECISIONS.md`에 기록되어 있고, 각 항목에 기각된 대안과 이유가 있다.
- DS-3과 DS-4가 읽을 필드 이름과 값 집합이 문자열 수준으로 확정되어 있다.
- 4개 처리 단계 문구와 실제 서버 신호의 대응이 표로 있으며, **알 수 없는 구간을 알 수 있는 것처럼
  표현하지 않는다**.
- DS-1의 내비게이션 구성(G1-4)에 답이 나와 있다.
- 코드 변경이 0건이다 (`git diff --stat`이 `docs/`만 보여준다).

## 검증 명령

```bash
git diff --stat origin/main   # docs/ 외 변경이 없어야 한다
```

코드 변경이 없으므로 테스트·빌드는 이 단계의 판정 근거가 아니다.
