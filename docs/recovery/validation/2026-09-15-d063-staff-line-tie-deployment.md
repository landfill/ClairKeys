# 2026-09-15 — D-063 오선 흡수 타이 머리 연결 OMR VM 배포 (PR162)

Authorization: 사용자가 2026-09-15 PR162 병합 승인("승인.")에 이어 "vm 도 승인."으로 운영 VM 배포를 명시 승인했다.
PDF 업로드 스모크는 이 승인에 포함하지 않았다.
Target: `0a22d2fd0eda188c443f532cfe9cc2284e6286f0` (PR162 병합 커밋)
Image: `f5959ea95c7cab971ed397053719992f809f1bccf2ad271c8814a68566e8d6c0`
Prior image: `71594a4a65046d97f435f621c611736b3348fd9a9b2d3628679f9a3e6b7ecbaf` (`34f9e7e`, PR161)

## 범위

- `34f9e7e..0a22d2f`의 `omr-service` 변경은 다섯 파일이다: `Dockerfile.audiveris`, `audiveris-patches/0003-staff-line-tie-head-link.patch`,
  `tests/staff_line_ties_fixture.py`, `tests/test_staff_line_ties_native.py`, `tests/test_audiveris_runtime.py`.
- `deploy/`, `requirements*`, Python 인식 코드, unit, env는 바뀌지 않았다.

## 사전 점검과 빌드

- `/opt/clairkeys-deploy`는 `34f9e7e`에서 깨끗했다(`git status --porcelain` 0줄). fetch 후 target 커밋이 존재했다.
- 서비스 active, 운영 컨테이너 image `71594a4a…` healthy, JVM 0(`pgrep -f [j]ava`).
  - 처음 쓴 `pgrep -fc java`는 확인 명령 자신의 `sh -c` 문자열에 걸려 1을 보고했다. 자기 매칭을 피한 명령으로 0을 확인했다.
- `/data/processing`에는 기존 `8e33ffee…` 하나뿐이었다(건드리지 않음). 디스크 90GB 여유.
- `git checkout --detach 0a22d2f`(checkout 후 0줄) 뒤 `omr-service/`에서 빌드했다:

```sh
podman build --format docker --label org.opencontainers.image.revision=0a22d2fd0eda188c443f532cfe9cc2284e6286f0 \
  -f Dockerfile.audiveris -t localhost/clairkeys-omr:0a22d2fd0eda188c443f532cfe9cc2284e6286f0 .
```

- `BUILD_EXIT=0`. sha256 OK 6개: Audiveris deb, eng.traineddata, OpenJDK25, `AugmentationDotInter.java`, `SlurLinker.java`, `ClumpPruner.java`,
  `LedgersPostAnalysis.java`(모두 `: OK`). `patching file` 4줄(AugmentationDotInter, ClumpPruner, SlurLinker, LedgersPostAnalysis).
- revision 라벨이 target과 일치하고 HEALTHCHECK(`curl -f http://localhost:8000/health`)가 유지됐다.

## 이미지 검증

PR161과 같은 명령(network none, fixtures/src 읽기 전용, 코드 overlay 없음):

```sh
podman run --rm --network none --workdir /app -v /opt/clairkeys-deploy/fixtures:/fixtures:ro \
  -v /opt/clairkeys-deploy/src:/src:ro --entrypoint sh <image> \
  -c 'ln -s /app /omr-service && python3 -m unittest discover -v -s tests -p "test_*.py"'
```

- **176 tests OK (skipped=6)**, 47.3초, exit 0. PR161 운영 174에 새 정적 계약 1개와 네이티브 타이 테스트 1개가 더해졌다.
- **`test_staff_line_ties_native` … ok (skip 아님)**, `test_line_third_dots_native` … ok. 두 네이티브 테스트는 normal·recovery 엔진을 모두 실행한다.
- skip 6개는 모두 `retained … not present`(로컬 진단 산출물 필요) wedge/whole-note 계열이며 네이티브 테스트는 없다.
- `ERROR` 로그 7줄은 PR159·PR161과 같은 음성 경로 테스트의 의도된 로그 수다.
- jar 확인: 두 jar 모두 `SlurLinker.class`(15520B), `AugmentationDotInter.class`(13217B)가 빌드 시각으로 갱신됐다.
  운영 컨테이너 normal jar에 `ClumpPruner`·`ClumpPruner$ClumpLinker`·`ClumpPruner$SlurEntry`·`SlurLinker$Constants`·`SlurLinker$Parameters`가 있고,
  recovery jar에도 `sheet/curve/ClumpPruner*` 3개가 있다.
- 로그: `local-test-data/results/tie-deploy-2026-09-15/build.log`(sha256 `897fc92f…`), `image-tests.log`(`c5c11558…`). VM `/tmp` 원본과 일치.

