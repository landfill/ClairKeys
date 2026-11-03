# PR261 OMR VM 계측·호스트 수집기 배포 — 2026-11-04 KST

Status: VM 배포·서버 검증 완료 / 실제 화면 최종 확인 대기 — 브라우저 URL 판별 실패로 컴퓨터 제어가 자동 중단됨.

## 대상과 보존 기준

- 기존 등록 PEM·StrictHostKeyChecking=yes·BatchMode로 hostname `vm-naver-20260820145930` 확인.
- 기존 checkout `70eb25e6a50a9b89acaf673b590d57f572200123`, clean. 기존 실행 image
  `afa179723bc21f2a2b06d8f53251eb8bfc22a8372bb4dec4a875711fe4549d6f`, active/healthy, NRestarts=0.
- 기존 env mode 600, SHA256 `7c9035562ece95845950bb473c7fb5de68d4eb404e23079f534b5c9ad1daf7fc`.
  unit SHA256 `bbc2f7148e7212afa8fc3968f54ad1d6d96cd9ba30f6eb0241360f182f14cb0b`, 승인 코드의 기본 unit과 cmp 동일.
- `/data/processing` 기존 파일 1개. 내용·상대경로·크기 manifest SHA256
  `8187b20187f08d28250faf4426a263190266b64fe76917fd61227295c5df4086`.
- 최근 48시간 journal에서 작업 UUID 0, 현재 운영 Java 프로세스 0. 구버전에는 전체 작업 조회 API가 없으므로
  이를 모든 메모리 job의 완전한 열거라고 하지 않는다. 서비스 전환 직전 다시 점검한다.
- rollback tag `localhost/clairkeys-omr:rollback-pr261-20261104`를 기존 image에 지정했다.

## 빌드와 사전 검증

- 깨끗한 기존 `/opt/clairkeys-deploy`를 승인된 merge SHA `fd0e946c4779a92e42bbea57bb4fd00281410d2d`로 이동했다.
- `podman build --format docker --memory 5g --build-arg OMR_DEPLOYMENT_SHA=<full SHA> -f Dockerfile.audiveris` 성공.
  새 image `d83486c2a5d1e921d27d82ae9de93c1a8da92c9ceea1db51ba91e8ffbc477b3f`, revision label 동일, HEALTHCHECK 포함.
  검증 후 아래 전환 단계에서 current tag·운영 컨테이너에 적용했다.
- 새 image에서 network none / memory 5g / 운영 env 없이 전체 OMR Python/native 회귀: 222 tests,
  216 pass / 6 retained diagnostic skip, 517.703s. Native test methods 19개 실행·통과.
- 새 image의 Python 소스 57개와 승인된 checkout을 대조: missing 0 / mismatch 0.
  이전 image와 normal/recovery JAR entry 각 2433개 및 compiled test class 17개 해시 동일.
- 이전 image에서 기존 Bach fixture 비교를 준비했다. 최초 별도 script 실행은 PYTHONPATH 부재로 실패했고
  script에 `/app`을 지정한 뒤 정상 실행했다. 애플리케이션이나 운영 데이터는 변경하지 않았다.
- 기존 Bach PDF SHA256 `b1c5be9fb63954df9c1a3e7b651ae930c4e5e332a5ab3e14b197379cfa04c35a`를 신·구 image에서 순차 변환했다.
  양쪽 514 notes / 147.75초, `generated_at`만 제외한 animation JSON과 artifact JSON의 cmp 동일.
  canonical SHA256 `c4b4d27a6d3d53669cd37c585042ead715604506c059af46991acf2b754ea51f`,
  artifact SHA256 `fd1c61bcb29979a0d54c574fbd0168eda8ff7067751fa77718896c5bb5ce223b`.
  경과 시간은 기존 50.764s / 신규 49.895s. 단일 fixture 각 1회 측정이며 처리량·p95 성능 보장으로 일반화하지 않는다.

## 호스트 수집기

- 승인된 collect-host.py와 service/timer를 설치하고 `systemd-analyze verify` 성공.
- oneshot 시작·timer enable/active 성공. `/var/lib/clairkeys-omr-monitor/host.json` 생성,
  파일 mode 644·동적 수집기 사용자 소유. 최초 sampled_at `2026-11-03T15:17:17.251410+00:00`.
- 최초 memory_total_bytes=16527216640, memory_available_bytes=13039153152,
  data_total_bytes=106288885760, data_free_bytes=83459829760. 실제 호스트 측정이며 컨테이너 수치가 아니다.
