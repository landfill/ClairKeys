# 2026-09-19 — PR170 같은 시점 다른 성부 타이 (D-071) VM 배포

## 최종 결과

- 사용자 "병합하고 브랜치 정리, vm 배포까지 진행해" 지시에 따라 PR170 병합·원격/로컬 브랜치 정리·VM 배포를 완료했다.
- 배포 commit `122f5bc696a7944398f30f1426467a000388b0b5`, image
  `79cbc6ab69cef8fc5d6e74b73f614a0d266e5c76fe042dcd285e2351241ba0a8`. **2026-09-19 20:32:15 KST** 전환.
- active·healthy, 외부 health 200·무인증 POST /process 401, 전환 이후 journal error/exception/traceback 0.
- **운영 컨테이너 Clair 모듈 스모크 191/191·타이34/43·누락9·오검출0.** raw events 바이트·평가 객체가 로컬 최종 검증과 같고,
  애니메이션은 `generated_at`만 다르다. 기존 저장 악보는 자동 갱신되지 않는다.
- `rollback-pr170-20260919` → 이전 `850a4143…`(PR169) 보존. env/unit/기존 processing 파일·사용자 미커밋 메모 보존.
  임시 원본 PDF·OMR 3개 제거, 잔여 0. 웹 업로드→callback→player E2E와 실제 롤백 전환은 수행하지 않았다.
- 로컬 근거(Git 제외): `local-test-data/results/d071-deploy-2026-09-19/`, VM `/tmp/pr170-*`, `/data/analysis/pr170-live-VMfStY`(XML/JSON/로그만).

## 병합·정리

- 병합 직전 head `8d7812f` 필수 CI 13 pass/2 path skip, Codex Completed·inline/reviews/threads 0, CLEAN/MERGEABLE 재확인.
  `--match-head-commit`과 Lore 본문으로 병합(mergedAt 2026-09-19T10:31:49Z). 승인 head와 merge의 omr-service/src/fixtures diff 0.
- 로컬·원격 tip 모두 `8d7812f`, main 포함·고유 0 확인 후 원격 삭제 → main 위치 → 로컬 삭제. 사용자 history 메모 SHA256 `36207439…` 전후 동일.
- merge `122f5bc` post-merge checks 6/6 success(E2E·빌드·테스트·lint·security). [리뷰 기록](../reviews/PR-170.md).

## VM 사전 점검·빌드

- 기존 PEM과 StrictHostKeyChecking=yes로 `vm-naver-20260820145930`에 접속. active/healthy, 운영 image `850a4143…`(PR169),
  checkout `9e4020a` clean, JVM 0, 여유 82GB, 기존 processing entry 1개. env mode 600·production·secret·callback HTTPS·concurrency1을
  값 노출 없이 검사했다. env `7c903556…`/unit `bbc2f714…` 해시와 processing 데이터 manifest(`4f04c969…`, 1파일 74,577바이트)를 저장했다.
- 배포 checkout만 `122f5bc`에 detached 이동 후 `podman build --format docker --label org.opencontainers.image.revision=<merge>
  -f Dockerfile.audiveris`. exit 0, HEALTHCHECK 포함. 빌드 로그 SHA256 `90d307f3…`.
- checksum `: OK` 21건(openjdk + 고정 소스 20)과 patch 적용 22줄(지난 배포 21 + 0011). apt 레이어가 캐시되어 deb·tessdata checksum 2건은
  이번 로그에 다시 출력되지 않았다.

## 무결성

- VM 이미지와 로컬 d071-patched 안에서 같은 스크립트로 해시를 뽑아 비교했다(`integrity-comparison.json`).
- normal/recovery 각 **JAR 2433항목 전부 바이트 동일**, `/opt/clairkeys-test-classes` 12개 동일, `SlurInter.class` `8b443e33…`.
- `/app` 72개 파일 동일. 로컬 이미지에만 있는 `.DS_Store`(로컬 빌드 컨텍스트의 macOS 메타데이터) 1개는 비교에서 제외했고 런타임과 무관하다.

## VM 전체 테스트·전환

- 네트워크 없는 5GB 컨테이너에서 VM 전체 unittest **190개 중 184통과·6진단skip**, 370.213초. native 13개 모두 `ok`
  (새 `test_aligned_voice_ties_native` 포함). 로그 SHA256 `7ad1f292…`. 운영 비밀 env는 테스트 컨테이너에 전달하지 않았다.
- 전환 스크립트가 exact merge·clean checkout, JVM 0, processing 목록/파일 내용, env/unit 해시, 현재/대상 이미지, suite·무결성·CI marker를 요구했다.
- `rollback-pr170-20260919`에 기존 이미지를 보존하고 current를 새 이미지로 바꾼 뒤 `systemctl restart clairkeys-omr`.
  healthcheck 통과, 실행 이미지·revision·env/unit 불변 확인. 실패 시 자동 복구 경로는 실행되지 않았다.
- 롤백 명령: `podman tag localhost/clairkeys-omr:rollback-pr170-20260919 localhost/clairkeys-omr:current` 후
  `systemctl restart clairkeys-omr`, image/health/auth 확인.

## 운영 스모크

- 공개 repo(visibility PUBLIC)의 #134 공개 첨부 `Clair_de_Lune_easy_300dpi.pdf`를 인증 없이 내려받아 로컬 원본과 SHA256
  `34d06c77…`이 같음을 확인하고, 그 공개본과 검증 코드·기준표만 `/data/analysis/pr170-live-VMfStY`에 임시 전달했다. 로컬 다운로드본은 삭제했다.
- 실행 중인 production container에서 `podman exec --workdir /app -e PYTHONPATH=/app clairkeys-omr-prod python3 <dir>/run_case.py ...`로
  실제 AudiverisProcessor·converter를 호출했다. 앱 DB/콜백/사용자 악보는 쓰지 않았다.
- 선택 XML `output/meter-retry-r13d3wv7/retry.mxl`. **191/191·타이34/43·누락9·오검출0**, m1 exact, m3 15/15.
  raw191/dots116/canonical157, tempo69, 65.217392초. 처리 29.731초·자식 최대 RSS 789,152KiB.
- 로컬 최종 `issue134-residual-ties-2026-09-19/clair-1`과 raw events 바이트 동일(SHA256 `6265859b…`), evaluation 객체 동일,
  animation은 `generated_at`만 다르다. 남은 누락 9개 목록도 같다: m3 (67)(69)(72), m6 (64), m9 (72)(76), m12 (53), m13 (55), m14 (50).
- finally에서 원본 PDF 1·이미지 포함 OMR 2 제거, 잔여 원본 0. XML/JSON/텍스트 로그만 회수했다.

## 최종 postflight

- active/healthy, current=running=`79cbc6ab…`, revision `122f5bc`, rollback=`850a4143…`. JVM 0, 기존 processing 1개·파일 내용 동일,
  env/unit 해시 동일, checkout clean, 전환 이후 journal 오류 0. 외부 health 200·무인증 401 재확인.
- 기존 로컬 기준선 이미지·VM 이전 이미지·사용자 데이터는 삭제하지 않았다. 기존 저장 악보에 반영하려면 새로 변환해야 한다.
- 전체 #134는 곡선이 없는 타이 9개(기전 A 3·m12 1·시스템 경계 5)가 남아 IN_PROGRESS다.
