# 2026-09-13 — #134 잔여 인식 오류 분리와 시작 템포 위치 (PR159)

## 범위

- 대상은 최초 제보 원본 `Clair_de_Lune_easy_300dpi.pdf`뿐이다. sha256은
  `34d06c77398470ea6f9bf15d9cd5724a0db94c904eb81107c5ca29d2f1be5478`이고, 이 클론의 Git 제외 폴더
  `local-test-data/scores/`에 있는 파일이다. 한 페이지, 삽입 JPEG 2480×3508.
  Love Affair·Satie·Always With Me는 회귀 대조에만 썼고, 이 곡의 해결 근거로 쓰지 않았다.
- 작업 브랜치는 `codex/issue-134-residual-timing`이고, 커밋은 `5d5333e`(기준·평가기)와
  `bec1e34`(D-060)다. PR은 [#159](https://github.com/landfill/ClairKeys/pull/159)다.
- 이번 세션은 Audiveris를 실행하지 않았다. 로컬에는 실행 환경이 없다: Docker 데몬 미실행, JDK 17뿐,
  #149 개발환경은 디스크 부족으로 후순위다. 운영 VM 접근은 읽기 전용이었다.

## 계보 (PDF → MusicXML → JSON)

| 단계 | 근거 |
| --- | --- |
| PDF | 로컬 원본 sha256 `34d06c77…e5478`. 2026-09-06 배포 스모크 입력 해시와 같다 |
| 초기 MusicXML(6/8) | VM `/data/analysis/pr142-live-Fetl0O/result/input.mxl`, `e2dc0c7f…87867` |
| 선택 MusicXML(9/8 재시도) | VM `…/meter-retry-kuts9jdq/retry.mxl`, `878039a1…630a5`. 2026-09-13에 읽기 전용으로 복사해 해시가 일치함을 확인했다 |
| 저장소 fixture | `fixtures/recognition/clair-de-lune-automatic-retry.json`의 after(`ade2616d…`). 압축 컨테이너 시각이 달라 해시는 다르지만, 마디별 note/rest/backup/forward/direction/tie 덤프는 `retry.mxl`과 `diff` 결과 동일하다 |
| 현재 운영 이미지 | `localhost/clairkeys-omr:current` = `e652c643…` 태그, image `f858f14e…`, 서비스 active. PR142 이후 OMR 경로의 변경은 key metadata, whole-note/wedge 재시도(둘 다 균일 4/4가 아니면 그래프를 열기 전에 기권 — 실제 XML로 `False`/`None` 확인), callback이다. 따라서 이 PDF의 현재 운영 결과도 같은 재시도 이벤트다. 새 운영 변환은 하지 않았으므로 추론이지 재실행 증거가 아니다 |
| JSON(병합 전 main) | 위 XML → `python3 -m omr.cli`: 163음, 9/8, tempo/scoreTempo null, timingReferenceBpm 60, bar9 overflow |
| JSON(PR159) | 같은 163음. 음높이·손·staff·voice·음가·순서가 동일하고, start만 전부 −0.065218s(첫 0.5박 60→69). tempo/scoreTempo/timingReferenceBpm = 69/69/69, tempoSource=score, 경고 동일 |

## 원본 판독 기준

`fixtures/recognition/clair-de-lune-full-reference.json`에는 17마디, raw pitched 이벤트 191개, 쉼표,
타이 시작 43개, 시작 템포 ♩=69@0이 들어 있다.

- 판독은 페이지 이미지를 150/300dpi와 부분 확대로 직접 읽었다.
- 자체 검사: 모든 마디에서 두 보표 끝이 4.5박이고, 모든 타이 시작이 같은 보표·음높이의 다음 음에
  도착하며, 1마디는 기존 `clair-de-lune-reference.json`과 같다.
- 해석이 들어간 곳은 `readingNote`로 남겼다.
  - m3: "2"는 운지가 아니라 둘잇단(0.75박씩)이다. 이렇게 읽어야 윗성부가 4.5박을 채운다.
  - m5: F4 점2분이 첫 B4 8분과 기둥을 공유한다.
  - m7: C4 덧줄 위 공간의 점은 C4 점2분의 것이다.
  - m9 베이스: 윗성부(8분쉼표, E3, E3/G3, C3/E3/G3 점2분)와 아랫성부(C3 점4분 → 공유 머리 C3)로
    읽었다. 높은음자리표 G4(1.0), E5/G5(1.5)와의 세로 정렬로 onset을 확인했다.
- 한계: 판독자는 한 명(에이전트)이고 연주자 청취 확인은 없다.

## 운영 결과의 잔여 오류 (원본 기준)

명령: `cd omr-service && python3 -m omr.recognition_evaluation ../fixtures/recognition/clair-de-lune-full-reference.json retry.mxl`
— exit 1(불일치). 합계: 이벤트 143/191, 정확한 마디 8·15·16·17, 타이 시작 23/43, **음높이 오류 0**,
박자 17/17 9/8. 시작 템포는 PR 전 None, PR 후 69로 일치한다.

| 마디 | 이벤트 | 길이 | 타이 시작 | 분류 | 점·음가·누락 상세 | 누락 타이 시작 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 6/10 | 4 | 6/6 | missing-dot 4 | missing-dot S2 E4@1.5 3→2; missing-dot S2 G4@1.5 3→2; missing-dot S1 C5@3 1.5→1; missing-dot S1 E5@3 1.5→1 | — |
| 2 | 10/12 | 4.5 | 2/4 | missing-dot 2 | missing-dot S1 B4@1.5 3→2; missing-dot S1 D5@1.5 3→2 | S2 F4@0, S2 G#4@0 |
| 3 | 7/15 | 4.5 | 1/5 | missing-dot 3, onset-and-duration 5 | missing-dot S2 E4@0 3→2; missing-dot S2 G4@0 3→2; missing-dot S1 C5@1.5 0.75→0.5 | S2 G4@0, S1 A4@1.5, S1 C5@3.75, S1 E5@2.25 / 추가: S1 E5@2 |
| 4 | 12/12 | 4.5 | 2/3 | — | — | S2 F4@0 |
| 5 | 2/15 | 4.25 | 0/1 | duration 1, missing 2, onset 7, onset-and-duration 3 | duration S1 B4@0 0.5→0.333333; missing S1 F4@0+3; missing S1 F4@3+1.5 | S1 G4@4 / 추가: S1 G4@3.75 |
| 6 | 11/11 | 4.5 | 0/1 | — | — | S1 E4@3 |
| 7 | 7/15 | 4.5 | 1/1 | extra-dot 1, missing 1, missing-dot 1, onset 5 | missing-dot S1 C4@0 3→2; extra-dot S1 E4@0 0.5→0.75; missing S1 C4@3+1.5 | — |
| 8 | 11/11 | 4.5 | 0/0 | — | — | — |
| 9 | 1/12 | 5 | 1/5 | duration 3, onset 6, onset-and-duration 2 | duration S2 E3@0.5 0.5→1; duration S2 E3@1.5 3→1; duration S2 G3@1.5 3→1 | S2 E3@1, S2 G3@1, S1 C5@3, S1 E5@3 |
| 10 | 11/11 | 4.5 | 3/4 | — | — | S1 D5@1.5 |
| 11 | 11/11 | 4.5 | 2/4 | — | — | S2 E3@0, S2 G3@0 |
| 12 | 12/12 | 4.5 | 2/3 | — | — | S2 F3@0 |
| 13 | 9/11 | 4.5 | 0/2 | missing-dot 2 | missing-dot S1 C4@3 1.5→1; missing-dot S1 E4@3 1.5→1 | S2 E3@0, S2 G3@0 |
| 14 | 11/11 | 4.5 | 1/2 | — | — | S2 D3@0 |
| 15 | 11/11 | 4.5 | 0/0 | — | — | — |
| 16 | 8/8 | 4.5 | 2/2 | — | — | — |
| 17 | 3/3 | 4.5 | 0/0 | — | — | — |

분류 해석과 한계:

- `missing-dot` 12건 중 m3 S1 C5@1.5(0.75→0.5)는 **둘잇단 누락**이다. 둘잇단 8분과 점8분은 음가가
  같아 이벤트만으로는 구분할 수 없다. 실제 점 누락은 11건이다: m1 4, m2 2, m3 LH 2, m7 C4 1,
  m13 2. m7 `extra-dot` E4는 C4의 점이 E4에 붙은 오배정이다.
- `onset`·`onset-and-duration` 28건은 대부분 같은 성부 앞쪽 오류의 연쇄다. m3 둘잇단, m5 가짜
  셋잇단(0.5→1/3)과 성부 누락, m7 점 오배정, m9 베이스 성부 붕괴가 원인이다. 독립 onset 오류로
  세지 않는다.
- 누락 음표 3건: m5 F4 점2분·F4 점4분(공유 기둥 아랫성부 전체), m7 C4 점4분@3.
- 타이 누락 20건. 두 음 화음의 평행 타이 중 하나 누락(m3·m4·m12·m14), 둘 다 누락(m2·m11·m13 LH),
  위치가 밀린 성부의 타이(m3·m5·m9)로 나뉜다.
- 관찰된 기전 후보(**가설, 엔진 계측 전**): 점과 타이 곡선이 맞닿으면 둘 중 하나가 사라진다 —
  m1 RH는 점을 잃고 타이는 남았고, m10 D5는 점이 남고 타이를 잃었으며, m2 RH·LH도 같은 모양이다.
  2026-09-06 checkpoint의 "RH 점 부근 SYMBOL 조각과 slur glyph 교차" 관찰과 일치하지만 증명은 아니다.

## PR159 코드 변경의 검증

| 명령 | 결과 |
| --- | --- |
| `python3 -m unittest discover -s tests -p test_recognition_evaluation.py` (구현 전) | 신규 7개 중 6 error, 잇단음표 구분 1 fail, 운영 템포 1 fail — 기대한 적색 |
| 같은 명령 (구현 후) | 18 OK |
| `python3 -m unittest discover -s tests` | 160 ran, 1 error, 6 skipped. error는 `test_callback_delivery`의 로컬 `fastapi` 미설치로 base `36063aa`에서도 같다 |
| `npx jest src/utils/__tests__/musicxmlTiming.test.ts` (구현 전) | 3 failed / 14 passed. 다른 파트 선행음 가드는 전후 통과해야 하는 불변 조건이다 |
| `npx jest` (구현 후) | 1030 passed / 1 failed. 실패는 `omrCallbackDelivery`의 같은 `fastapi` 격차다 |
| `npm run lint` / `npx tsc --noEmit` | 0 warnings·0 errors / exit 0 |
| 29개 MusicXML `omr.cli` 전후 JSON 비교 | 26개는 `generated_at` 외 동일하다(Satie 239음·Always 647음·Love 411음 진단본, animation-contract 14, key-signatures 6, wedge 2, sample). 변경 3개는 모두 Clair 인식본(6/8 133음, 재시도 전 133음, gap0.4 164음)이고 바뀐 필드는 tempo 계열과 start뿐이다 |
| D-049 가드 on 실제 XML | before eligible True, accept True, 양쪽 시작 템포 69 |
| 자원 제한 | 런타임 추가 비용은 `scan_score` 안의 음표 1회 순회(O(notes))다. JVM·재시도·semaphore·timeout 경로는 바뀌지 않았고, `test_audiveris_runtime`·`test_meter_retry_runtime` 등 런타임 suite가 전체 실행에서 통과했다 |

로컬 `npm run build`는 실행하지 않았다(Python 모듈·테스트·문서만 변경). hosted CI 결과는 PR에서 확인한다.

## 하지 않은 것 / 다음 행동

- 점음표·타이·잇단음표·성부 누락은 **고치지 않았다**. D-049/D-052의 "XML을 사후 보정하지 않는다"를
  유지했고, 엔진 단계 교정은 Audiveris 실행이 필요하다.
- 운영 VM 신규 변환·이미지 빌드·배포·재시작은 하지 않았다. 필요한 다음 실험은 같은 PDF의 격리
  실험이며, 사용자 승인 후에만 진행한다.
  - SYMBOLS/LINKS/RHYTHMS 단계별 checkpoint에서 m1·m2·m10의 점/타이 inter 생성·삭제를 추적한다.
  - 기존 `/data/analysis` 방식으로 운영 서비스와 분리하고 JVM 1개·300s 제한을 둔다.
- 이 PR이 병합·배포돼도 #134 전체 해결이 아니다. 운영 재변환, 실제 플레이어 청취, 사용자 최종 확인이
  후속으로 남는다.
