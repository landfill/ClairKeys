# 2026-09-13 — D-060 시작 템포 해석 OMR VM 배포 (PR159)

Authorization: 사용자가 2026-09-13 선택지 "3. D-060 운영 배포"에 "3"으로 명시 승인.
Target: `e5ee7bbce75027ba13353dd3717db48fe3c4072b` (PR159 병합 커밋)
Image: `bd2d5e6e72864bc3d8f81848bcd6a7b4e8da5950e56fa2158ecd430fa4136eca`
Prior image: `f858f14e0524230add2ce2f42aabc77c825d8f1a870bdc31f447a229d39d5f1d` (`e652c643…`)

## 범위

- `e652c643..e5ee7bb`의 `omr-service` 변경은 세 가지다:
  - `omr/musicxml_timing.py`(+21, D-060)
  - 오프라인 `omr/recognition_evaluation.py`
  - 테스트와 `fixtures/recognition/clair-de-lune-full-reference.json`
- `Dockerfile.audiveris`, `deploy/`, `requirements*`, unit, env는 바뀌지 않았다.
- 인식 엔진·재시도·동시성·timeout 경로도 바뀌지 않았다.

## 사전 점검과 빌드

- `/opt/clairkeys-deploy`는 `e652c643`에서 깨끗했다(`git status` 0줄). fetch 후 target 커밋이 존재했다.
- 서비스 active, 운영 컨테이너 image `f858f14e…`, JVM 0.
- `/data/processing`에는 2026-08-21의 `8e33ffee…` 하나뿐이었다. 기존 기록상 404 역사 산출물이며
  건드리지 않았다. 디스크 91GB 여유.
- `git checkout --detach e5ee7bb` 후 다음 명령으로 빌드했다. exit 0, HEALTHCHECK(curl /health,
  start 60s, interval 30s, timeout 10s, retries 3)가 유지됐고 revision 라벨이 target과 일치했다.

```sh
podman build --format docker --label org.opencontainers.image.revision=e5ee7bbce75027ba13353dd3717db48fe3c4072b \
  -f Dockerfile.audiveris -t localhost/clairkeys-omr:e5ee7bbce75027ba13353dd3717db48fe3c4072b .
```

## 이미지 검증

2026-09-12와 같은 명령이다(network none, 저장소 fixtures/src 읽기 전용, 코드 overlay 없음):

```sh
podman run --rm --network none --workdir /app -v /opt/clairkeys-deploy/fixtures:/fixtures:ro \
  -v /opt/clairkeys-deploy/src:/src:ro --entrypoint sh <image> \
  -c 'ln -s /app /omr-service && python3 -m unittest discover -s tests -p "test_*.py"'
```

- **172 tests OK (skipped=6).** 2026-09-12의 162개에 PR159의 평가기 테스트 10개가 더해진 수다.
- `ERROR:`로 시작하는 로그 7줄은 음성 경로 테스트(다중 MXL, timeout, callback 거부)의 의도된 로그이고
  실패가 아니다.
- 이미지 안의 `omr.musicxml_timing`에 `_anchor_silent_opening_tempo`가 있음을 확인했다.
- 로그: `local-test-data/results/tempo-deploy-2026-09-13/image-tests.log`, `build.log`.

## 전환

- 직전 재확인: JVM 0, 새 processing 디렉터리 없음, 실행 이미지가 `f858f14e…`.
- 이전 이미지를 `localhost/clairkeys-omr:rollback-pr159-20260913`으로 태그해 보존했다.
- 검증된 이미지를 `current`로 태그하고 `systemctl restart clairkeys-omr` → exit 0.
- 확인 결과:
  - 컨테이너 health healthy, `podman healthcheck run` exit 0, systemd active.
  - 실행 image = `current` = `bd2d5e6e…`, 롤백 태그 = `f858f14e…`.
  - 외부 `http://101.79.16.73:3000/health` 200, 인증 없는 `POST /process` 401.
  - 처음에 포트 8000으로 확인해 000(연결 불가)이 나왔다. unit의 `-p 0.0.0.0:3000:8000`을 확인하고
    3000으로 다시 확인했다. 서비스 문제가 아니었다.
- env·secret·unit·ingress는 바꾸지 않았다. 롤백: 롤백 태그를 `current`로 되돌리고 재시작.

## 실제 운영 모듈 스모크 (저장 악보·DB 변경 없음)

- 임시 root `/data/analysis/pr159-live-R6a7yJ`. 입력 `input.pdf` sha256 `34d06c77…e5478` 검사 통과.
- 실행: `podman exec -e PYTHONPATH=/app clairkeys-omr-prod python3 <root>/smoke_retry.py <root>/input.pdf <root>/result <root>/clair-de-lune-full-reference.json`
  → exit 0.
- report 결과:
  - `processorSource=/app/omr/audiveris.py`, 27.896초.
  - 선택 `meter-retry-ofxyv2da/retry.mxl`, 9/8, 163음.
  - **tempo 69, scoreTempo 69**. 배포 전 2026-09-06 스모크는 null/null이었다.
  - 경고는 bar 9 overflow 하나로 이전과 같다.
- 원본 17마디 기준 평가:
  - 이벤트 143/191, 정확한 마디 8·15·16·17.
  - 분류 `duration 4, extra-dot 1, missing 3, missing-dot 12, onset 18, onset-and-duration 10`.
  - openingTempo 기대 69 = 실제 69, 일치.
  - 배포 전 baseline과 비교해 **바뀐 것은 시작 템포뿐**이다.
- 계보: 선택 `retry.mxl`의 마디별 이벤트 덤프가 2026-09-06 운영 스모크 `retry.mxl`(878039a1…)과 `diff`
  동일하다. 이번 실행에서는 m10 베이스 점 차이(동률 점 처리 순서)가 나타나지 않았다.
- 회수: PDF·`.omr`을 제외한 9개 파일을 `local-test-data/results/tempo-deploy-2026-09-13/live/`로
  가져왔고 sha256 9/9가 일치했다.
- 정리:
  - 처음에 root 전체 삭제를 회수와 한 명령으로 묶었다가 자동 권한 검사에서 거부됐다. 실행되지
    않았다.
  - 이전 배포 관행대로 이미지가 든 파일만 따로 지웠다: `input.pdf`, `result/input.omr`,
    `result/meter-retry-ofxyv2da/retry.omr`.
  - 이후 root 안 `*.pdf|*.omr|*.png`는 0개다. XML·JSON·로그·스크립트는 VM root에 남아 있다.
- VM `/tmp`의 build·test 로그 사본(`/tmp/build-e5ee7bb….log`, `/tmp/image-tests-e5ee7bb….log`)은
  로컬로 회수했지만 VM에서는 지우지 않았다(PDF·이미지 없음).
- 최종: 서비스 active, image `bd2d5e6e…` healthy, JVM 0, 외부 health 200, deploy checkout `e5ee7bb`에서 깨끗함.

## 한계와 남은 범위

- 웹 앱 업로드→저장→콜백→플레이어 경로는 이번 배포에서 실행하지 않았다(운영 모듈 스모크만).
  기존 저장 악보는 재변환되지 않으므로, 앱에서 이 곡의 새 결과를 보려면 재업로드가 필요하다.
- 점·타이 누락(143/191)은 그대로다. 실제 플레이어 청취·사용자 확인은 남아 있고 #134는 OPEN이다.
