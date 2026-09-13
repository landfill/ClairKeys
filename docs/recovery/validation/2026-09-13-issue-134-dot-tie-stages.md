# 2026-09-13 — #134 점·타이 누락의 엔진 단계 추적 (VM 격리 실험)

## 승인과 범위

- 사용자는 2026-09-13에 PR159 이후 제안된 VM 격리 실험 설명을 보고 "진행해"로 명시 승인했다.
- 승인 범위: 원본 PDF를 VM 임시 폴더에 복사, 운영 이미지로 일회용 컨테이너(network none, 단계당
  300초) 실행, 결과 회수 후 VM 사본 삭제.
- 운영 서비스·이미지·설정·저장 악보·배포는 바꾸지 않았다. 코드 변경도 없고 진단 기록만 남긴다.

## 실행

- 사전 점검(읽기 전용): `clairkeys-omr` active, 컨테이너 healthy, `current` =
  `f858f14e…`(태그 `e652c643…`). 진행 중 작업·JVM 없음, 가용 메모리 14GB, CPU 2, `/data` 91GB 여유.
  기존 `/data/processing/8e33ffee…`(2026-08-21)는 건드리지 않았다.
- 임시 폴더 `/data/analysis/issue134-dots-913OhV`. 입력 sha256 `34d06c77…e5478` 검사 통과.
- 스크립트 `run_clair_stages.sh`는 CURVES → SYMBOLS → LINKS → RHYTHMS → PAGE를 각각
  `-batch -step <S> -save`로 저장한다. 이어 이미지 자체의 `omr.meter_retry.prepare_meter_retry`로
  운영과 같은 9/8 재시도를 만든 뒤 `-transcribe -export`한다.
- 결과:
  - 단계별 exit 0, 소요 25/5/5/4/5초, 재시도 6초.
  - 재시도 증거: staff1 nine .698 / six .605, staff2 nine .726 / six .639.
- 회수: 23개 파일(.omr 6, .mxl 2, 로그)을 로컬 Git 제외 폴더
  `local-test-data/results/issue134-dots-2026-09-13/`로 가져왔다. 원격 manifest와 sha256 23/23이
  일치했다. 원본 PDF는 가져오지 않았다(이미 로컬에 있음).
- 정리:
  - VM 임시 폴더와 `/tmp` manifest를 삭제했고, `test ! -e`로 부재를 확인했다.
  - 이후 운영 컨테이너 healthy, `podman healthcheck run` 통과, 서비스 active, 남은 JVM 0이다.
- 로컬 결과 폴더의 .omr에는 이진화 페이지 이미지가 들어 있다. D-040에 따라 저장소에 올리지 않는다.

## 재현성

- 재시도 `retry.mxl` 이벤트를 2026-09-06 운영 스모크 `retry.mxl`(878039a1…)과 마디별로 비교하면
  **한 곳만 다르다.** m10 베이스 F3/A3 3박 화음이 운영본은 점4분(1.5), 이번 실행은 4분(1.0)이다.
- 2026-09-06 기록에도 체크포인트 재로딩 시 G4 타이 하나가 달라진 사례가 있다. 단계별
  save/reload가 결과를 조금 바꿀 수 있다는 뜻이다. 아래 분석은 이번 실행 그래프 기준이다.

## 점 누락: 원인 추적

LINKS 단계가 SYMBOLS가 만든 점 107개 중 8개를 지운다(이후 단계는 99개 유지). 지워진 8개는 모두
SYMBOLS에서 머리와 augmentation 관계가 있었다. 위치는 원본 판독의 점 누락과 겹친다:

| 마디 | 화음 | 지워진 경로 |
| --- | --- | --- |
| m1 오른손 | C5/E5 (둘 다 칸) | 타이 곡선 glyph가 E5 점 잉크를 잘라 점 glyph가 3px로 쪼개짐(grade .204). 곡선 끝과 1~2px |
| m1 왼손, m3 왼손 2곳, m13 오른손, m2 오른손 | 두 머리가 모두 줄 위, 3도 | 아래 참조 |
| m7 베이스 F3/A3 | 같은 모양 | 점 하나만 지워짐. 결과 음가에는 영향 없음 |

줄 위 3도 화음의 공통 모양:

- 이진화 이미지에는 분리된 점 두 개가 있다(위 칸, 두 머리 사이 칸; `analysis/dots-binary.png`).
  위 점 glyph도 SYMBOL glyph로 존재한다(예: m1 LH `4191` 9×10).
- 그러나 SYMBOLS 그래프에서 **점 inter는 사이 칸 점 하나뿐이고, 그 점은 위 머리에 연결**됐다
  (dy 0.45~0.5). 위 점은 inter가 되지 않았다.
