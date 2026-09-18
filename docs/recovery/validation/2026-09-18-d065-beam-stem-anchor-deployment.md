# 2026-09-18 — #134 D-065 빔 끝 기둥 고정 OMR VM 배포 (PR164)

Authorization: 사용자가 2026-09-18 "승인"으로 PR164 병합을, 이어 "vm 도 배포하라"로 운영 VM 배포를 각각 명시 승인했다.
PDF 업로드 스모크는 이 승인에 포함하지 않았다.
Target: `bbcc09b40afa88d26e404033da1e35a810508115` (PR164 병합 커밋)
Image: `9eef75127cdffc179faca21bc7117d19e1341321d755cb6515950081308df5ae`
Prior image: `2a71ede5cfb21c5b7af126bb28fefa3aad22e0e3957119975e18fc7db5b61a9e` (`0e3dc61`, PR163)
Rollback tag: `localhost/clairkeys-omr:rollback-pr164-20260918` → prior image

## 범위

- `0e3dc61..bbcc09b`의 `omr-service` 변경은 일곱 파일이다: `Dockerfile.audiveris`,
  `audiveris-patches/0004-beam-end-stem-anchor.patch`(신규), `tests/curve_along_beam_fixture.py`,
  `tests/slur_across_stems_fixture.py`, `tests/test_curve_along_beam_native.py`,
  `tests/test_slur_across_stems_native.py`, `tests/test_audiveris_runtime.py`.
- `deploy/`, `requirements*`, Python 인식 코드, systemd unit, env는 바뀌지 않았다. 저장소 전체에서 `omr-service`·`docs` 밖 변경은
  `src/utils/__tests__/omrRuntimeContract.test.ts` 2줄(Jest 계약 목록)뿐이며 VM과 무관하다.

## 사전 점검

- systemd active, 컨테이너 `clairkeys-omr-prod` image `2a71ede5…` healthy(Up 2 days).
- **JVM 0**(`pgrep -f '[j]ava'`) — 진행 중 변환 없음. `/data/processing`에는 기존 `8e33ffee…` 하나뿐(건드리지 않음).
- 디스크 89G 여유. `/opt/clairkeys-deploy`는 `0e3dc61`에서 깨끗했다(`git status --porcelain` 0줄).
- `git fetch` 후 target 커밋 존재 확인, `git checkout --detach bbcc09b` 뒤에도 0줄.

## 빌드

```sh
podman build --format docker --label org.opencontainers.image.revision=bbcc09b40afa88d26e404033da1e35a810508115 \
  -f Dockerfile.audiveris -t localhost/clairkeys-omr:bbcc09b40afa88d26e404033da1e35a810508115 .
```

- 성공. 로그 1227줄, `Using cache` 13회로 앞쪽 레이어 일부만 재사용한 전체 빌드다.
- sha256 검증 8줄 모두 `: OK`. D-065가 고정한 `BeamsBuilder.java`를 포함한다
  (OpenJDK25, Audiveris deb, eng.traineddata, `BeamsBuilder.java`, `AugmentationDotInter.java`, `SlurLinker.java`,
  `ClumpPruner.java`, `LedgersPostAnalysis.java`).
- `patching file` 5줄(BeamsBuilder 포함). **Hunk 실패·`.rej`·fuzz 0건.**
- revision 라벨이 target과 같고 HEALTHCHECK(`curl -f http://localhost:8000/health`)는 유지됐다.
- 로그의 `ln: failed to create symbolic link '/etc/resolv.conf': Device or resource busy` 1줄은 양성이다.
  PR161(`34f9e7e`)·PR162(`0a22d2f`) 빌드 로그에도 같은 줄이 있고, 캐시를 덜 재사용한 전체 빌드에서만 나타난다.

## 이미지 검증

PR163과 같은 명령(network none, fixtures/src 읽기 전용, 코드 overlay 없음):

```sh
podman run --rm --network none --workdir /app -v /opt/clairkeys-deploy/fixtures:/fixtures:ro \
  -v /opt/clairkeys-deploy/src:/src:ro --entrypoint sh <image> \
  -c 'ln -s /app /omr-service && python3 -m unittest discover -v -s tests -p "test_*.py"'
```

- **180 tests OK (skipped=6)**, 136.7초. PR163 운영 177에 새 빔 네이티브 테스트 2개와 런타임 계약 1개가 더해졌다.
- **새 빔 네이티브 테스트 2개 모두 skip 아닌 ok**:
  `test_each_engine_keeps_the_beam_whose_ends_run_past_their_stems`(`test_curve_along_beam_native`),
  `test_no_engine_turns_the_slur_into_a_beam`(`test_slur_across_stems_native`).
