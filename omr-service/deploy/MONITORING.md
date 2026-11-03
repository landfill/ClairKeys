# OMR 내부 관측 파일럿 (#121, D-104)

이 문서는 **승인 후 실행할 절차**다. PR 작성·테스트만으로 운영 배포됐다고 하지 않는다.
기존 [배포 런북](README.md)의 이미지·restart·외부 health/auth·원본 변환·롤백 검증은 그대로 수행한다.

## 관측 경로와 권한

`/admin/omr` → `/api/admin/omr` → 고정 `OMR_SERVICE_URL`의 `/health`·`/monitor`.
웹 페이지와 API 각각 NextAuth 세션의 이메일을 서버의 `ADMIN_EMAILS`와 비교한다.
설정이 없으면 닫힌다. 운영자로 판별된 계정 메뉴에만 링크가 나타난다(모바일 포함).
인증 세션·allowlist를 확인하지 않고 UI 링크만 추가해서는 안 된다.

`/monitor`는 기존 `X-ClairKeys-Token`을 요구한다. 웹 서버만 `OMR_SHARED_SECRET`을 전달한다.
응답·요청은 no-store이고, 브라우저에는 allowlist로 재구성한 수치·시각·고정 상태·UUID·SHA만 전달한다.
원본·이름·이메일·callback 주소·토큰·원문 예외는 전달하지 않는다. 공개 `/metrics`는 만들지 않는다.
웹은 health·계측을 병렬로 읽고 각각 5초 timeout·redirect 거절·body 크기 상한을 적용한다.
브라우저는 7초 timeout·30초 주기로 읽고 숨겨진 탭은 중지한다. 읽기는 변환/수거/삭제를 실행하지 않는다.

## 계약과 범위

- schema `version=1`, 시각은 UTC ISO 8601. 화면은 KST로 표시한다.
- `deployment_sha`: 이미지 빌드 인자의 40자리 Git SHA. 미지정이면 null이며 웹 SHA와 별개다.
- `started_at`, `uptime_seconds`: **프로세스** 시작 시각·monotonic 경과 초.
- `jobs.queued`: background 시작 전 또는 실제 Audiveris semaphore 획득 대기 중인 작업 수.
  `processing`: PDF 저장·Audiveris 실행·XML→JSON 변환 중 수. callback은 제외한다.
- `oldest_wait_seconds`: 현재 대기 중인 작업의 최장 대기 초(시작 대기와 slot 대기는 각각 진입부터).
  완료 작업의 `wait_seconds`는 Audiveris slot 대기 초, 아직 획득하지 않았으면 null.
- `jobs.completed/failed`: **보존 범위의 변환 결과 집계**. lifetime/rate가 아니다.
- 진행 중 및 callback 진행 중 작업은 종료까지 추적한다. 종료 이력은 최대 100건·1시간이다.
  API 목록은 최근 변경 100건까지이며 현재 진행 수와 목록 수는 다를 수 있다.
- `stage`: queued/save_pdf/audiveris_wait/audiveris/xml_to_json/callback. 실패 시 실패 위치를 유지한다.
- callback `attempts`는 실제 HTTP 시도 횟수, retrying은 재시도 대기, exhausted는 최대 시도 소진이다.
  목적지·설정 거절/영구 HTTP 실패는 failed다. 변환 성공과 전달 성공은 별개다.
- 모두 메모리 기반이며 프로세스 재시작으로 작업·관측 이력을 잃는다. 새 DB·영속 큐는 없다.
- `host`: VM의 MemTotal/MemAvailable와 **/data가 놓인 파일시스템**의 total/free 바이트.
  컨테이너·JVM 수치가 아니다. 아래 호스트 수집기가 없으면 unavailable/null이다.
- 호스트 파일은 최대 4096 bytes, 90초 이상 오래되면 stale, 깨졌거나 없으면 unavailable.
  관측 값 0과 수집 누락은 구별한다. 웹도 이전 응답·오래된 계측에 경고를 표시한다.
- systemd ActiveState·Podman health·CPU·JVM·전체 결과 품질·장기 통계·외부 경보는 미수집이다.

## 승인 후 활성화 순서

웹을 먼저 배포해도 기존 OMR의 `/monitor` 404는 “계측 미지원”으로 보인다. health만으로 전체 정상을 표시하지 않는다.
OMR을 먼저 배포해도 기존 변환·status/result·callback 계약은 동일하다.

1. 웹 환경에 운영자가 허용할 계정 이메일을 `ADMIN_EMAILS`로 설정한다. 기존 OMR URL·secret은 재사용한다.
   allowlist 원문과 secret을 검증 기록·스크린샷에 남기지 않는다.
