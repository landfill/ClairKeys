# 2026-09-19 — PR168 m1 점 보존 엔진 VM 배포

## 현재 상태

사용자가 "브랜치 정리와 vm 배포도 완료하라"고 명시 지시했다. 브랜치 정리 완료, 정확한 병합 커밋6de51f1 이미지 빌드 완료·검증 중이다.
이미지/native/클래스 검증 뒤12:01:17 KST에 PR168로 전환했다. 운영 원본 스모크는 진행 중이다.

## 브랜치 정리

- fetch 후 로컬·원격 codex/issue-134-m1-tie-cut-dots tip 모두2458daffc8e563beb3a4dd78144547703fcbb1dc.
  두 tip의 main 대비 고유 커밋0, 모두 main ancestor임을 확인했다.
- 사용자의 이번 명시적 정리 지시에 따라 원격삭제 → main 확인 → 로컬삭제 순서로 정리했다.
  사용자 미커밋 history 메모는 수정/stage하지 않았다. SHA256은 전후
  `36207439c88183b72476b4c98aa6962ec9a5b4439f4837711699e5d177f8a947`로 같다.

## 배포 사전 점검

- 기존 PEM 및 StrictHostKeyChecking=yes로 vm-naver-20260820145930에 접속했다.
- 서비스 active, running/healthy, 이전 이미지b28cc02d434facaeff0982910c680f871d11849591d8a35799d6197cac110bc1.
- /opt/clairkeys-deploy는983caf9·clean, 디스크84GB 여유, java/javac/Audiveris0, env mode600.
- 정확한 병합 커밋6de51f1b1e4e7b8a25107627cf9beb3f37d016a9를 detached checkout하고,
  `podman build --format docker --label org.opencontainers.image.revision=<merge> -f Dockerfile.audiveris -t localhost/clairkeys-omr:<merge> .`로 빌드 중이다.
  current 태그는 아직 변경하지 않았다. 기존 env/unit/사용자 processing 데이터를 보존한다.

다음: 전체 이미지/native 테스트, normal/recovery 클래스/소스 검증, idle 재확인, rollback 태그 확보,
전환·health/auth·운영 모듈 스모크와 임시 PDF/이미지 제거. 원본은 영구 보관하지 않는다.

## 빌드 완료

- 새 이미지 `f14c2f83933c7b459ea133860ae75e0ab75d6e44d1c35986935648fb6ca87ae0`, revision6de51f1.
  Docker HEALTHCHECK 존재 확인. current/운영은 아직b28cc02d다.
- 빌드 checksum15건 OK, patch 적용13줄, rejected hunk/fuzz0.
  회수한 build 로그 SHA256 `cd0188c304237e7c7d69ee8181d61f6375f3b75c3f5d444268398c101240ecab`.
- 이전983caf9 대비 requirements/deploy/src diff는 비어 있다. env mode600·production/secret/callback HTTPS/concurrency1을
  값 노출 없이 확인했고 env/unit 해시·기존 processing 목록(1개)을 보존용으로 기록했다.
- `podman run --rm --network none --memory=5g`와 fixtures/src read-only mounts로 전체 이미지 unittest 실행 중이다.
  production env 파일을 테스트 컨테이너에 넘기지 않는다. 시작 전 JVM0을 확인했다.
- 배포 전 외부 health200·무인증POST/process401. 다음은 테스트·클래스 확인 후 idle 재점검/전환이다.

## 이미지 검증·전환 완료

- VM 이미지 전체 **188개 중182통과·6skip**,272.687초. native11개 전부 실행·통과했다.
  skip6개는 과거 로컬 진단 자료 부재이며 핵심 native skip은 없다.
- normal/recovery의 SymbolsFilter 및 내부3클래스, 기존 SymbolsLinker/HeadChordInter/AbstractBeamInter/SlurInter/
  AugmentationDotInter/SigReducer 총10클래스가 로컬d069b와 모두 동일하다. SymbolsCleaner SHA1f1c023e… 유지.
  내장 Dockerfile/0009 patch/Java·Python fixture 소스도 검증한 local image와 SHA 일치한다.
- image-tests 로그 SHA `ae1b16ea8341c8164b94f20d8d655ba71b985158ddc210637be731b775edc3ca`.
- 전환 직전 JVM0, processing 기존1개 목록 동일, env/unit 해시 동일, clean checkout6de51f1,
  current/운영=b28cc02d, 대상=f14c2f83, merge checks6/6 성공을 재확인했다.
- **2026-09-19 12:01:17 KST**: rollback-pr168-20260919에 이전b28cc02d를 보존하고 current를f14c2f83으로 전환,
  `systemctl restart clairkeys-omr` exit0. 실패 시 이전 이미지로 복구하는 경로를 준비했으나 실행하지 않았다.
- 전환 후 active·healthy, running image=current=f14c2f83, revision6de51f1, JVM0, processing1개 및 env/unit 보존.
  외부 health200·무인증POST/process401 확인. 운영 컨테이너 모듈에서 Clair 임시 변환/전체 기준표 평가를 진행 중이다.

롤백 명령: `podman tag localhost/clairkeys-omr:rollback-pr168-20260919 localhost/clairkeys-omr:current` 후
`systemctl restart clairkeys-omr`, image/health/auth를 다시 확인한다. 기존 이미지/데이터는 보존했다.