- DynamicUser=yes / ProtectSystem=strict / NoNewPrivileges=yes, service Result=success.
- 30초 timer의 갱신을 서로 다른 sampled_at으로 확인했다. 새 image에 실제 JSON을 읽기 전용 mount한 격리 확인도 host status=ok.

## 운영 전환 및 서버 측 최종 확인

- 직전 idle·env/unit/data manifest를 다시 확인하고 승인된 monitor.conf drop-in을 설치했다.
  drop-in SHA256 `971abebc6c065aafb5fb863f919a2f493c44af8d7d13460255623c18ca60ec84`.
- current를 새 image로 지정하고 service restart exit 0. ActiveEnterTimestamp **2026-11-04 00:29:17 KST**,
  container running/healthy, NRestarts=0. rollback image와 기본 unit을 보존했다. 실제 rollback은 하지 않았다.
- VM 외부 unauthenticated probes: `/health` GET 200, `/monitor` GET 401, `/process` POST 401.
- 실제 서비스 `/monitor`를 VM 내부에서 기존 shared secret으로 호출: 200 / `private, no-store`,
  deployment SHA `fd0e946…`, host status=ok, queued/processing/callback_pending/completed/failed 모두 0.
  비밀 값·원본·사용자 정보 필드가 응답에 없음을 검사했다. 자격증명 값은 출력·복사하지 않았다.
- 인증된 실제 서비스 snapshot 2회: 2026-11-03T15:34:52.213228+00:00 / 15:36:47.191283+00:00.
  각각 host sampled_at 15:34:46.264266+00:00 / 15:36:18.618706+00:00, 모두 fresh/ok.
  host MemTotal은 실제 `/proc/meminfo`와 일치했다. 두 번째 available=13630607360 bytes,
  /data total=106288885760 / free=83473973248 bytes.
- 실제 컨테이너의 `/run/clairkeys-monitor` mount RW=false 확인.
  최종 env·기본 unit·기존 processing manifest는 위 초기 해시와 동일하고 기존 파일 1개 보존.
  현재 Java 프로세스 0, checkout clean, 운영 service·수집 timer active.

## 브라우저 사전 확인

- Aside 실행 서비스가 없어 연결 실패. 사용자 Edge의 기존 ClairKeys 탭을 CUA로 바인딩했다.
- 실제 로그인된 운영자 `/admin/omr` 접근 성공. 배포 전 health 응답 확인 / 10ms,
  계측 API는 `계측 미지원 · OMR 업데이트 필요`로 표시됐다. 사용자 정보는 저장소 산출물에 남기지 않는다.
- 배포 후 실제 앱 업로드를 위해 공개 Bach fixture를 비공개 업로드 폼에 준비하려 했으나,
  확장의 Allow access to file URLs가 꺼져 fileChooser.setFiles가 실패했다. 파일 선택이 완료되지 않아
  곡 정보 입력·변환 제출은 실행되지 않았다. 검증용 사용자 악보·DB 레코드를 생성하지 않았다.
- 확장 권한은 변경하지 않고 OS picker 경로를 확인하려 했지만 Windows의 현재 브라우저 URL을
  충분히 판별하지 못했다는 이유로 Computer Use가 해당 turn에서 종료됐다. 이후 UI 조작은 중단했다.
- **배포 후 모니터링 화면의 SHA·자원 표시·갱신과 실제 앱 upload→callback은 미검증**이다.
  서버 snapshot 정상 결과를 실제 화면 확인으로 대체하지 않는다. 브라우저 연결/전경 상태를 복구한 다음 확인해야 한다.

## 안전 점검

- 자동 승인 검사는 최초 preflight script의 env 파일 복제 계획을 거부했다. 해당 명령은 실행되지 않았다.
  env 복제를 제거하고 제자리 읽기·해시 비교만 수행하는 수정본으로 승인·실행했다. 토큰 값 출력·복사 없음.
- 로컬 사용자 `.codex/config.toml`은 변경·stage하지 않는다. 원본 PDF·이미지와 비공개 결과는 Git에 넣지 않는다.
- 원격 상세 로그·실험 파일은 `/tmp/pr261-*`와 보호된 `/data/analysis/pr261-monitor-20261104/`에 보존한다.

## 남은 검증

Edge의 파일 선택 창이 있다면 닫고 실제 `/admin/omr`를 앞에 둔 다음 브라우저 제어를 재개해
새 SHA·자원·갱신·경고 부재를 시각 확인한다. 실제 앱의 비공개 검증 업로드와 callback/결과 수거도 남아 있다.
추가 VM 배포 승인은 필요하지 않으며 현재 승인은 유지된다. #121 전체의 외부 경보 등 비목표는 미구현이다.
