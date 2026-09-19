# 2026-09-19 — PR171 오선 purge 타이 (D-072) VM 배포

## 최종 결과

- 사용자 "병합하고 브랜치 정리, vm 배포까지 진행해" 지시에 따라 PR171 병합·원격/로컬 브랜치 정리·VM 배포를 완료했다.
- 배포 commit `867513c175a508213ee9754b10977e52d7a98d91`, image
  `5af0b7967e8e7d6e3f2fe3d02fc92ce5cebef4dc6513bc5bacb9b2b3a07b87c4`. **2026-09-19 23:57:36 KST** 전환.
- active·healthy, 외부 health 200·무인증 POST /process 401, 전환 이후 journal error/exception/traceback 0.
- **운영 컨테이너 Clair 모듈 스모크 191/191·타이37/43·누락6·오검출0.** raw events 바이트·평가 객체가 로컬 최종 d072b 검증과 같고,
  애니메이션은 `generated_at`만 다르다. 기존 저장 악보는 자동 갱신되지 않는다.
- `rollback-pr171-20260919` → 이전 `79cbc6ab…`(PR170) 보존. env/unit/기존 processing 파일·사용자 미커밋 메모 보존.
  임시 원본 PDF·OMR 3개 제거, 잔여 0. 웹 업로드→callback→player E2E와 실제 롤백 전환은 수행하지 않았다.
- 로컬 근거(Git 제외): `local-test-data/results/d072-deploy-2026-09-19/`, VM `/tmp/pr171-*`, `/data/analysis/pr171-live-YOwVSx`(XML/JSON/로그만).

## 병합·정리

- 병합 직전 head `3143f2d` 필수 CI 13 pass/2 path skip, Codex Completed, 스레드 1개 resolved, CLEAN/MERGEABLE 재확인.
  늘어난 inline/review 1건씩은 본인 답글이었다. `--match-head-commit`과 Lore 본문으로 병합(mergedAt 2026-09-19T14:41:24Z).
  승인 head와 merge의 omr-service/src/fixtures diff 0.
- 로컬·원격 tip 모두 `3143f2d`, main 포함·고유 0 확인 후 원격 삭제 → main 위치 → 로컬 삭제. 사용자 history 메모 SHA256 `36207439…` 전후 동일.
- merge `867513c` post-merge checks 6/6 success(E2E 포함). [리뷰 기록](../reviews/PR-171.md).

## VM 사전 점검·빌드·무결성

- `vm-naver-20260820145930`: active/healthy, 운영 image `79cbc6ab…`(PR170), checkout `122f5bc` clean, JVM 0, 여유 82GB, processing entry 1개.
  env/unit 해시(`7c903556…`/`bbc2f714…`)와 processing manifest(`4f04c969…`, 1파일 74,577바이트)가 PR170 배포 때와 같다. 값은 노출하지 않았다.
- 배포 checkout만 `867513c`에 detached 이동 후 `podman build --format docker --label org.opencontainers.image.revision=<merge>`. exit 0,
  HEALTHCHECK 포함, 빌드 로그 SHA256 `47817769…`. checksum 24건(고정 소스 21 + openjdk + deb + tessdata)·patch 적용 24줄.
  0012가 Dockerfile 상단에 `SLURS_BUILDER_SHA256` ARG를 더해 apt 레이어 캐시가 무효화되어 deb·tessdata checksum도 이번 로그에 다시 출력됐다.
- VM 이미지와 로컬 d072b-patched를 같은 스크립트로 비교: normal/recovery 각 **JAR 2433항목 전부 동일**, 테스트 클래스 12개 동일,
  `/app` 75개 파일 동일(로컬 이미지에만 있는 `.DS_Store` 1개 제외). `SlursBuilder.class` `3c693ac2…`, `ClumpPruner.class` `fbcd95b0…`.

## VM 전체 테스트·전환

- 네트워크 없는 5GB 컨테이너에서 VM 전체 unittest **191개 중 185통과·6진단skip**, 399.043초. native 14개 모두 `ok`
  (새 `test_staff_line_hugging_ties_native` 포함). 로그 SHA256 `971e6b57…`. 운영 비밀 env는 테스트 컨테이너에 전달하지 않았다.
- 전환 스크립트가 exact merge·clean checkout, JVM 0, processing 목록/파일 내용, env/unit 해시, 현재/대상 이미지, suite·무결성·CI marker를 요구했다.
- `rollback-pr171-20260919`에 기존 이미지를 보존하고 current를 새 이미지로 바꾼 뒤 재시작. healthcheck 통과, 실행 이미지·revision·env/unit 불변.
- 롤백 명령: `podman tag localhost/clairkeys-omr:rollback-pr171-20260919 localhost/clairkeys-omr:current` 후
  `systemctl restart clairkeys-omr`, image/health/auth 확인.

## 운영 스모크

- #134 공개 첨부 `Clair_de_Lune_easy_300dpi.pdf`를 인증 없이 내려받아 로컬 원본과 SHA256 `34d06c77…` 일치를 확인하고,
  그 공개본과 검증 코드·기준표만 `/data/analysis/pr171-live-YOwVSx`에 임시 전달했다. 로컬 다운로드본은 삭제했다.
- 실행 중인 production container에서 `podman exec`로 실제 AudiverisProcessor·converter를 호출했다. 앱 DB/콜백/사용자 악보는 쓰지 않았다.
- 선택 XML `output/meter-retry-gwz7uz6b/retry.mxl`. **191/191·타이37/43·누락6·오검출0**, m1 exact, m3 15/15. raw191/dots116/canonical154,
  tempo69, 65.217392초. 처리 30.22초·자식 최대 RSS 816,012KiB.
- 로컬 최종 `issue134-staff-purge-2026-09-19/clair-1`과 raw events 바이트 동일(SHA256 `926139da…`), evaluation 객체 동일, animation은
  `generated_at`만 다르다. 남은 누락 6개: m3 (69)(72), m6 (64), m9 (72)(76), m12 (53).
- finally에서 원본 PDF 1·이미지 포함 OMR 2 제거, 잔여 원본 0.

## 최종 postflight

- active/healthy, current=running=`5af0b796…`, revision `867513c`, rollback=`79cbc6ab…`. JVM 0, 기존 processing 1개·파일 내용 동일,
  env/unit 해시 동일, checkout clean, 전환 이후 journal 오류 0. 외부 health 200·무인증 401 재확인.
- 기존 로컬 기준선 이미지·VM 이전 이미지·사용자 데이터는 삭제하지 않았다. 기존 저장 악보에 반영하려면 새로 변환해야 한다.
- 드뷔시 달빛 등 corpus 곡의 운영 재변환은 하지 않았다. 전체 #134는 m12 교차 1·시스템 경계 5가 남아 IN_PROGRESS다.
