# 2026-09-15 — D-064 다른 화음 사이 점 머리 연결 OMR VM 배포 (PR163)

Authorization: 사용자가 2026-09-15 "승인. vm 배포도 승인"으로 PR163 병합과 운영 VM 배포를 명시 승인했다.
PDF 업로드 스모크는 이 승인에 포함하지 않았다.
Target: `0e3dc615ca06af3ca3c5d6f031d3482391048a60` (PR163 병합 커밋)
Image: `2a71ede5cfb21c5b7af126bb28fefa3aad22e0e3957119975e18fc7db5b61a9e`
Prior image: `f5959ea95c7cab971ed397053719992f809f1bccf2ad271c8814a68566e8d6c0` (`0a22d2f`, PR162)

## 범위

- `0a22d2f..0e3dc61`의 `omr-service` 변경은 다섯 파일이다: `Dockerfile.audiveris`(주석), `audiveris-patches/0002-line-head-dot-link.patch`,
  `tests/cross_chord_dots_fixture.py`, `tests/test_cross_chord_dots_native.py`, `tests/test_audiveris_runtime.py`.
- `deploy/`, `requirements*`, Python 인식 코드, unit, env는 바뀌지 않았다.

## 사전 점검과 빌드

- `/opt/clairkeys-deploy`는 `0a22d2f`에서 깨끗했다(`git status --porcelain` 0줄). fetch 후 target 커밋이 존재했다.
- 서비스 active, 운영 컨테이너 image `f5959ea9…` healthy, JVM 0(`pgrep -f [j]ava`). `/data/processing`에는 기존 `8e33ffee…` 하나뿐(건드리지 않음). 디스크 89GB 여유.
- `git checkout --detach 0e3dc61`(checkout 후 0줄) 뒤 `omr-service/`에서 빌드했다:

```sh
podman build --format docker --label org.opencontainers.image.revision=0e3dc615ca06af3ca3c5d6f031d3482391048a60 \
  -f Dockerfile.audiveris -t localhost/clairkeys-omr:0e3dc615ca06af3ca3c5d6f031d3482391048a60 .
```

- `BUILD_EXIT=0`. 앞쪽 레이어(apt·Audiveris deb·tessdata 설치)는 이전 빌드 캐시를 재사용해 이번 로그에 deb·tessdata 체크섬 줄이 없다.
  새로 실행된 패치 레이어의 sha256 5개는 모두 `: OK`다: OpenJDK25, `AugmentationDotInter.java`, `SlurLinker.java`, `ClumpPruner.java`, `LedgersPostAnalysis.java`.
- `patching file` 4줄(AugmentationDotInter, ClumpPruner, SlurLinker, LedgersPostAnalysis). revision 라벨이 target과 같고 HEALTHCHECK는 유지됐다.

## 이미지 검증

PR162와 같은 명령(network none, fixtures/src 읽기 전용, 코드 overlay 없음):

```sh
podman run --rm --network none --workdir /app -v /opt/clairkeys-deploy/fixtures:/fixtures:ro \
  -v /opt/clairkeys-deploy/src:/src:ro --entrypoint sh <image> \
  -c 'ln -s /app /omr-service && python3 -m unittest discover -v -s tests -p "test_*.py"'
```

- **177 tests OK (skipped=6)**, 80.5초, exit 0. PR162 운영 176에 새 native 점 테스트 1개가 더해졌다.
- **`test_cross_chord_dots_native` … ok (skip 아님)**, `test_line_third_dots_native` … ok, `test_staff_line_ties_native` … ok. 세 테스트 모두 normal·recovery 엔진을 실행한다.
- skip 6개는 모두 `retained … not present`(로컬 진단 산출물 필요) 계열이며 native 테스트는 없다.
- `ERROR` 로그 11줄은 PR162 배포 테스트 로그와 같은 음성 경로 테스트(다중 MusicXML, timeout, callback 거부·302)의 의도된 로그다.
- 클래스 확인: 새 이미지의 normal·recovery jar `AugmentationDotInter.class` sha256이 둘 다 `4c764c15…3988`이다.
  Codex 워커가 로컬에서 빌드한 `d064-patched`와 같고, 직전 운영 이미지(`36f9b530…`)와 다르다.
- 로그: `local-test-data/results/cross-chord-dot-deploy-2026-09-15/pr163-build.log`(sha256 `9df70a4f…`), `pr163-image-tests.log`(`8ad34f35…`). VM `/tmp` 원본과 일치.

## 전환

- 직전 재확인(한 명령, 조건이 틀리면 중단): JVM 0, `/data/processing` 기존 1개, 실행 이미지 `f5959ea9…` — 모두 충족.
- 이전 이미지를 `localhost/clairkeys-omr:rollback-pr163-20260915`로 태그해 보존했다.
- 검증된 이미지를 `current`로 태그하고 `systemctl restart clairkeys-omr` → exit 0.
- 확인 결과:
  - health healthy, `podman healthcheck run` 성공, systemd active.
  - 실행 image = `current` = `2a71ede5…`, 롤백 태그 = `f5959ea9…`.
  - 전환 뒤 JVM 0, deploy checkout `0e3dc61` 변경 0줄, 최근 10분 서비스 journal의 error/traceback 0줄.
  - 외부 `http://101.79.16.73:3000/health` 200, 인증 없는 `POST /process` 401. (2026-09-15 20:38 KST)
- env·secret·unit·ingress는 바꾸지 않았다.
- 롤백: `podman tag localhost/clairkeys-omr:rollback-pr163-20260915 localhost/clairkeys-omr:current` 후 `systemctl restart clairkeys-omr`.

## 한계와 남은 범위

- 운영 인식 결과(Clair 160/191)는 아직 확인하지 않았다. 앱 재변환 또는 별도 승인된 운영 모듈 PDF 스모크가 필요하다.
  로컬 근거는 [D-064 검증](2026-09-15-issue-134-cross-chord-dot-head-link.md)이다.
- D-064 결정 5의 알려진 한계, 기전 B·C·D·E와 남은 타이는 그대로다. #134는 OPEN이다.
- VM `/tmp`의 build·test 로그는 로컬로 회수했고 VM에서는 지우지 않았다(PDF·이미지 없음).
