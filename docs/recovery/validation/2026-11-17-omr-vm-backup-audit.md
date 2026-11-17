# OMR VM 회수 전 백업 대상 실사 — 2026-11-17

09:46 KST 운영 VM에 기존 PEM과 고정 호스트 키(StrictHostKeyChecking=yes)로 접속해 호스트명을 확인했다. **점검만 수행했다. 외부 백업, 복원 시험, 서비스 중단, 환경변수 변경, VM 반납은 하지 않았다.** 기준은 로컬·원격 main `d40e211`. [VM 교체 가이드](../../vm-replacement.md)에서 말하는 “영속 데이터 없음”은 완료된 앱 데이터에 대한 설명이다. 실제 디스크에는 Git 밖의 실험 자료가 있다.

## 무엇을 보존해야 하는가

`df -hT /data`에서 /data는 별도 디스크가 아니라 VM의 루트 XFS였다. `du -x -h --max-depth=1 /data`는 전체 19 MiB(할당 공간). 일반 파일 729개, 심볼릭 링크 0개. VM에서 파일별 크기와 SHA-256만 계산해 이번 Mac의 Git 추적 파일 및 Git 제외 `local-test-data/`의 일반 파일과 대조했다. 아래 숫자는 **경로별 파일 수**이며, 다른 머신·별도 백업·압축파일 내부까지 없다는 뜻은 아니다. 같은 내용도 원래 경로·권한까지 보존됐다는 뜻은 아니다.

| VM 경로 | 파일 수 | 논리 크기(bytes) | 같은 내용 로컬 확인 | 로컬 미확인 |
|---|---:|---:|---:|---:|
| /data/analysis | 722 | 16,877,952 | 472 | **250** |
| /data/out | 3 | 537,631 | 0 | **3** |
| /data/testpdf | 3 | 439,773 | 3 | 0 |
| /data/processing | 1 | 74,577 | 1 | 0 |

- **우선 회수:** 실험·회귀 근거까지 유지하려면 /data 전체를 경로·권한을 유지해 VM 밖의 접근 제한된 암호화 저장소에 보관할 것. 미확인 253개에는 분석 산출물과 변환 출력이 포함된다. 전체가 작아 파일을 선별하다 연결된 입력·결과를 놓칠 이유가 없다. 원본 악보·OMR·로그·비밀값은 Git에 넣지 않는다. 반납 직전 파일 수와 경로별 SHA-256 목록을 다시 만들고, 별도 위치에서 복호화·풀기 및 해시 대조가 끝나야 백업 완료다.
- **동일한 실행 환경이 필요할 때:** Podman 현재 이미지 `d83486c2a5d1`(배포 SHA `fd0e946`, 1.15 GB 표시)와 직전 롤백 이미지 `afa179723bc2`(`70eb25e`, 1.14 GB 표시)를 선택 보관한다. 태그·이미지 ID와 함께 이미지 자체를 `podman save`로 보관하고 별도 환경에서 `podman load`와 ID·대표 변환을 확인한다. 태그별 표시 크기는 공유 레이어를 포함한다. 저장소에서 다시 빌드할 수 있으나 같은 바이트·외부 빌드 의존성의 가용성까지 보장하지 않는다. 과거 이미지 전부와 컨테이너 캐시는 필수가 아니다.
- **운영 설정:** 현행 `/etc/clairkeys-omr.env`는 root 600, 키는 ENVIRONMENT, OMR_SHARED_SECRET, CLAIRKEYS_CALLBACK_ORIGIN, AUDIVERIS_MAX_CONCURRENCY 네 개였다. 옛 env 사본도 있다. 기존 비밀을 유지할 이유가 있으면 현행 값만 승인된 비밀 보관소에 보관하고, 새 호스트에서는 새 공유 비밀을 VM과 Vercel에 함께 설정할 수 있다. 옛 env, 구 PEM, SSH host key를 새 호스트 설정으로 이식하지 않는다. 구 PEM은 반납 확인까지 안전하게 유지한다. [운영 런북](../../../omr-service/deploy/README.md) 참조.
- **Git에서 복원 가능:** 기본 systemd unit, 유일한 monitor.conf drop-in, 수집 service/timer 및 collect-host.py 모두 배포 체크아웃과 `cmp` 일치. `/opt/clairkeys-deploy`는 clean, `/opt/clairkeys`는 3개 수정 파일의 현재 blob이 모두 `git rev-list --objects origin/main`에 같은 경로로 존재했다. 두 체크아웃의 ignored 파일도 없었다. 생성되는 host.json, 과거 unit 사본은 복구에 필수가 아니다. 필요한 이력·장애 근거만 journal에서 민감 정보를 제외해 별도 보관한다.

