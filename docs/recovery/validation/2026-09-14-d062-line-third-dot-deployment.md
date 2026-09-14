# 2026-09-14 — D-062 줄 위 3도 점 수정 OMR VM 배포 (PR161)

Authorization: 사용자가 2026-09-14 "34f9e7e 배포 진행" 확인 요청에 "배포"로 명시 승인했고, "빌드 끝나면 계속 진행해"로 전환까지 지시했다.
Target: `34f9e7eeff89aa22693295d13107e07a4d7171b1` (PR161 병합 커밋)
Image: `71594a4a65046d97f435f621c611736b3348fd9a9b2d3628679f9a3e6b7ecbaf`
Prior image: `bd2d5e6e72864bc3d8f81848bcd6a7b4e8da5950e56fa2158ecd430fa4136eca` (`e5ee7bb`, PR159)

## 범위

- `e5ee7bb..34f9e7e`의 `omr-service` 변경은 다섯 파일이다:
  - `Dockerfile.audiveris`: 고정 커밋의 `AugmentationDotInter.java`를 sha256으로 검증하고 패치를 적용한다.
    컴파일한 클래스를 공식 `audiveris.jar`에 넣은 뒤 recovery 설치본을 복사하므로 두 엔진이 모두 점 수정을 받는다.
  - `audiveris-patches/0002-line-head-dot-link.patch`
  - 테스트: `test_audiveris_runtime.py`, `line_third_dots_fixture.py`, `test_line_third_dots_native.py`
- `deploy/`, `requirements*`, Python 인식 코드, unit, env는 바뀌지 않았다.

## 사전 점검과 빌드

- `/opt/clairkeys-deploy`는 `e5ee7bb`에서 깨끗했다(`git status --porcelain` 0줄). fetch 후 target 커밋이 존재했다.
- 서비스 active, 운영 컨테이너 image `bd2d5e6e…` healthy, JVM 0.
- `/data/processing`에는 기존 2026-08-21 `8e33ffee…` 하나뿐이었다(건드리지 않음). 디스크 91GB 여유.
- `git checkout --detach 34f9e7e`(checkout 후 0줄) 뒤 `omr-service/`에서 빌드했다:

```sh
podman build --format docker --label org.opencontainers.image.revision=34f9e7eeff89aa22693295d13107e07a4d7171b1 \
  -f Dockerfile.audiveris -t localhost/clairkeys-omr:34f9e7eeff89aa22693295d13107e07a4d7171b1 .
```

- exit 0. 레이어 캐시 없이 전체 재빌드됐다.
- 로그상 확인한 항목:
  - sha256 검증 OK: Audiveris deb, eng.traineddata, OpenJDK25, `AugmentationDotInter.java`, `LedgersPostAnalysis.java`
  - 두 패치 모두 `patching file` 적용
- revision 라벨이 target과 일치하고, HEALTHCHECK(curl /health, start 60s, interval 30s, timeout 10s, retries 3)가 유지됐다.

## 이미지 검증

PR159와 같은 명령에 `-v`만 더했다(network none, fixtures/src 읽기 전용, 코드 overlay 없음):

```sh
podman run --rm --network none --workdir /app -v /opt/clairkeys-deploy/fixtures:/fixtures:ro \
  -v /opt/clairkeys-deploy/src:/src:ro --entrypoint sh <image> \
  -c 'ln -s /app /omr-service && python3 -m unittest discover -v -s tests -p "test_*.py"'
```

- **174 tests OK (skipped=6)**, 26.0초, exit 0. PR161 리뷰 기록의 로컬 이미지 174와 같은 수다.
- **`test_line_third_dots_native` … ok (skip 아님)**: normal·recovery 엔진 모두에서 두 점 처리 순서 fixture를 통과했다.
  `test_every_engine_links_a_line_third_dot_to_the_head_below_it`(static 계약)도 ok다.
- skip 6개는 모두 로컬 전용 진단 산출물이 필요한 wedge/whole-note 테스트다.
  사유 문구는 `retained … not present`이고 native 점 테스트는 포함되지 않는다.
- `ERROR:` 로그 7줄은 PR159와 같은 음성 경로 테스트의 의도된 로그다: 다중 MXL, timeout, callback 거부 4건, 전달 포기.
- jar 내용(`unzip -l`) 확인:
  - normal `/opt/audiveris/…/audiveris.jar`: `AugmentationDotInter.class`(13217B)가 빌드 시각으로 갱신됐다.
    `LedgersPostAnalysis.class`는 원본 날짜(1980) 그대로다.
  - recovery `/opt/clairkeys-audiveris-recovery/…/audiveris.jar`: 두 클래스가 모두 패치본이다.
- 로그: `local-test-data/results/dot-deploy-2026-09-14/build.log`(sha256 `7c5be79e…`), `image-tests.log`(`b3035736…`).
  VM `/tmp` 원본과 sha256이 일치한다.

## 전환

- 직전 재확인 조건: JVM 0, `/data/processing` 항목 1개(기존), 실행 이미지 `bd2d5e6e…`. 조건이 틀리면 중단하도록 한 명령으로 묶었고 모두 충족했다.
- 이전 이미지를 `localhost/clairkeys-omr:rollback-pr161-20260914`로 태그해 보존했다.
- 검증된 이미지를 `current`로 태그하고 `systemctl restart clairkeys-omr` → exit 0.
- 확인 결과:
  - 약 20초 뒤 health healthy, `podman healthcheck run` exit 0, systemd active.
  - 실행 image = `current` = `71594a4a…`, 롤백 태그 = `bd2d5e6e…`.
  - 운영 컨테이너 안 normal jar에 패치된 `AugmentationDotInter.class`(13217B)가 있다. JVM 0.
  - 외부 `http://101.79.16.73:3000/health` 200, 인증 없는 `POST /process` 401.
  - deploy checkout `34f9e7e`, 변경 0줄.
- env·secret·unit·ingress는 바꾸지 않았다.
- 롤백: `podman tag localhost/clairkeys-omr:rollback-pr161-20260914 localhost/clairkeys-omr:current` 후 재시작.

## 한계와 남은 범위

- **운영 모듈 스모크(실제 PDF 변환)는 이번 배포에서 실행하지 않았다.**
  - 원본 PDF를 VM에 올리려면 따로 확인이 필요하다. 과거 실험 승인을 확대하지 않았다.
  - 운영 경로에서 Clair 153/191이 재현되는지는 아직 확인되지 않았다. 근거는 로컬 amd64 이미지 비교뿐이다.
  - 운영 이미지에서 확인한 것은 합성 fixture 기반 native 테스트 통과까지다.
- 웹 앱 업로드→저장→콜백→플레이어 경로도 실행하지 않았다. 기존 저장 악보는 재변환되지 않으므로 재업로드가 필요하다.
- 남은 오류: 타이 누락, m1 RH 점, m3 둘잇단, m7 C4. #134는 OPEN이다.
- VM `/tmp`의 build·test 로그(`/tmp/build-34f9e7e….log`, `/tmp/image-tests-34f9e7e….log`)는 로컬로 회수했고 VM에서는 지우지 않았다(PDF·이미지 없음).