- 같은 모양인데 점이 남은 화음 10곳에서는 먼저 생성된(id가 작은) 위 점이 위 머리에, 나중 점이 아래
  머리에 연결됐다(`analysis/line-third-dot-order.txt`).
- 이후 LINKS `SymbolsLinker.linkAugmentationDots` → `AbstractChordInter.countDots`에서 화음 점 개수
  [1, 0]의 평균 0.5를 `Math.rint`가 0으로 반올림한다. 결국 **남은 점까지 제거**된다
  (`std != 0 && dotsNumber == 0` 분기).

관련 Audiveris 5.11.0 소스(로컬 `local-test-data/results/whole-note-integrity/sol-source`):

- `AugmentationDotInter.lookupHeadLink`: 주석은 "dots are processed top down"을 가정한다. 머리 후보가
  모두 줄 위면 `links.get(0)` = 가장 위 머리를 고르고, 이미 점이 있는 머리는 건너뛴다.
- `DotFactory.lateDotChecks`: `Dot.byAbscissa`로 정렬하는데, 이 비교자는 **정수 left x만** 본다.
  같은 세로줄의 두 점은 동률이 되고, 순서는 앞 단계 삽입 순서로 정해져 위→아래가 보장되지 않는다.
  m2 오른손은 아래 점 left 1298 < 위 점 1299라서 아래 점이 먼저 처리된다.
- 따라서 기전은 다음과 같다(추론): 아래 점이 먼저 처리돼 위 머리를 차지하면, 위 점은 연결할 머리가
  없어 inter가 되지 못하고, 화음 점 개수가 [1, 0] → `rint(0.5)=0`이 되어 남은 점도 삭제된다.
- 한계:
  - 동률 5곳에서 실제 처리 순서를 로그로 찍지 않았으므로 **강하게 뒷받침된 추론**이다.
  - 부분 픽셀 무게중심 x로 순서를 예측하는 가설은 반증돼 기각했다(남은/지워진 화음 양쪽에 섞임).
  - 확정하려면 DotFactory VIP/debug 로그를 켠 재실행이 필요하다.

## 타이 누락: 원인 분류

- 곡선 46개와 `tie=true` 25개는 CURVES에서 정해지고, LINKS·RHYTHMS·PAGE에서 바뀌지 않는다
  (`analysis/slurs-page.txt`).
- 원본 기준 누락 타이 시작 20건:

| 분류 | 건수 | 위치 |
| --- | --- | --- |
| 곡선 자체가 없음 | 10 | m2 LH F4·Ab4, m3 LH G4, m4 LH D4, m11 LH E3·G3, m12 LH F3, m13 LH E3·G3, m14 LH D3 — 대부분 보표 안쪽의 긴 평행 타이 |
| 시스템 경계 조각이 슬러 조각과 잘못 짝지어짐 | 5 | m3→4 C5·A4(4031↔3907), m6→7 E4(4002↔4006, C4에 연결), m9→10 C5·E5(3993↔4084, 음높이 다름) |
| 같은 음높이 곡선을 슬러로 분류 | 1 | m10 D5→m11 D5(3957, 시작점이 D5 점에 닿음) |
| 앞선 onset·성부 오류의 연쇄 | 4 | m3 둘잇단 E5, m5 G4, m9 베이스 E3·G3 |

## 점 처리 순서 확정: VIP 로그 재실행 (2026-09-13)

- 사용자는 "debug 로그 재실행으로 점 순서 확정해"라고 명시 요청했다. 같은 격리 조건(운영 이미지
  `f858f14e…`, network none, 300초, 끝나면 삭제)이다.
- PDF는 올리지 않았다. 앞서 회수한 CURVES 체크포인트(`39b0c199…`, 해시 검사 통과)만
  `/data/analysis/issue134-dotvip-v7VVzW`에 올렸다.
- 실행: `-batch -step SYMBOLS -save -constant org.audiveris.omr.glyph.GlyphIndex.vipGlyphs=<21개 id>`.
  exit 0, 7초, VIP 로그 164줄.
- 결과 3개 파일(run.log, 엔진 로그, clair.omr)은 sha256 3/3 일치 후
  `local-test-data/results/issue134-dots-2026-09-13/vip-SYMBOLS/`로 회수했다.
- VM 폴더 삭제와 부재를 확인했고, 운영 healthcheck 통과, 서비스 active, 남은 JVM 0이다.
- 로그 줄 두 종류로 순서를 읽었다:
  - `InterFactory … symbol created as DOT_set`: `dots` 목록 삽입 순서.
  - `DotFactory … lateNoteAugmentationCheck for GlyphDot{…}`: `Dot.byAbscissa` 정렬 후 처리 순서.
  - 바로 뒤에 `VIP added AugmentationDotInter`가 붙으면 그 점이 inter가 됐다는 뜻이다.

