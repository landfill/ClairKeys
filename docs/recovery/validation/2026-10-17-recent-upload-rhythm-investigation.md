# 최근 업로드 3곡 박자 조사

Date: 2026-10-17 KST
Scope: 사용자 요청에 따른 읽기 전용 원인 조사. 제품 코드·운영 데이터·배포 변경 없음.

## 결론

이전 4곡과 최근 3곡의 인식 엔진·MusicXML→초 변환 경로가 달라졌다는 근거는 없다.
같은 엔진에서 입력별로 생긴 OMR 리듬 오류, 빠르기 지정 차이, 기존 Swing 미지원이 겹친 결과다.
빠르기 조정만으로 누락 음표·마디 길이·Swing 문제를 해결할 수 없다.

## 대상과 저장 데이터

운영 DB `SheetMusic` 최신 7행과 그 ID에 한정한 `SheetScoreArtifact`를 조회하고 해당 animation JSON 7개를 읽었다.
최근 3곡은 2026-10-15 20:18–20:19 KST 업로드, 비교 4곡은 2026-09-29–30 업로드다.

| ID | 곡 | tempoSource / 4분음표 기준 BPM | 박자 | canonical 음표 | 길이(초) |
|---|---|---|---|---:|---:|
| 93 | Piano Solo - Love Affair | user / 60 | 4/4 | 431 | 123 |
| 94 | Deborah's Theme | user / 60 | 4/4 | 330 | 154 |
| 95 | Clair de Lune | user / 69 | 9/8 | 150 | 65.217392 |
| 99 | I Will Always Love You | user / 68 | 4/4 | 232 | 169.963235 |
| 100 | You've Got a Friend in Me | unknown / 60 | 4/4 | 328 | 151 |
| 101 | My Neighbor Totoro | unknown / 60 | 4/4 | 318 | 180.25 |
| 102 | Always With Me | user / 43 | 6/8 | 647 | 177.906977 |

100・101의 `tempo`와 `scoreTempo`는 null이다. 60은 인식한 빠르기가 아니라 내부 시간 계산 기준이다.
102의 `scoreTempo`도 null이며, 43은 사용자 지정 출처로 저장돼 있다. 제출 당시 UI의 선택 단위 자체는 DB에 보존되지 않아 확정하지 않는다.

## 처리 경로 대조

- 실행 중인 컨테이너 `clairkeys-omr-prod` 이미지 ID는 `afa179723bc21f2a2b06d8f53251eb8bfc22a8372bb4dec4a875711fe4549d6f`다.
  생성·시작은 2026-09-20 16:57 KST, restart count 0. [기존 배포 근거](2026-09-20-issue-125-vm-evidence.json)의 이미지와 같다.
- 현재 VM `/opt/clairkeys` checkout은 오래된 `43a5b14`이지만 실행 컨테이너 코드와 혼동하면 안 된다.
  컨테이너와 로컬 main의 `omr/converter.py` SHA-256은 모두 `bfaecc0df24f27974a2081a1f786898e0d148e685c2c439e8b55b70e848717aa`,
  `omr/musicxml_timing.py`는 모두 `e6361471e0db4ed396ef52836c5db2c0ef878521103c4ccaa4f4fa8a6892e02c`다.
- 7곡 모두 저장 MusicXML의 software가 `Audiveris 5.11.0`, `ProxyMusic 4.0.3`으로 같다.
- 최근 3곡의 해당 시간대 컨테이너 로그에서 같은 `/opt/audiveris/bin/Audiveris -batch -export` 경로와 순차 실행을 확인했다.
  추출 음표 수 328 / 318 / 647은 저장 JSON과 같다. 선택된 recovery/fallback/retry, warning/error 로그는 없었다.
  native stdout 전체는 서비스 성공 로그에 남지 않으므로 native 내부의 모든 경고가 없었다는 뜻은 아니다.
- 저장 MusicXML 7개를 현재 `MusicXMLToClairKeysConverter.convert()`로 다시 계산했다.
  `tempoSource=user`인 곡은 저장 BPM을 전달하고, unknown은 tempo를 전달하지 않았다.
  **7/7 곡의 모든 음표 `midi/start/duration/hand`가 저장 JSON과 정확히 같았다.**
  따라서 저장·전달 과정에서 별도 타이밍 변형이 생겼다는 근거는 없다. PDF→OMR 재인식은 수행하지 않았다.

## 곡별 확인

### 100 — You've Got a Friend in Me

- 로컬 보관 PDF 첫 페이지에 `Swing`, 4/4가 있다. 수치 BPM은 첫 페이지에 없다.
- 저장 MusicXML에 템포 이벤트가 없고 JSON은 unknown/60 기준이다. 이전 네 곡의 user BPM과 다르다.
- 출력 MusicXML 기준 11·21·29·37마디가 4분음표 4개 대신 **4.5개** 길이다.
  17·18·34마디는 3개 길이로 짧다. 이 길이로 다음 마디가 시작하므로 국소적인 박 위치가 달라진다.
- converter/timeline에는 Swing·shuffle 해석이 없다. 명시적 셋잇단음표 duration은 읽지만, `Swing` 지시로 일반 8분음표를 바꾸지는 않는다.
  따라서 템포를 지정해도 Swing 표현과 잘못 인식된 마디는 남는다.

### 101 — My Neighbor Totoro