## 전환

- 직전 재확인(한 명령, 조건이 틀리면 중단): JVM 0, `/data/processing` 기존 1개, 실행 이미지 `71594a4a…` — 모두 충족.
- 이전 이미지를 `localhost/clairkeys-omr:rollback-pr162-20260915`로 태그해 보존했다.
- 검증된 이미지를 `current`로 태그하고 `systemctl restart clairkeys-omr` → exit 0.
- 확인 결과:
  - health healthy, `podman healthcheck run` 성공, systemd active.
  - 실행 image = target 태그 image = `f5959ea9…`, 롤백 태그 = `71594a4a…`.
  - 전환 뒤 JVM 0, deploy checkout `0a22d2f` 변경 0줄, 최근 10분 서비스 journal의 error/traceback 0줄.
  - 외부 `http://101.79.16.73:3000/health` 200, 인증 없는 `POST /process` 401. (2026-09-15 14:3x KST)
- env·secret·unit·ingress는 바꾸지 않았다.
- 롤백: `podman tag localhost/clairkeys-omr:rollback-pr162-20260915 localhost/clairkeys-omr:current` 후 `systemctl restart clairkeys-omr`.

## 실제 운영 모듈 스모크 (저장 악보·DB 변경 없음)

- 승인: 사용자가 운영 확인 방법으로 "후자"(운영 모듈 PDF 스모크)를 골라 PDF의 VM 업로드와 실행을 명시 승인했다.
- 새 임시 root `/data/analysis/pr162-live-pkmvlC`를 만들었다. PR161 root는 읽기만 했다.
  - `smoke_retry.py`(`10aff167…`)와 기준표(`bba17974…`, 저장소 fixture와 동일)를 PR161 root에서 복사했다.
  - 입력 `input.pdf` sha256 `34d06c77…e5478`이 기준 입력과 일치했다.
- 실행 직전(한 명령의 조건): JVM 0, 실행 이미지 `f5959ea9…`.
- 실행: `podman exec -e PYTHONPATH=/app clairkeys-omr-prod python3 <root>/smoke_retry.py <root>/input.pdf <root>/result <root>/clair-de-lune-full-reference.json` → exit 0.
- report 결과: `processorSource=/app/omr/audiveris.py`, 28.31초, 선택 `meter-retry-0zjhhk92/retry.mxl`, 9/8, **157음**(PR161 운영 163), tempo·scoreTempo 69.
  경고는 bar 9 overflow 하나로 PR161과 같다.
- 원본 17마디 기준 평가:
  - 이벤트 **153/191**(PR161 운영과 같음). 분류 `duration 4, extra-dot 1, missing 3, missing-dot 4, onset 18, onset-and-duration 8`도 PR161과 같다.
  - 타이 시작 **29/43**(PR161 운영 23), 누락 **14**(20), 오검출 **2**(2, m3 MIDI 76·m5 MIDI 67 그대로).
  - 정확한 마디 **2·4·8·11·15·16·17**(PR161 운영 8·15·16·17). 회복된 타이가 있는 m2·m4·m11이 정확해졌다.
  - openingTempo 기대 69 = 실제 69.
  - 157음은 새로 이어진 타이 6개가 canonical에서 한 음으로 합쳐진 결과다.
- 로컬 결과와의 동일성: 운영 `retry.mxl`과 Codex 검증 이미지 `d063-patched` Clair 결과(`codex-verification/patched/clair-1`)는
  `identification`/`encoding`을 제거하면 MusicXML 트리가 같고, 평가 JSON 전체가 바이트 단위로 같다.
- 회수: PDF·`.omr`을 제외한 9개 파일을 `local-test-data/results/tie-deploy-2026-09-15/live/`로 가져왔고 sha256 9/9가 일치했다.
- 정리: 회수와 분리한 명령으로 `input.pdf`, `result/input.omr`, `result/meter-retry-0zjhhk92/retry.omr`만 지웠다.
  이후 root 안 `*.pdf|*.omr|*.png`는 0개이고, XML·JSON·로그·스크립트 9개는 VM root에 남아 있다.
- 최종: 서비스 active, image `f5959ea9…` healthy, JVM 0, 외부 health 200.

## 한계와 남은 범위

- 운영 수치는 운영 모듈 스모크로 확인했다. 웹 업로드→콜백→플레이어 E2E는 아니다.
- 플레이어 청취, LINKS 해제 경로(D-063 결정 4) 실사례, 기전 A 3건·m12 X자 교차·시스템 경계 오연결 등 나머지 누락 타이는 남아 있다. #134는 OPEN이다.
- VM `/tmp`의 build·test 로그는 로컬로 회수했고 VM에서는 지우지 않았다(PDF·이미지 없음).