| 화음 (glyph 위/아래, 좌표) | 삽입 순서 | 처리 순서 | inter 생성 위/아래 |
| --- | --- | --- | --- |
| m1 LH 4191/4192 (665,888/907) | 아래 먼저 | **아래 먼저** | 없음 / 생성 |
| m2 RH 4280/4279 (1299,645/1298,664) | 위 먼저 | **아래 먼저** (left 1298<1299) | 없음 / 생성 |
| m3 LH 점2분 4326/4327 (1617) | 아래 먼저 | **아래 먼저** | 없음 / 생성 |
| m3 LH 점4분 4399/4400 (2109) | 아래 먼저 | **아래 먼저** | 없음 / 생성 |
| m13 RH 4419/4420 (2199) | 아래 먼저 | **아래 먼저** | 없음 / 생성 |
| m7 베이스 4220/4221 (888) | 위 먼저 | 위 먼저 | 생성 / 생성 |
| 대조 staff3 4182/4183 | 위 먼저 | 위 먼저 | 생성 / 생성 |
| 대조 staff7 4390/4391 | 위 먼저 | 위 먼저 | 생성 / 생성 |
| 대조 staff8 4145/4146 | 위 먼저 | 위 먼저 | 생성 / 생성 |
| 대조 staff10 4147/4148 | 위 먼저 | 위 먼저 | 생성 / 생성 |

결론:

- **확정:** 줄 위 3도 화음에서 아래 점이 먼저 처리되면 그 점이 위 머리를 차지하고, 위 점은 연결
  대상이 없어 inter가 되지 않는다. 위 점이 먼저면 두 점이 모두 산다.
- `Dot.byAbscissa`는 정수 left x만 비교한다. left가 1px 작은 쪽이 먼저(m2 RH)이고, 동률이면 삽입
  순서가 유지된다. 어느 쪽도 "위에서 아래로"를 보장하지 않는다.
- 이후 LINKS의 `countDots` rint(0.5)=0 삭제는 앞 절에서 확인한 대로다(이 재실행은 SYMBOLS까지만 했다).
- **순서는 실행마다 달라질 수 있다.** 같은 CURVES 체크포인트인데 m7 베이스는 이번 실행에서 위 점이
  먼저 삽입돼 두 점이 모두 inter가 됐다. 앞선 SYMBOLS 실행에서는 위 점 inter가 없었다.
  - 두 실행의 점 inter를 (glyph, x, y)로 비교하면 차이는 이 한 곳뿐이다(107 → 108).
  - 나머지 차이는 같은 위치의 glyph id 번호 이동(4603 → 4604)이다.
  - 동률 처리 순서가 실행 간에 고정되지 않으므로, 운영본과 단계 재실행이 m10 베이스 점에서 달랐던
    현상도 같은 원인일 가능성이 높다. 단, m10은 VIP 대상에 넣지 않아 직접 확인하지 않았다.
- 교정 후보 판단에 주는 의미: 처리 순서를 정렬로 고정하는 후보 (b)만으로는, 두 머리 중 무엇을
  고를지가 여전히 `links.get(0)`에 달려 있다. 순서와 무관하게 "줄 위 머리의 점은 위 칸" 기보 규칙으로
  아래 머리를 고르는 후보 (a)가 원인에 더 직접적이다. 채택은 아직 하지 않았다.

## 다음 행동 후보 (결정 필요, 미실행)

1. 점:
   - 엔진 보정 후보 (a): `lookupHeadLink`에서 두 머리가 모두 줄 위일 때 dot 아래쪽 머리를 우선한다
     (줄 위 음의 점은 위 칸에 찍는 기보 규칙). 순서에 의존하지 않는다.
   - 후보 (b): `Dot.byAbscissa`에 top 동률 해소를 추가한다.
   - 후보 (c): `countDots`의 [1, 0] 처리.
   - 모두 pinned 5.11.0 패치다. PR145가 만든 격리 recovery engine 빌드 경로가 있지만, 정상 악보
     회귀(Satie/Always/Love)와 D-052/D-054 수준의 보존 검증이 필요하다.
   - debug 로그 재실행으로 처리 순서는 확정됐다(위 절).
2. 타이: CURVES의 보표 안 평행 타이 탐지와 시스템 경계 조각 짝짓기다. 점보다 범위가 넓어 별도 계측이 필요하다.
3. m10 베이스 점 재현성 차이는 단계별 save/reload 영향으로 보이며, 별도 대조 실행으로 확인할 수 있다.
