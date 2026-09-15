# 2026-09-15 — #134 D-064 다른 화음 사이 점의 머리 연결: 구현 계측과 Codex 독립 검증

## 범위와 조건

- 대상: 브랜치 `codex/issue-134-cross-chord-dot` 커밋 `deb3708`(main `8591ce7` 위). push·PR·병합·배포 없음.
- 결정: D-064(Proposed, 같은 브랜치의 `DECISIONS.md`). D-062 결정 2를 대체한다. 근거 조사: [박 위치 오류 조사](2026-09-15-issue-134-onset-mechanisms.md) 기전 A.
- 변경: `0002-line-head-dot-link.patch`에서 "첫 후보 화음 안에서만" 조건 제거. 새 합성 fixture `cross_chord_dots_fixture.py`·
  `test_cross_chord_dots_native.py`, 정적 테스트·Dockerfile 주석·Jest contract 목록 갱신.
- 실행은 모두 로컬 Docker Desktop(arm64 호스트, `--platform linux/amd64`, 인식 컨테이너 `--network none`)이다. 운영 VM 접근은 없다.
- 기준선 이미지 `clairkeys-omr:d063-patched`(`7cb6700d…`): 운영(PR162)과 Clair MusicXML이 메타데이터를 빼면 같다.
  main의 이후 OMR 변경은 0003 패치의 공백 12자뿐이다(워커 확인).
- 산출물(Git 제외): `local-test-data/results/issue134-cross-chord-dot-2026-09-15/`
  - `fixture/`, `build/`, `patch/`, `clair/`: 코디네이터 실험(이미지 `clairkeys-omr:d064-exp` = d063-patched + 패치 클래스 교체, Dockerfile 빌드 아님)
  - `codex-verification/`: 워커 지시서 `PROMPT.md`, 보고서 `REPORT.md`, 원시 로그·크롭

## 구현 중 계측 (코디네이터)

- 새 fixture를 `d063-patched`에서 실행: 위 화음이 먼저인 마디 1·3·5·7은 점이 위 4분음표로 가고(점4분 + 점 없는 2분), 아래 화음이 먼저인
  마디 2·4·6·8은 맞았다. 두 화음의 순서는 아래 머리를 ±3px 옮겨 정했다.
- `d064-exp`: fixture 8/8. Clair 1회 원본 이벤트 153 → 160/191, 바뀐 마디는 m7뿐.
- 호스트: `test_audiveris_runtime` 17 OK, native 테스트는 엔진이 없어 skip, Jest `omrRuntimeContract` 13/13.

## Codex 독립 검증

- 워커: Codex CLI 0.153.4 `gpt-5.6-sol`, reasoning effort high, `workspace-write` + network, 같은 워크트리.
  추적 파일 변경·커밋·브랜치 전환 없음. 최종 `git status`에는 사용자 미커밋 파일 하나만 있었다.
- 판정: **PASS WITH CONCERNS**. 상세는 `codex-verification/REPORT.md`.

| # | 검증 | 결과 |
|---|---|---|
| 1 | pinned sha256·패치 적용 | 통과. Dockerfile·GitHub raw·로컬 사본 `4741eeaf…` 일치. `--ignore-whitespace` 없이 적용되고, 결과는 d064-exp 소스와 바이트 단위로 같다 |
| 2 | 코드 리뷰 | 우려 2건(중간)·정확성 지적 1건(낮음). 새 NPE·ClassCastException 경로 없음. 아래 참조 |
| 3 | 전체 Dockerfile 빌드 `d064-patched` | 통과(`--no-cache` 재빌드 포함). 체크섬 7개 OK, `patching file` 4줄. normal·recovery 클래스 해시 `4c764c15…` 동일, D-063(`36f9b530…`)과 다름 |
| 4 | 이미지 테스트 | **177 OK / skip 0**. 새 fixture와 점·타이 native 테스트가 모두 실행·통과. 이미지 테스트 시간 47.9s → 77.8s(새 fixture가 두 엔진에서 약 30s) |
| 5 | fixture 판별 | d063-patched 3/3 실패(매회 두 엔진 모두 1·3·5·7 마디만 실패), d064-patched 3/3 통과 |
| 6 | Clair 3회 | 3회 모두 **160/191**, 타이 29/14/2, canonical 157, tempo 69, 정확한 마디 2·4·8·11·15·16·17. raw 이벤트 해시 3회(+no-cache 1회) 동일. 기준 대비 바뀐 마디는 m7뿐 |
| 7 | corpus 12개 | 10개 raw·canonical 동일. Love는 기록된 D-063 기준(드문 30마디 fallback)과 달랐지만 새로 순차 실행한 D-063·D-064가 둘 다 31마디이고 해시가 같아 **nondeterminism**으로 분류. truongca PDF는 양쪽 모두 page 3 `No regularly spaced lines found`로 같은 기존 실패(비교 불가, 통과로 보지 않음) |
| 8 | 시간 | 인식 시간은 통제 실행에서 증가 없음(Premiere 20.2s → 20.0s, Clair 24.4–26.0s → 25.2–26.5s). 빌드 약 160s → 162s |

### Clair m7

- 저장 그래프: 점 `#4619`(383,1793)가 C4 빈 머리 `#1754`에 연결됐다(`augmentation dx 0.6 dy 0.45 grade 0.625`). 기준선에서는 E4 `#1714`였다.
- m7: 일치 7 → 14, `missing-dot 1 + extra-dot 1 + onset 5 + missing 1` → `missing 1`. 남은 1건은 기전 B(2도 반대편 C4 머리 누락)다.
- 전체 분류: onset 18 → 13, missing-dot 4 → 3, extra-dot 1 → 0. onset-and-duration 8·duration 4·missing 3은 그대로다.

### 코드 리뷰 우려

1. **중간 — 다성부의 반대 관행**: 아래 성부가 줄 위 머리의 점을 아래 칸에 찍고, 그 칸 아래에 다른 화음의 줄 위 머리가 있으면 점이 그 머리로 간다.
   D-064 Directive에 적은 위험이 실제 코드 경로라는 확인이다. corpus에서는 나타나지 않았고 전용 fixture도 없다.
2. **중간 — 다른 x 위치 후보도 순서로 선택**: x 겹침 조건이나 relation grade 비교 없이, 탐색 상자 안에서 점보다 아래에 있는 첫 머리가 이긴다.
   기존 x/y/grade 문턱이 범위를 제한하고, Clair 외 안정적인 corpus 결과는 바뀌지 않았다. 그래도 규칙의 적용 범위는 Clair의 겹친 모양보다 넓다.
3. **낮음 — 문구 정확성**: D-064의 "첫 후보 화음"은 "연결 조건을 통과한 후보가 있는 첫 화음"이어야 정확하다. 이미 점이 있거나 x/y/grade에서
   탈락한 머리는 후보가 아니다. 코드 결과 문제는 아니다.
- 추적만 하고 실행 fixture가 없는 상호작용: 공유 머리·mirror, 쉼표와 동시 도달, 겹점.

## 미검증

- 운영 VM 이미지 빌드·배포·재업로드·API/콜백 E2E(금지 범위).
- 우려 1·2의 실제 악보 사례. 현재 corpus 12곡에서는 0건이다.
- 타이밍은 arm64 호스트의 amd64 에뮬레이션이다. 메모리 프로파일은 하지 않았다(6 GiB 상한 안에서 OOM 없음).

## 남은 결정

- 우려 2를 D-064의 알려진 한계로 받아들일지, x 겹침 조건 등으로 좁힐지는 사용자 판단이 필요하다. PR은 그 뒤에 만든다.
