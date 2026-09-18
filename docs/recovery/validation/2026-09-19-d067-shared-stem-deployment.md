# 2026-09-19 — #134 D-067 기둥 공유 빈 머리 OMR VM 배포 (PR166)

Authorization: 사용자가 2026-09-19 "승인. vm 배포도 승인"으로 PR166 병합과 운영 VM 배포를 함께 명시 승인했다.
PDF 업로드 스모크는 이 승인에 포함하지 않았다.
Target: `b15d0fd5d1c197b7989b647a54bfff51f470060d` (PR166 병합 커밋)
Image: `721ccc1095f33d9493963a85b5ee2626bf160771c77cb85c70bb13317709fc0f`
Prior image: `4c14123dcd423dfe55696cc4cc86c5bbd2a7d8ec393730755324f62d09925718` (`f5be5f9`, PR165)
Rollback tag: `localhost/clairkeys-omr:rollback-pr166-20260919` → prior image

## 범위

- `f5be5f9..b15d0fd`의 `omr-service` 변경은 여섯 파일이다: `Dockerfile.audiveris`, `audiveris-patches/0006-shared-stem-void-head.patch`(신규),
  `audiveris-patches/0007-beamed-chord-black-duration.patch`(신규), `tests/shared_stem_durations_fixture.py`,
  `tests/test_shared_stem_durations_native.py`, `tests/test_audiveris_runtime.py`.
- `deploy/`, `requirements*`, Python 인식 코드, systemd unit, env는 바뀌지 않았다. `src/` 변경은 Jest 계약 목록 1줄이며 VM과 무관하다.

## 사전 점검

- systemd active, 컨테이너 image `4c14123d…` healthy. **JVM 0**, `/data/processing` 기존 1개(건드리지 않음), 디스크 86G 여유.
- `/opt/clairkeys-deploy`는 `f5be5f9`에서 깨끗했고, `git checkout --detach b15d0fd` 뒤에도 0줄이다.

## 빌드

- `podman build --format docker --label org.opencontainers.image.revision=b15d0fd… -f Dockerfile.audiveris` 성공. 앞쪽 레이어는 캐시를 재사용했다.
- sha256 검증 **10줄 모두 `: OK`**, `FAILED` 0. D-067이 새로 고정한 `AbstractChordInter.java`와 `SigReducer.java`를 포함한다.
- `patching file` **8줄**(`SigReducer.java` 2회 = 0005·0006, `AbstractChordInter.java` = 0007 포함). Hunk 실패·`.rej`·fuzz 0.
- revision 라벨이 target과 같고 HEALTHCHECK는 유지됐다.

## 이미지 검증

- **184 tests OK (skipped=6)**, 194.2초. 로컬 검증 빌드 `d067b-patched`와 같은 수다.
- **네이티브 테스트 7개 모두 skip 아닌 ok**(신규 `test_shared_stem_durations_native` 포함). skip 6개는 모두 `retained … not present` 계열이다.
- **클래스 대조(전환 전 게이트, 두 클래스 모두)**:

| 클래스 | 새 이미지(normal·recovery) | 로컬 `d067b-patched` | 직전 운영 |
|---|---|---|---|
| `SigReducer.class` | `3b84596b17f1e290…` | 같음 | `da3b07212db945be…` (PR165 기준선과 같음) |
| `AbstractChordInter.class` | `91081cfab9cd0d3f…` | 같음 | `d6dbd479a6b03bdd…` (패치 전 원본) |

  0006과 0007은 함께 가야 하므로 두 클래스가 모두 로컬 검증 빌드와 같을 때만 전환했다.
- 로그: `local-test-data/results/shared-stem-deploy-2026-09-19/pr166-build.log`(sha256 `a4eb8efb…`),
  `pr166-image-tests.log`(`19110449…`). VM `/tmp` 원본과 해시가 같다.

## 전환

- 전환 직전 재확인(한 명령, 조건이 틀리면 중단): JVM 0, `/data/processing` 1개, 실행 이미지 `4c14123d…` — 모두 충족.
- 이전 이미지를 `rollback-pr166-20260919`로 태그한 뒤 검증된 이미지를 `current`로 태그하고 `systemctl restart clairkeys-omr` → exit 0.
- 확인 결과 (2026-09-19 00:45 KST):
  - 컨테이너 healthy, `podman healthcheck run` 성공, systemd active.
  - 실행 중 컨테이너 이미지 = `current` = `721ccc10…`, revision `b15d0fd…`, 롤백 태그 = `4c14123d…`.
  - 전환 뒤 JVM 0, `/data/processing` 1개, deploy checkout `b15d0fd` 변경 0줄, 최근 15분 journal error/traceback **0줄**.
  - 외부 `http://101.79.16.73:3000/health` **200**, 인증 없는 `POST /process` **401**.
- env·secret·unit·ingress는 바꾸지 않았다.
- 롤백: `podman tag localhost/clairkeys-omr:rollback-pr166-20260919 localhost/clairkeys-omr:current` 후 `systemctl restart clairkeys-omr`.
  **0006·0007은 함께 되돌린다**(이미지 단위 롤백이라 자동으로 함께 돌아간다).

## 한계와 남은 범위

- **운영 인식 결과는 아직 확인하지 않았다.** 배포 승인에 PDF 업로드 스모크는 포함하지 않았다. 확인 수단은 사용자의 앱 재변환이다.
  기대: Clair 160음, m5의 셋잇단이 사라지고 오른손 박이 맞는다. 원본 기준 182/191(로컬). 서비스가 MusicXML을 지워 운영에서 직접 재평가할 수는 없다.
- D-067 알려진 한계: m5 F4 ×2·m7 C4가 점음표 대신 8분으로 나온다(빈 머리를 자기 화음으로 떼는 후속 작업 필요). 0.5 기준은 corpus 분포에서 정했다.
- VM `/tmp`의 build·test 로그는 로컬로 회수했고 VM에서는 지우지 않았다.