## 서비스 데이터와 반납 직전 확인

- `podman ps -a`에는 OMR 컨테이너 한 개(healthy), named volume 0개. inspect 결과 쓰기 마운트는 /data, 모니터 수집 경로는 읽기 전용. 호스트에서 확인한 PostgreSQL·MariaDB·Redis unit은 inactive였다. /tmp·/var/tmp에서 지정한 PDF·OMR·MXL·MusicXML·ClairKeys·Audiveris 파일명 패턴에 해당하는 일반 파일은 0개였다. 전 디스크 포렌식이나 공급자 스냅샷 조회는 아니다.
- 완료된 곡 메타데이터와 비공개 ScoreArtifact는 외부 PostgreSQL, 애니메이션 JSON은 Supabase Storage의 animation-data에 저장한다([결과 저장 코드](../../../src/lib/omr/finalizeJob.ts)). VM 회수용 DB 덤프는 필요 없다. 업로드 경로는 PDF를 VM으로 전달하며 원본 PDF의 영속 보관을 보장하지 않는다([업로드 코드](../../../src/app/api/omr/upload/route.ts)). 외부 DB·Storage 백업 유무 및 모든 운영 행·객체 일치는 이번 점검 범위가 아니다.
- 09:46:52 KST 컨테이너 내부 인증 GET /monitor: queued=0, processing=0, callback_pending=0, 보존 범위 completed=0, failed=0. 서비스 시작(11-04 00:29:17 KST) 이후 조회 가능한 unit journal에서 UUID 포함 줄·변환 완료·callback 전달 로그 각 0건. 이는 해당 시점·보존 기간의 관측이며 영속 큐나 모든 과거 결과의 저장 증명은 아니다.
- **반납 순서:** 신규 변환 접수를 먼저 막되 기존 작업의 callback·수거 경로는 유지한다. 대기·진행·전달 중 0건을 재확인하고, 미전달·실패 건은 Vercel 측 저장 상태와 대조해 수거 또는 재시도 대상으로 확정한다. 메모리 job은 디스크 백업으로 복구되지 않는다. 최종 /data 사본 검증 후 **IP가 반환되기 전에** 구 주소로 요청하는 웹 배포를 해제한다. 대체 VM이 없으면 Vercel Production의 OMR_SERVICE_URL을 비우고 구 공유 비밀을 폐기·교체한 뒤 재배포한다. 기존 주소를 쓰는 활성 preview·과거 배포의 접근 경로도 차단·확인한다. 현재 [URL 판정](../../../src/lib/omr/serviceUrl.ts)과 업로드 코드는 URL 미설정 시 DB 행 생성 전에 503으로 거절한다. 새 VM의 검증·절체는 [교체 가이드](../../vm-replacement.md)와 [모니터 설치 절차](../../../omr-service/deploy/MONITORING.md)를 따른다.

검증 방법: SSH 읽기 전용 인벤토리, 파일 내용 해시 대조, 로컬 소스 저장 경로 확인, 편집한 Markdown의 로컬 링크 확인. 앱 코드 변경이 없어 Jest·빌드 미실행. 실제 백업본의 존재·복원 성공 또는 운영 설정 전환을 이번 점검 결과로 간주하지 않는다.
