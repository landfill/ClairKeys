# 2026-09-13 — #134 줄 위 3도 화음 점 연결 패치 (D-062, PR161)

## 범위와 승인

- 사용자 요청: "1번 점 연결 패치 진행해줘". HANDOFF 다음 행동 1번(점 연결 엔진 패치 후보 격리 검증)이다.
- 실행은 **로컬에서만** 했다. 운영 VM 접근, 이미지 배포, 서비스 재시작, 저장 악보 변경은 없다.
  원본 PDF는 Git 제외 `local-test-data/scores/`에서 읽기 전용으로 마운트했고, VM으로 전송하지 않았다.
- 작업 브랜치 `codex/issue-134-dot-head-link`, 커밋 `42736a23d1468ebe64ac5a19410ebfccf2fcb096`,
  PR [#161](https://github.com/landfill/ClairKeys/pull/161). 비교 기준 main은 `b74fcee`.
- 로컬 결과 폴더(Git 제외): `local-test-data/results/issue134-dot-link-2026-09-13/`
  (`run_case.py`, `run_all.sh`, `compare.py`, `stock/`, `dot/`, `repeat/`, 평가 JSON).

## 원인 코드 확인

- `AugmentationDotInter.lookupHeadLink`(pinned `9e1e55cd…`): 칸 사이 머리가 있으면 그것을 고르고, 없으면
  `links.get(0)`을 고른다. 후보는 화음 x 순서, 화음 안 위→아래 순서다. 주석의 "second priority: head on
  lower line"은 구현돼 있지 않다.
- y 허용치 `yGapMax` 0.8(profile 1은 1.2) interline이므로, 점 옆 줄 머리 후보는 바로 위·아래 줄뿐이다.
- pinned 파일 sha256 `4741eeaf…fa87b`(CRLF)는 로컬 `sol-source` 사본과 같다. 2026-09-13 upstream master도
  CRLF를 제거하면 같다. 이 파일의 최근 upstream 변경은 저작권 연도와 rest 연결(2025-11-25)뿐이다.

## 패치

- `omr-service/audiveris-patches/0002-line-head-dot-link.patch`(sha256 `c3fec396…e0dd`): 칸 사이 머리 우선은
  그대로 둔다. 그 뒤 첫 후보와 같은 화음에서 center y가 점보다 큰 첫 머리를 고르고, 없으면 `links.get(0)`이다.
- `Dockerfile.audiveris`:
  1. JDK 25 체크섬 검사.
  2. `AugmentationDotInter.java` 다운로드와 sha256 검사.
  3. CRLF 제거 → 패치 → `javac --release 25` → `/opt/audiveris` jar의 `org/audiveris/omr/sig/inter` 갱신과
     클래스 존재 확인.
  4. 기존 ledger 패치 컴파일 → `cp -a /opt/audiveris /opt/clairkeys-audiveris-recovery` → ledger 클래스 갱신.
- 순서가 중요하다. recovery engine이 dot 패치 뒤에 복사되므로 D-054 wedge 후보(SYMBOLS는 recovery,
  PAGE는 normal)와 선택 graph가 같은 점 규칙을 쓴다.

## 테스트 선행

| 명령 | 결과 |
| --- | --- |
| `cd omr-service && PYTHONPATH=. python3 -m unittest tests.test_audiveris_runtime` (패치 파일만 추가, Dockerfile 변경 전) | 16 ran, **1 failure**: `test_every_engine_links_a_line_third_dot_to_the_head_below_it` — pinned sha256 없음 |
| 같은 명령 (Dockerfile 변경 후) | 16 OK |
| `PYTHONPATH=omr-service python3 -m unittest discover -s omr-service/tests` | 161 ran, 1 error. `test_callback_delivery`의 로컬 `fastapi` 미설치이며, PR159 기록의 base 결과와 같은 격차다 |
| 패치 이미지 안: `docker run --network none -v $PWD:/repo:ro -w /repo/omr-service clairkeys-omr:dot-link … unittest discover -s tests` | **173 OK** (skip 0 — Git 제외 원본 진단 파일이 마운트돼 있음) |
| `git diff --check` | 통과 |

- 이미지 테스트는 Dockerfile 주석 한 단락과 D-062 문구를 다듬기 전에 실행했다. 두 변경 모두 빌드 명령과
  테스트 코드를 바꾸지 않는다. 다듬은 뒤 `tests.test_audiveris_runtime` 16 OK를 로컬에서 다시 확인했다.
- Jest·lint·tsc·build는 실행하지 않았다(프론트엔드·Node 파일 변경 없음). hosted CI는 PR에서 확인한다.

## 바이트코드 동일성

- stock 이미지 안에서 체크섬 검사한 JDK 25로 **패치 없는** pinned 소스를 컴파일했다. release jar의
  `AugmentationDotInter.class`와 `javap -c -p` 출력(상수 풀 번호 `#n` 제거)을 비교하니 같았다.
  major version 69이며, 이 파일에서 나오는 클래스는 하나다.
- 따라서 교체되는 클래스의 차이는 패치 한 hunk뿐이다. 클래스 크기는 16505 → 13217 바이트다. release
  빌드와 디버그 정보 옵션이 달라서 생긴 차이이고, 명령 비교에는 영향이 없다.
- 패치 이미지에서 두 jar 모두 새 클래스(13217B)를 담고, recovery jar에는 `LedgersPostAnalysis.class`도 있다.

## 로컬 이미지

- Docker Desktop 29.4.0(arm64 호스트, `--platform linux/amd64` 에뮬레이션), 메모리 8GB.
- `clairkeys-omr:stock-main` = main `b74fcee`의 `Dockerfile.audiveris`, image `5c51aab0…d8b3`.
- `clairkeys-omr:dot-link` = 브랜치 작업본, image `aa55c6cf…e5e9`. 빌드 로그에 deb·tessdata·JDK·두 소스의 sha256 OK와
  `patching file`이 두 번 찍혔다.
- 로컬 이미지는 운영 이미지와 같은 Dockerfile로 만든 별도 빌드다. 운영 이미지 해시와 같다고 주장하지 않는다.
  기본 엔진 결과는 기존 운영 기록과 같다: Clair 163음·템포 69·재시도 선택, Satie 239, Always 647.

## Corpus 비교

- 실행: `run_all.sh <stock|dot> <PDF 이름>`. 케이스마다 `docker run --rm --network none --memory 6g`로
  실제 `AudiverisProcessor(process_timeout_seconds=900).process_pdf` → `MusicXMLToClairKeysConverter`를
  돌린다. API·콜백·DB 쓰기는 없다. JVM은 한 번에 하나다.
- 비교: `compare.py`. 선택 결과(재시도 포함)의 raw MusicXML note 이벤트(pitch/rest/chord/grace/duration/
  type/dots/voice/staff/tie/time-modification)와 canonical `notes` 배열 전체를 대조했다.

| PDF | 선택 | stock 점/canonical | dot 점/canonical | raw 이벤트 | canonical |
| --- | --- | --- | --- | --- | --- |
| Clair_de_Lune_easy_300dpi | 9/8 재시도 | 102 / 163 | 112 / 163 | 20줄 차이 | 음가·시작 변경 |
| satie-gymnopedie-1 | 기본 | 88 / 239 | 88 / 239 | 동일 | 동일 |
| Premiere_Gymnopedie_300dpi | 기본 | 84 / 283 | 89 / 283 | 10줄 차이 | 음가 변경 |
| Always_With_Me_2pages_300dpi | 기본 | 8 / 647 | 8 / 647 | 동일 | 동일 |
| Love_Affair_Piano_Solo | wedge 재시도 | 19 / 431 | 19 / 431 | 동일 | 동일 |
| piano-solo-love-affair…truongca | — | exit 1 | exit 1 | — | — |
| My_Neighbor_Totoro_2pages_300dpi | 기본 | 6 / 318 | 6 / 318 | 동일 | 동일 |
| Merry_Go_Round_of_Life_2pages_300dpi | 기본 | 19 / 265 | 19 / 265 | 동일 | 동일 |
| Deborahs_Theme…_2pages_300dpi | 기본 | 15 / 330 | 15 / 330 | 동일 | 동일 |
| Princess_Mononoke…_300dpi | 기본 | 43 / 1053 | 43 / 1053 | 동일 | 동일 |
| bach-wtk1-prelude1 | 기본 | 54 / 514 | 54 / 514 | 동일 | 동일 |
| Toy Story … easy ver | 기본 | 12 / 328 | 12 / 328 | 동일 | 동일 |
| 드비시달빛 (쉬운편곡, 3쪽 3/4) | 기본 | 135 / 564 | 147 / 564 | 24줄 차이 | 음가 변경 |

- truongca판은 두 엔진 모두 3쪽에서 `StepException: No regularly spaced lines found`, `Error in export`로 실패한다.
  2026-09-06 운영 API 실패(Audiveris exit 1)와 같은 기존 실패다.
- 달라진 3개 PDF의 모든 차이는 줄 위 3도 계열 화음의 `dots 0 → 1`과 그에 따른 duration뿐이다.
  pitch·voice·staff·tie·chord·type·이벤트 수는 바뀌지 않았다.
  - Clair: m1 LH E4/G4, m2 RH B4/D5, m3 LH E4/G4 두 화음, m13 RH C4/E4.
  - Première Gymnopédie: m46 RH C4/E4/A4/A4/C5(2번 엔딩).
  - 달빛 쉬운편곡: m4·m68 RH B4/D5, m6·m70 LH E4/G4, m8·m72 RH G♯4/B4.
- 원본 대조:
  - 바뀐 모든 마디에서 stock은 해당 성부의 합이 모자랐다: 3/4에서 2박, Clair 9/8(division 12)에서 42/48.
    dot은 마디 길이(3박 / 54)와 같다. 다만 Clair m1 RH는 48로 남는다(아래 참조).
  - Première Gymnopédie 300dpi 크롭과 달빛 쉬운편곡 1쪽 렌더에서 해당 화음의 점을 눈으로 확인했다.
    렌더는 스크래치 경로에만 두었고 저장소에 넣지 않았다.
  - m68–72는 1쪽 m4–8과 같은 음형이 반복되는 곳이다. 렌더로 직접 보지 않았고, 마디 길이 일치로만 확인했다.
- Love는 두 엔진 모두 whole-note·wedge 재시도 경로를 거쳐 wedge 결과를 선택했고, 결과가 같다.
  recovery engine이 dot 패치를 공유해도 D-054 가드가 후보를 거절하지 않았다.

## Clair 원본 기준 평가

명령: `cd omr-service && python3 -m omr.recognition_evaluation ../fixtures/recognition/clair-de-lune-full-reference.json <retry.mxl>` (두 경우 모두 exit 1 = 불일치 남음)

| 지표 | stock | dot |
| --- | --- | --- |
| 이벤트 | 143/191 | **153/191** |
| missing-dot | 12 | 4 |
| onset-and-duration | 10 | 8 |
| onset / duration / missing / extra-dot | 18 / 4 / 3 / 1 | 18 / 4 / 3 / 1 |
| 타이 시작 | 23 | 23 |
| 시작 템포 | 69 일치 | 69 일치 |
| retry.mxl sha256 | `e28b9094…778f` | `ef2f02d2…8d17` |

- 남은 missing-dot 4건:
  - m1 RH C5/E5 2건: 타이 곡선이 점 glyph를 자르는 별도 기전.
  - m3 RH C5@1.5: 둘잇단 누락.
  - m7 C4: 점이 E4에 오배정됨(extra-dot 1과 짝).
- 이 패치는 D-049/D-052의 XML 사후 보정 금지를 지킨다. 달라지는 것은 SYMBOLS가 이미 인식한 점 glyph의 연결뿐이다.

## 반복성

- Clair를 각 엔진으로 두 번 더 실행했다(`repeat/stock-2,3`, `repeat/dot-2,3`).
- dot: 3회 모두 153/191, 점 112이고 raw 이벤트가 첫 실행과 같다.
- stock: 143 / **141** / 143. `stock-2`만 m7 베이스 F3/A3(인접 두 줄) 화음이 점4분 → 4분으로 바뀌었다.
  2026-09-13 VIP 기록의 "동률 처리 순서가 실행마다 달라진다"와 같은 현상이다.
  패치 뒤에는 이 화음이 순서와 무관하게 점을 유지한다.

## 실행 가능한 회귀 fixture (PR161 리뷰 대응, 2026-09-14)

- 커밋 `252aa27`: `tests/line_third_dots_fixture.py`로 합성 3/4 악보를 생성하고, `tests/test_line_third_dots_native.py`를
  설치된 엔진마다 실행한다. 설계와 반복 결과는 [PR161 리뷰 로그](../reviews/PR-161.md)에 있다.
- 결과: stock 이미지는 normal·recovery 모두 3/3회 실패하고, 패치 이미지는 3/3회 통과한다. 전체 이미지 suite는 174 OK다.
  hosted CI에서는 엔진이 없어 skip한다. 운영 배포 시 이미지 테스트 실행이 이 회귀의 실제 관문이다.

## 하지 않은 것 / 한계

- 운영 VM 배포, 같은 PDF 재업로드·콜백·플레이어 청취, 사용자 확인. 병합과 배포는 각각 명시적 승인이 필요하다.
- 여러 화음에 걸친 줄 머리 후보 모양은 corpus에서 관찰하지 못했다. 설계상 그 경우 결과는 기존과 같다.
- 한 명(에이전트)의 시각 확인이다. Clair 이외 곡에는 전곡 기준 fixture가 없어 변화한 마디만 대조했다.
- 실행 시간은 amd64 에뮬레이션 수치(Clair 31–38초, Love 120–132초)라 운영 성능 근거가 아니다.
  두 엔진 사이에 체계적인 차이는 보이지 않았다.
- 타이 20건, m1 RH 점, m3 둘잇단, m5·m7·m9 성부 오류는 범위 밖이다.
