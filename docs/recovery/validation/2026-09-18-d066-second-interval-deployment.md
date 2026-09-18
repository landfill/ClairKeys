# 2026-09-18 — #134 D-066 2도 밀린 머리 보존 OMR VM 배포 (PR165)

Authorization: 사용자가 2026-09-18 "승인. vm 배포도 승인"으로 PR165 병합과 운영 VM 배포를 함께 명시 승인했다.
PDF 업로드 스모크는 이 승인에 포함하지 않았다.
Target: `f5be5f98c9afe92e87a516ec1f843f6e5fc1ce41` (PR165 병합 커밋)
Image: `4c14123dcd423dfe55696cc4cc86c5bbd2a7d8ec393730755324f62d09925718`
Prior image: `9eef75127cdffc179faca21bc7117d19e1341321d755cb6515950081308df5ae` (`bbcc09b`, PR164)
Rollback tag: `localhost/clairkeys-omr:rollback-pr165-20260918` → prior image

## 범위

- `bbcc09b..f5be5f9`의 `omr-service` 변경은 다섯 파일이다: `Dockerfile.audiveris`,
  `audiveris-patches/0005-second-interval-head-prune.patch`(신규), `tests/second_interval_heads_fixture.py`,
  `tests/test_second_interval_heads_native.py`, `tests/test_audiveris_runtime.py`.
- `deploy/`, `requirements*`, Python 인식 코드, systemd unit, env는 바뀌지 않았다.
  이번에는 `src/`도 바뀌지 않아 웹앱과 완전히 무관하다.

## 사전 점검

- systemd active, 컨테이너 image `9eef7512…` healthy(Up 7 hours).
- **JVM 0** — 진행 중 변환 없음. `/data/processing`에는 기존 항목 1개뿐(건드리지 않음). 디스크 88G 여유.
- `/opt/clairkeys-deploy`는 `bbcc09b`에서 깨끗했고, `git checkout --detach f5be5f9` 뒤에도 0줄이다.

## 빌드

```sh
podman build --format docker --label org.opencontainers.image.revision=f5be5f98c9afe92e87a516ec1f843f6e5fc1ce41 \
  -f Dockerfile.audiveris -t localhost/clairkeys-omr:f5be5f98c9afe92e87a516ec1f843f6e5fc1ce41 .
```

- 성공. 로그 1234줄. sha256 검증 **9줄 모두 `: OK`**, `FAILED` 0건. D-066이 고정한 `SigReducer.java`를 포함한다.
- `patching file` **6줄**(SigReducer 포함). **Hunk 실패·`.rej`·fuzz 0건.**
- revision 라벨이 target과 같고 HEALTHCHECK는 유지됐다.

## 이미지 검증

PR164와 같은 명령(network none, fixtures/src 읽기 전용, 코드 overlay 없음):

- **182 tests OK (skipped=6)**, 165.8초. 로컬 검증 빌드 `d066b-patched`와 같은 수다.
- **네이티브 테스트 6개 모두 skip 아닌 ok**: `test_second_interval_heads_native`(신규),
  `test_curve_along_beam_native`, `test_slur_across_stems_native`, `test_cross_chord_dots_native`,
  `test_line_third_dots_native`, `test_staff_line_ties_native`. 모두 normal·recovery 엔진을 실행한다.
- skip 6개는 모두 `retained … not present` 계열(로컬 진단 산출물 필요)이며 네이티브 테스트는 없다.
- **클래스 대조(전환 전 게이트)**: 새 이미지의 normal·recovery 두 jar의 `SigReducer.class` sha256이 모두
  **`da3b07212db945be8f4ebe2510cb8778698150c2b24b5d31282b1e370f2bc273`**이며,
  Clair 173/191을 낸 로컬 검증 빌드 `d066b-patched`의 같은 클래스와 일치한다.
  직전 운영 이미지의 같은 클래스는 두 jar 모두 `e4be83146ba35a78e47263c87e49b4d1690f89b43c26738e46e6bb5a466f1bfd`으로,
  로컬 기준선 `d065b-patched`와 일치한다. 두 해시가 문서의 주장과 양쪽 다 들어맞는다.
- 로그: `local-test-data/results/second-interval-deploy-2026-09-18/pr165-build.log`(sha256 `543bd108…`),
  `pr165-image-tests.log`(`e44ca64b…`). VM `/tmp` 원본과 해시가 같다.

## 전환

- 전환 직전 재확인(한 명령, 조건이 틀리면 중단): JVM 0, `/data/processing` 기존 1개, 실행 이미지 `9eef7512…` — 모두 충족.
- 이전 이미지를 `rollback-pr165-20260918`으로 태그해 보존한 뒤 검증된 이미지를 `current`로 태그하고
  `systemctl restart clairkeys-omr` → exit 0.