- 기존 네이티브 3개도 skip 없이 ok: `test_cross_chord_dots_native`, `test_line_third_dots_native`, `test_staff_line_ties_native`.
  다섯 테스트 모두 normal·recovery 엔진을 실행한다.
- skip 6개는 모두 `retained … not present` 계열(로컬 진단 산출물 필요)이며 네이티브 테스트는 하나도 없다.
  로컬 검증이 skip 0이었던 것은 그 산출물이 로컬에 있기 때문이며, VM skip 6은 PR161~163 배포와 같은 기존 조건이다.
- **클래스 대조(전환 전 게이트)**: 새 이미지의 normal(`/opt/audiveris/lib/app/audiveris.jar`)·recovery
  (`/opt/clairkeys-audiveris-recovery/lib/app/audiveris.jar`) 두 jar의 `BeamsBuilder.class` sha256이 모두
  **`8d15e1b20204ee336437b99beca87795ec88fe11f28861d51105c5f0f7fb0847`**이다.
  이는 Clair 171/191을 낸 로컬 검증 빌드 `d065b-patched`의 기록된 해시(`8d15e1b2…`)와 같다.
  직전 운영 이미지의 같은 클래스는 두 jar 모두 `324132f0d69b2caaef98e4a206e9f68d255130c1626419d8369df984ac15cc30`으로,
  기록된 기준선 `d064-patched`(`324132f0…`)와 같다. 두 해시가 문서의 주장과 양쪽 다 일치한다.
- 로그: `local-test-data/results/beam-deploy-2026-09-18/pr164-build.log`(sha256 `a7ed4fa7…`),
  `pr164-image-tests.log`(`0a5f7e91…`). VM `/tmp` 원본과 해시가 같다.

## 전환

- 전환 직전 재확인(한 명령, 조건이 틀리면 중단): JVM 0, `/data/processing` 기존 1개, 실행 이미지 `2a71ede5…` — 모두 충족.
- 이전 이미지를 `localhost/clairkeys-omr:rollback-pr164-20260918`로 태그해 보존했다.
- 검증된 이미지를 `current`로 태그하고 `systemctl restart clairkeys-omr` → exit 0.
- 확인 결과 (2026-09-18 11:27 KST):
  - 컨테이너 `clairkeys-omr-prod` healthy, `podman healthcheck run` 성공, systemd active.
  - 실행 중 컨테이너 이미지 = `current` = `9eef7512…`, revision 라벨 = `bbcc09b…`, 롤백 태그 = `2a71ede5…`.
  - 전환 뒤 JVM 0, `/data/processing` 여전히 1개, deploy checkout `bbcc09b` 변경 0줄,
    최근 10분 서비스 journal의 error/traceback **0줄**.
  - 외부 `http://101.79.16.73:3000/health` **200** (`{"status":"healthy"}`), 인증 없는 `POST /process` **401**.
- env·secret·unit·ingress는 바꾸지 않았다.
- 롤백: `podman tag localhost/clairkeys-omr:rollback-pr164-20260918 localhost/clairkeys-omr:current` 후
  `systemctl restart clairkeys-omr`.

## 한계와 남은 범위

- **운영 인식 결과는 아직 확인하지 않았다.** 배포 승인에 PDF 업로드 스모크는 포함하지 않았다.
  확인 수단은 사용자의 앱 재변환이며, 그때 애니메이션 JSON을 로컬 검증 결과와 대조한다.
  기대: Clair m9의 4분음표 두 개가 8분음표 두 개가 되고 원본 기준 이벤트가 160 → 171/191이 된다.
  서비스가 MusicXML을 지우므로 운영에서 원본 기준표 평가를 직접 재실행할 수는 없다.
- D-065의 알려진 한계 5건(거부된 후보가 `rawSystemBeams`에 잔존, 0.95가 보편 안전값이 아님, 끝 seed 미검출,
  모집단 불일치, fixture가 진짜 빔 판독을 검사하지 않음)은 그대로다. 실행된 회귀는 없다.
- 남은 기전(C m5 빈 머리 → 셋잇단, B 2도 반대편 머리 누락, E m3 둘잇단)과 남은 타이 오류는 그대로다. #134는 OPEN이다.
- VM `/tmp`의 build·test 로그는 로컬로 회수했고 VM에서는 지우지 않았다(PDF·이미지 없음).