- 로컬 보관 PDF의 첫 두 마디 왼손 온음표가 저장 XML 첫 두 measure에는 없다.
- 첫 인쇄 마디가 XML에서는 `number=0, implicit=yes`이고 길이가 **3.5박**이다.
  다음 XML `number=1`은 **5박**, 다음 `number=2`는 **3.75박**이다(원본 첫 부분은 4/4).
- implicit 마디는 overflow 진단 대상에서 제외돼, 저장 경고의 `1마디`는 인쇄상 두 번째 마디다.
  진단 번호를 원본 인쇄 번호와 동일하다고 읽으면 안 된다.
- 템포 인식도 없어서 unknown/60으로 저장됐다. 템포만 바꿔도 초반 누락·길이 오류는 남는다.

### 102 — Always With Me

- 로컬 보관 PDF는 **점4분음표=43**, 6/8이다. 계약상 4분음표 BPM으로는 **64.5**다.
  저장 43은 원본 표기 대비 속도가 2/3이고 재생 시간은 1.5배다(동일 음표 타이밍을 기준으로 한 비율).
- `src/utils/tempoInput.ts`는 dotted-quarter를 1.5배로 변환하며 업로드 기본 단위는 quarter다.
  현재 데이터로 확인되는 사실은 정규화된 BPM 43이 저장됐다는 것까지다. 어떤 UI 조작으로 그렇게 됐는지는 확정하지 않는다.
- OMR XML에는 원본 첫 마디 왼손의 점4분음표가 점 없는 4분음표로 나타나는 등 길이 손실도 있다.
- 출력 8마디는 6/8의 3 quarter 대신 **3.5 quarter**다. 4·7·19·20·29마디도 3보다 짧다.
  10·37마디의 1.5 quarter는 3/8 변경 구간이므로 짧다는 이유만으로 오류로 분류하지 않았다.

## 이전 곡과의 차이 및 기존 한계

- 이전 4곡은 모두 user BPM이 지정돼 있었다. 최근 100·101은 자동 인식에 맡긴 결과 unknown, 102는 원본 단위와 맞지 않는 정규화 BPM이다.
- 이전 95는 17개 measure 모두 4.5 quarter로 안정적이고 overflow 경고가 없다.
  다만 이전 곡도 무오류는 아니다. 93은 11·19마디 3.5 quarter, 94는 짧거나 빈 measure가 있고,
  99는 30마디 4.25 quarter와 미전개 반복 지시 경고가 있다. 이전 전체가 정확했다고 단정하지 않는다.
- [D-048 및 D-049/D-052](../DECISIONS.md)에 따라 인식 결과의 마디 길이를 강제로 맞추거나 음표·쉼표를 임의 보충하지 않는다.
  `scan_score()`는 실제 인식 길이로 다음 마디를 배치한다. 잘못된 OMR 길이가 재생에도 이어지는 기존 동작이다.
- UI `ScoreTimingNotice`는 overflow를 경고하지만 이를 고치지는 않는다. unknown tempo 안내도 리듬 복구 기능은 아니다.

## 실행·결과·한계

1. 세션 시작 `git fetch origin`(sandbox 쓰기 거부 후 승인된 실행으로 성공), main/clean 확인, `main..origin/main=0`.
2. Supabase `execute_sql`: 최신 SheetMusic 12행 LIMIT 조회(실제 7행), artifact key 조회,
   `WHERE "sheetMusicId" IN (100,101,102,99,95,94,93) LIMIT 7`로 대상 artifact 읽기 성공.
   최초 전체 artifact 조회는 자동 승인 검사가 범위 없는 전체 본문 추출을 거부했다. ID 제한 조회로 안전하게 대체해 조사에 지장 없음.
3. 각 대상의 기존 public animation URL 7개 읽기 성공. DB·Storage 쓰기 없음.
4. SSH `systemctl is-active`, `podman ps/inspect/exec sha256sum`, 지정 시간대 `podman logs` 읽기 성공.
   컨테이너 재시작·배포·운영 PDF 재처리 없음.
5. `pdftoppm -f 1 -singlefile -scale-to 1800 -png`로 로컬 보관 PDF 3개 첫 페이지 렌더·육안 대조.
   업로드 원본 PDF는 서비스 완료 후 삭제되므로 업로드 파일과 로컬 보관 파일의 바이트 동일성은 확인할 수 없다.
6. `PYTHONPATH=omr-service python3`로 7개 XML `scan_score`, `convert` 결과와 저장 JSON 비교: 위 7/7 일치.
7. 제품 코드 변경이 없어 전체 Jest·tsc·lint·E2E·build는 실행하지 않았다. 실제 청취·브라우저 재생·전체 PDF 음표 수작업 채점·재인식은 미수행.
8. 비공개 XML/JSON·PDF·렌더는 Git 제외 `local-test-data/results/rhythm-2026-10-17/`에만 보관한다.
   재계산 요약은 같은 디렉터리 `comparison.json`이다. 본 문서에는 원본 XML이나 사용자 식별 정보를 복제하지 않는다.
9. 편집 Markdown의 로컬 링크 29개 존재 확인 PASS, `git diff --check` PASS. 문서 전용 검증 범위다.

## 후속 범위 후보

이번 요청은 조사이므로 수정 PR·이슈·운영 데이터 변경은 만들지 않았다.
102 빠르기 단위 수정은 템포 문제만 해결하며, 세 곡의 원본 기준 리듬 fixture 평가와 Swing 지원은 별도 범위다.
새 작업에 착수하면 AGENTS에 따라 이슈 등록·회귀 fixture·작업 브랜치부터 진행한다.