2. 깨끗한 승인 대상 checkout의 full SHA로 이미지를 빌드한다. 기존 런북의 build 명령에 다음을 더한다:

   ```bash
   --build-arg OMR_DEPLOYMENT_SHA="$(git -C /opt/clairkeys-deploy rev-parse HEAD)"
   ```

   `podman image inspect`의 revision label과 full SHA를 대조하고 기존 런북대로 이미지와 실행 컨테이너를 연결한다.
   **파일럿은 단일 Python 프로세스 실행 기준**이다. worker를 늘리면 프로세스별 스냅샷이 섞이므로 재설계한다.
3. 호스트 수집은 선택 활성화한다. 승인된 배포 checkout의 deploy 디렉터리에서:

   ```bash
   install -d -m 0755 /usr/local/lib/clairkeys-omr
   install -m 0644 collect-host.py /usr/local/lib/clairkeys-omr/collect-host.py
   install -m 0644 clairkeys-omr-monitor.service clairkeys-omr-monitor.timer /etc/systemd/system/
   systemd-analyze verify /etc/systemd/system/clairkeys-omr-monitor.service /etc/systemd/system/clairkeys-omr-monitor.timer
   systemctl daemon-reload
   systemctl start clairkeys-omr-monitor.service
   test -s /var/lib/clairkeys-omr-monitor/host.json
   systemctl enable --now clairkeys-omr-monitor.timer
   install -d -m 0755 /etc/systemd/system/clairkeys-omr.service.d
   install -m 0644 clairkeys-omr-monitor.conf /etc/systemd/system/clairkeys-omr.service.d/monitor.conf
   systemctl daemon-reload
   ```

   호스트 OS Python 3 표준 라이브러리만 사용한다. systemd DynamicUser와 StateDirectory로 쓰기 경로를 제한한다.
   네트워크·Podman socket·privileged·host PID namespace·DB 자격증명은 필요 없다.
   `/proc/meminfo` 읽기와 `/data`의 statvfs 권한을 확인한다. 실패를 권한 완화로 숨기지 않는다.
   optional drop-in은 기존 ExecStart와 같은 인자에 JSON용 읽기 전용 mount만 추가한다.
4. 기존 런북대로 처리 중 작업이 없는 시간에 승인된 이미지를 restart한다.
   호스트 수집을 쓰지 않으면 drop-in을 넣지 않고 앱 계측만 사용한다.

## 운영 확인과 기록

- 기존 VM 외부 health 200·무token `/process` 401에 더해 무token `/monitor` 401을 확인한다.
- 운영자 페이지/API는 성공하고 일반 로그인·비로그인 직접 API는 거절되는지 확인한다.
- SHA/image 대응, 프로세스 시작 시각, 호스트 파일의 30초 갱신, VM의 `free`/`df /data`와 수치 대응을 확인한다.
- 대표 PDF의 기존 canonical JSON 계약을 비교하고 save→wait→Audiveris→XML→JSON→callback 실측과
  기존 status/result를 대조한다. 모니터링 조회가 result를 소비하지 않는지 확인한다.
- 토큰·개인정보·원본·URL이 API/network/화면에 없는지 확인한다.
- 장기 이력 영속화·로그 보관은 추가하지 않는다. 추가 파일은 JSON 하나와 원자적 교체용 임시 파일뿐이다.
  새 앱 로그는 늘리지 않으며 기존 journald 보관 상한·rotation 설정은 이번에 변경하지 않는다.
- 실제 VM 확인·대표 PDF 처리시간/자원 비교는 배포 승인 후 validation에 기록한다. 로컬 mock 통과로 대체하지 않는다.

## 롤백

기록된 이전 이미지로 기존 절차에 따라 돌아간다. 새 웹은 구버전 VM을 미지원으로 표시할 수 있다.
host 수집도 되돌리려면 timer를 중지·disable하고 `monitor.conf`만 제거한 뒤 daemon-reload와 승인된 restart를 수행한다.
기존 env/data/job/result를 삭제하지 않는다. SHA/image·health/auth·원본 smoke 결과를 기록한다.

## #121의 남은 작업

외부 상시 synthetic·알림 경로/수신자·장애 주입→진단→복구→해제, p50/p95·실패율,
systemd/restart/OOM/CPU/JVM, 결과 품질, 로그 수집/rotation/보관 상한의 실제 VM 검증은 별도 단계다.
내부 페이지는 서비스 자체가 멈췄을 때의 외부 감시를 대신하지 않는다.
