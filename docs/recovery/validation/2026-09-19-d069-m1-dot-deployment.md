# 2026-09-19 — PR168 m1 점 보존 엔진 VM 배포

## 최종 결과

- 사용자 지시에 따라 PR168 로컬·원격 브랜치 정리 및 운영 VM 배포를 완료했다.
- 배포 커밋 `6de51f1b1e4e7b8a25107627cf9beb3f37d016a9`, image `f14c2f83933c7b459ea133860ae75e0ab75d6e44d1c35986935648fb6ca87ae0`.
- 2026-09-19 **12:01:17 KST** 전환. active·healthy, 외부 health200/무인증401, 이후 journal 오류0.
- VM 이미지188개 중182통과·6진단skip, native11개 전부 실행.10클래스/내장 source가 로컬 검증본과 같다.
- **실행 중인 운영 컨테이너의 Clair 모듈 스모크:187/191·타이30/43, m1 완전 일치**.
  raw191/animation160·tempo69, 로컬 최종과 raw 바이트/평가객체 동일, animation은 generated_at만 다르다.
- rollback-pr168-20260919→이전b28cc02d 보존. env/unit/기존 processing 데이터/사용자 로컬 메모 보존.
- 임시 원본 PDF와 이미지 포함 OMR2개를 제거했다. 웹 업로드→callback→player E2E는 수행하지 않았으며 기존 저장 악보는 자동 갱신되지 않는다.

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

## 운영 원본 스모크·최종 확인

- 전환 후 JVM0/기존 processing 목록 동일 및 running image=f14c2f83을 확인하고,
  `/data/analysis/pr168-live-bE4plz`에 원본 PDF를 SSH로 임시 전달했다. 실행 중인 production container에서
  `podman exec --workdir /app -e PYTHONPATH=/app clairkeys-omr-prod python3 <analysis>/run_case.py <PDF> <output>`를 사용했다.
  실제 AudiverisProcessor+converter를 호출하며 앱 DB/콜백/사용자 악보를 쓰지 않는다.
- 선택 XML: `output/meter-retry-4px1hj0o/retry.mxl`. 저장소191이벤트 전체 기준표로 평가:
  **187/191, matched ties30/43, m1 exact=true**, tempo69, raw191·dots116·canonical160, 총65.217392초.
  처리28.784초, 자식 최대RSS780,692KiB. 서비스 concurrency1/heap3GB/timeout900초 설정 유지.
- 로컬 최종 clean-clair-1과 comparison: events.json 바이트 동일, evaluation.json 객체 전체 동일,
  animation.json은 generated_at만 차이. raw SHA `b985a110545986e47f533dd8311e61d88d846949b406bd57a795f1b333d29c66`.
  타이 개별 누락13/오검출1 목록과 m2–17 결과도 로컬 검증 그대로다. m3 둘잇단4/타이13건 전체는 여전히 후속 범위다.
- finally 정리로 원본PDF1·이미지 포함OMR2개 제거, 해당 임시 경로에 PDF/OMR/래스터 이미지 잔여0을 직접 재확인했다.
  MusicXML/JSON·텍스트 로그·정리 manifest만 남겼으며 로컬 `local-test-data/results/d069-deploy-2026-09-19/`에 회수했다.
- 최종 postflight: systemdactive/containerhealthy, current=running=f14c2f83, revision6de51f1,
  rollbacktag=이전b28cc02d, JVM0, processing1개 목록 보존, env/unit hash 동일, deploy checkout6de51f1 clean.
  전환시점 이후 journal error/exception/traceback0. 외부 health200·무인증POST/process401 재확인.
- 사용자 원문 history SHA36207439…를 보존하고 stage하지 않았다. 기존 로컬 기준선/VM 이전 이미지·기존 processing 자료를 삭제하지 않았다.
- 한계: 이 스모크는 실행 중인 운영 이미지의 모듈 검증이며 웹 업로드→콜백→플레이어 E2E가 아니다.
  롤백 태그와 실패 복구 경로는 준비했지만 실제 롤백 전환은 불필요하여 실행하지 않았다.
