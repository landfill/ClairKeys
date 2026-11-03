# PR261 OMR VM 계측·호스트 수집기 배포 — 2026-11-04 KST

Status: IN_PROGRESS — 사용자 명시적 배포·활성화·실제 운영자 페이지 검증 승인.

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
  아직 current tag·운영 컨테이너는 이전 image다.
- 새 image에서 network none / memory 5g / 운영 env 없이 전체 OMR Python/native 회귀 실행 중.
- 이전 image에서 기존 Bach fixture 비교를 준비했다. 최초 별도 script 실행은 PYTHONPATH 부재로 실패했고
  script에 `/app`을 지정했다. 애플리케이션이나 운영 데이터는 변경하지 않았다.

## 호스트 수집기

- 승인된 collect-host.py와 service/timer를 설치하고 `systemd-analyze verify` 성공.
- oneshot 시작·timer enable/active 성공. `/var/lib/clairkeys-omr-monitor/host.json` 생성,
  파일 mode 644·동적 수집기 사용자 소유. 최초 sampled_at `2026-11-03T15:17:17.251410+00:00`.
- 최초 memory_total_bytes=16527216640, memory_available_bytes=13039153152,
  data_total_bytes=106288885760, data_free_bytes=83459829760. 실제 호스트 측정이며 컨테이너 수치가 아니다.
- mount drop-in과 운영 서비스 전환은 회귀 검증 후 수행한다.

## 브라우저 사전 확인

- Aside 실행 서비스가 없어 연결 실패. 사용자 Edge의 기존 ClairKeys 탭을 CUA로 바인딩했다.
- 실제 로그인된 운영자 `/admin/omr` 접근 성공. 배포 전 health 응답 확인 / 10ms,
  계측 API는 `계측 미지원 · OMR 업데이트 필요`로 표시됐다. 사용자 정보는 저장소 산출물에 남기지 않는다.

## 안전 점검

- 자동 승인 검사는 최초 preflight script의 env 파일 복제 계획을 거부했다. 해당 명령은 실행되지 않았다.
  env 복제를 제거하고 제자리 읽기·해시 비교만 수행하는 수정본으로 승인·실행했다. 토큰 값 출력·복사 없음.
- 로컬 사용자 `.codex/config.toml`은 변경·stage하지 않는다. 원본 PDF·이미지와 비공개 결과는 Git에 넣지 않는다.
- 원격 상세 로그·실험 파일은 `/tmp/pr261-*`와 보호된 `/data/analysis/pr261-monitor-20261104/`에 보존한다.

## 남은 검증

새 이미지 전체 회귀·대표 PDF 비교, idle 재확인, mount·image 전환, 외부 health/auth,
실제 운영자 페이지의 SHA/자원/작업·callback, env/unit/기존 데이터 보존과 rollback 준비를 확인한다.
