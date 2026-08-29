# DS-G1 — 처리 상태 출처 계약 확정 (결정 gate)

Status: `DONE`
Depends on: DS-0 (`DONE`)
Gates: **DS-1**(내비게이션 구성), DS-3, DS-4
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

**G1-4가 DS-1을 막고 있다.** `처리 상태` 메뉴를 지울지 여부가 여기서 정해지므로, DS-G1은 DS-1보다
먼저 끝나야 한다. 이 단계는 코드를 바꾸지 않으므로 직렬화 비용은 문서 한 건이다.

## 조사 결과 (2026-08-29, `77504bc` 기준)

선택지를 좁힌 사실들이다. 전부 코드에서 확인했다.

| 사실 | 근거 |
|---|---|
| `ProcessingJob`의 유일한 writer는 `/api/processing` POST와 `/api/upload-async`이고, **둘 다 P1-A가 `CONVERSION_UNAVAILABLE`로 무력화한 경로다** | `src/app/api/processing/route.ts:126`, `src/app/api/upload-async/route.ts:93`, `src/services/conversionAvailability.ts` |
| `processingStatus`에 실제로 쓰이는 값은 `'processing'`(생성 시)·`'completed'`·`'failed'` 셋이고, 스키마 default `'pending'`은 `/api/sheet` POST 경로로 만든 행에만 남는다 | `omr/upload:155`, `omr/finalize:93,111`, `omr/status/[jobId]:118,183,208,211` |
| **`'pending'` 행은 이후 어떤 코드도 건드리지 않는다.** 쓰기는 전부 `omrJobId`로 행을 찾으므로 `omrJobId`가 없는 행에는 도달하지 않는다 | 위 쓰기 지점 전부 |
| **`omrJobId`를 클라이언트에 돌려주는 API가 없다.** 브라우저는 업로드 응답의 `jobId`를 그 화면에서만 갖는다 | `omr/upload:234-240`, grep `omrJobId` |
| `/api/sheet`(목록)도 `/api/sheet/[id]`(상세)도 `processingStatus`를 반환하지 않는다 | `api/sheet/[id]/route.ts:62-77` |
| 행 생성 시 `animationDataUrl`은 `''`이고 완료 시에만 채워진다 | `omr/upload:153`, `omr/finalize:89-93` |
| OMR 서비스는 `progress` 0/10/30/60/100과 영문 `message` 5종만 보낸다. 단계를 저장하는 곳은 없다 | `omr-service/app.py:323-364` |
| `/status`가 404면(서비스 재시작) 행을 `'failed'`로 바꾸고 한국어 문구를 준다. 그 외 non-ok는 상태를 건드리지 않는다 | `omr/status/[jobId]:100-160` |

확인하지 못한 것: **운영 데이터의 `processingStatus` 분포.** 이 저장소의 Supabase 프로젝트
(`ghgiqtinaxjsuotfzmcw`)가 사용 가능한 MCP 계정에 없다. DS-4 착수 전에 `'pending'` + 빈
`animationDataUrl` 행이 몇 건인지 확인해야 한다.

## 결정 결과 — [D-026](../DECISIONS.md)

| ID | 결정 |
|---|---|
| G1-1 | **(a)** 상태 출처는 `SheetMusic`. `ProcessingJob`·`ProcessingNotification`은 읽지도 쓰지도 않는다. 화면은 원값이 아니라 **파생 상태**(연습 가능 / 처리 중 / 오류 / 알 수 없음)를 읽는다 |
| G1-2 | **(a) + 범위 제한** OMR `progress`를 4단계로 매핑하되 **업로드 화면에서만** 표시한다. 화면을 떠나면 단계를 표시하지 않는다 — 서버가 모른다 |
| G1-3 | **(b)** 별도 알림 시스템을 만들지 않는다. 업로드 화면의 인라인 완료 + 내 악보의 상태 배지 |
| G1-4 | **(b)** `/processing` 화면과 Header의 `처리 상태` 메뉴를 제거한다. 대체 도달 경로는 내 악보의 상태 배지 |
| G1-5 | 사용자 대면 실패 4종 확정: 파일 거부 / 변환 실패 / 작업 유실 / 서비스 불가 |

파생 상태 판정 규칙과 `progress` 매핑표, 실패 4종의 복구 행동은 D-026에 있다.

### DS-1이 이 결정에서 받아가는 것

- 내비게이션은 `내 악보`·`새 악보`·`탐색` 3개다. `처리 상태` 메뉴를 제거한다 (G1-4).
- 제거한 화면의 대체 도달 경로는 **내 악보의 파생 상태 배지**이며, 그것은 DS-4가 만든다.
  DS-1은 메뉴만 없애고 DS-4 이전까지 그 배지가 없는 기간이 생긴다는 사실을 감수한다 —
  현재도 `/processing`은 빈 화면이므로 잃는 정보가 없다.
- `/api/processing`·`/api/notifications`·`useBackgroundProcessing`·`ProcessingDashboard`의
  **삭제는 P2-A 소유다.** DS-1은 도달 경로만 없앤다.

## Work stages

1. 위 5개 항목의 선택지를 실제 코드·데이터로 검증한다 (각 선택지가 요구하는 변경 범위 산출).
2. 결정을 `DECISIONS.md`에 D-0xx로 기록한다. 선택하지 않은 대안과 이유를 함께 남긴다.
3. DS-3·DS-4·DS-7의 phase 문서에서 이 결정에 의존하는 문장을 확정 문구로 교체한다.

## Progress

- 2026-08-29 — Work stages 1~3 완료. 조사에서 선택지 (b)·(c)가 사실상 배제됐다: `ProcessingJob`의
  유일한 writer 두 곳이 P1-A가 무력화한 경로여서, 그 테이블을 쓰는 것은 D-010을 되돌리는 일이다.
  결정을 **D-026**으로 기록하고 DS-1·DS-3·DS-4·DS-7 문서를 확정 문구로 교체했다. 코드 변경 0건.
- 2026-08-29 — **DONE.** 사용자의 명시적 승인으로 PR
  [#88](https://github.com/landfill/ClairKeys/pull/88)을 merge commit `57d07bb`로 병합했다
  (최종 head `9c81212`). 필수 체크 4개 전부 통과, 리뷰 스레드 0건. 로컬·원격 작업 브랜치 tip이
  main에 포함됨을 확인한 뒤 양쪽을 삭제했다. merge commit의 post-merge check-runs가 6/6 성공했다.
  완료 조건의 핵심인 "코드 변경 0건"은
  `git diff --stat origin/main`이 `docs/` 7개 파일만 보여주는 것으로 확인했다.
  **DS-1의 진입 조건 3(내비게이션 구성)이 이 결정으로 해소됐다.**

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
