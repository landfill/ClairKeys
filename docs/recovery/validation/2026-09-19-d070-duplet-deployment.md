# 2026-09-19 — PR169 둘잇단 엔진 VM 배포

## 현재 상태

사용자 "병합 승인, 브랜치 정리, vm 배포" 지시에 따라PR169를병합하고브랜치정리를완료했다.
정확한merge `9e4020a63d45223447a31df7712dfb6306687aea`의VM빌드진행중이다. 아직운영이미지는PR168이다.
후속CI·VM전체image/native·소스/클래스검증·전환·운영Clair스모크는남았다. 전체#134는IN_PROGRESS.

## 병합·정리 근거

- 직전head1debdbb필수CI모두성공·실제CodexCompleted/무지적/reviewThreads0·CLEAN/MERGEABLE을재확인했다.
- match-head-commit을지정한merge와Lore본문을사용했다. mergedAt2026-09-19T06:11:22Z.
- origin/main과로컬main에merge반영확인.승인head와merge의앱/엔진/fixture코드는diff0.
- fetch후양쪽codex/issue-134-m3-duplet tip1debdbb의main포함/고유0을확인했다.
  사용자명시적정리지시로원격삭제→main이동→로컬삭제.미커밋history메모는전후SHA256
  `36207439c88183b72476b4c98aa6962ec9a5b4439f4837711699e5d177f8a947`로동일하다.

## VM 사전 점검

- 기존PEM과StrictHostKeyChecking=yes로기존vm-naver-20260820145930에접속했다.
- active/healthy,운영image `f14c2f83933c7b459ea133860ae75e0ab75d6e44d1c35986935648fb6ca87ae0`.
  /opt/clairkeys-deploy는6de51f1·clean,83GB여유,JVM0,기존processing entry1개.
- env mode600·production·secret존재·callbackHTTPS·concurrency1을값노출없이검사했다.
  env/unit SHA와기존processing목록을변경탐지용으로저장했다.설정과데이터는수정하지않는다.
- `podman build --format docker --label org.opencontainers.image.revision=<merge> -f Dockerfile.audiveris
  -t localhost/clairkeys-omr:<merge> .` 실행중.배포checkout만정확한merge에detached이동했다.
  current태그·운영서비스는검증전에는바꾸지않는다.
- Git제외근거:`local-test-data/results/d070-deploy-2026-09-19/`,VM `/tmp/pr169-*`.