- 확인 결과 (2026-09-18 18:44 KST):
  - 컨테이너 healthy, `podman healthcheck run` 성공, systemd active.
  - 실행 중 컨테이너 이미지 = `current` = `4c14123d…`, revision 라벨 = `f5be5f98…`, 롤백 태그 = `9eef7512…`.
  - 전환 뒤 JVM 0, `/data/processing` 여전히 1개, deploy checkout `f5be5f9` 변경 0줄,
    최근 15분 서비스 journal의 error/traceback **0줄**.
  - 외부 `http://101.79.16.73:3000/health` **200**(`{"status":"healthy"}`), 인증 없는 `POST /process` **401**.
- env·secret·unit·ingress는 바꾸지 않았다.
- 롤백: `podman tag localhost/clairkeys-omr:rollback-pr165-20260918 localhost/clairkeys-omr:current` 후
  `systemctl restart clairkeys-omr`.

## 운영 재변환 결과 확인 (2026-09-18)

- 사용자가 배포 후 앱에서 여러 곡을 다시 변환했다(22:20 KST부터 Love Affair `78eecf34…` 431음, Deborah's Theme `c9fcf538…` 330음,
  Clair `df02092f…`). 이번에는 URL을 받지 않았고, VM 컨테이너 로그에서 배포 이후 작업의 job id와 제목을 찾았다.
  새 업로드·DB 접근은 없다.
- Clair 결과는 Supabase `animation-data/804629/omr_df02092f-….json`에서 회수했다(sha256 `51488b76…`).
  `generated_at` 2026-09-18T13:24:34Z = **22:24 KST**로 전환(18:44 KST) 이후 변환이다. tempo 69, 9/8, **159음**, duration 65.217392.
- **운영 159음이 로컬 검증 결과(`issue134-heads-2026-09-18/v2/clair-1/animation.json`)와 전 필드 완전히 같다**
  (midi·start·duration·hand·voice·staff, 차이 0건). 즉 Clair 173/191을 낸 실행과 운영 출력이 같다.
- **직전 운영(D-065, 2026-09-18 11:45 재변환본) 대비**: 음높이·길이·손 시퀀스를 `difflib`로 정렬하면 실제 변화는 세 곳뿐이다.
  - m5 17.826초: G4 점8분 → **F4 + G4** 8분 화음. 2도의 밀린 머리 F4가 살아났다.
  - m7 26.087초: **C4** 8분이 새로 생겼다. 2도의 밀린 머리 C4다(기대는 점4분이라 음가는 여전히 부족하다).
  - 나머지 같은 음들: 42음은 그대로(m1~m4와 m5 앞부분), **110음은 +0.2174초(8분음표 반 개) 이동**, 2음 −0.5·2음 +1.0×8분.
- +0.5×8분 이동은 오류가 아니라 **바른 위치로의 복귀**다. m5 왼손 B3/D4는 마디 안 2.1739초 → **2.6087초**(= 6번째 8분음표)로
  옮겨졌고, 로컬 기준표 평가에서 해소된 `onset B3@3.0`·`onset D4@3.0`이 이것이다.
  전체 길이도 65.000초(8분음표 149.5개, 정수가 아님) → 65.217초(**150개**)가 됐다. 이전 운영에서는 m5가 8분음표 반 개만큼 짧았다.
- 한계: canonical 애니메이션 기준 비교다. 원본 기준표 평가(173/191)는 MusicXML raw 이벤트로 하는데 서비스가 MusicXML을 지우므로
  운영에서 직접 재평가하지 않았다. 다만 canonical 결과가 173/191을 낸 로컬 실행과 전 필드 동일하다.
- 회수: `local-test-data/results/second-interval-deploy-2026-09-18/live-app-animation.json`(Git 제외).

## 한계와 남은 범위

- 운영 PDF 스모크나 웹 업로드→콜백→플레이어 E2E는 하지 않았다. 확인은 위 재변환 결과에 근거한다.
- D-066의 알려진 한계는 그대로다: 같은 pitch 중복 판독 경로에 전용 fixture가 없고,
  복원된 m7 C4는 여전히 8분음표로 나온다(점·성부 배정은 별개 원인이다).
- **기전 C**(m5 첫 화음의 빈 머리가 셋잇단으로 읽힘)는 손대지 않았다. 원인은 확정됐고 별도 결정이 필요하다.
- VM `/tmp`의 build·test 로그는 로컬로 회수했고 VM에서는 지우지 않았다(PDF·이미지 없음).
