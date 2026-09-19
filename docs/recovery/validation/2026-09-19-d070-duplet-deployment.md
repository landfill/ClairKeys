# 2026-09-19 — PR169 둘잇단 엔진 VM 배포

## 최종 결과

- 사용자승인에따라PR169병합·원격/로컬브랜치정리·VM배포완료.
- 배포commit `9e4020a63d45223447a31df7712dfb6306687aea`,image
  `850a41430be2c0cbab6846186c53fc981540dca42211706090f16561af373517`.
- **2026-09-19 15:25:51 KST** 전환. active·healthy,외부health200/무인증401,이후journal오류0.
- VM이미지183통과/6진단skip,native12모두실행.양쪽엔진각2,433JAR항목·내장소스·글꼴이로컬검증본과같다.
- **운영컨테이너Clair모듈스모크191/191·타이31/43·누락12·오검출0.** raw/평가객체로컬동일,
  canonical은생성시각외동일. 기존저장악보는자동갱신되지않는다.
- rollback-pr169-20260919→이전f14c2f83보존. env/unit/기존processing파일및사용자미커밋메모보존.
  임시원본PDF·OMR3개제거,잔여0.웹업로드→callback→player E2E와실제rollback전환은미수행.

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

## 빌드·무결성 완료

- VM image `850a41430be2c0cbab6846186c53fc981540dca42211706090f16561af373517`,revision9e4020a,
  Docker HEALTHCHECK존재. current/운영은아직f14c2f83그대로다.
- 고정checksum23건OK,patch적용21건.빌드로그SHA256
  `75ae90ae883a3700d4f30036f81b310d155555bf60f1cfcea7ae9bcef7f0132d`.
- normal/recovery각각**JAR전체2,433항목**이로컬최종d070b의해당엔진과바이트동일하다.
  내장Dockerfile/patch/Java·Python소스전체및글꼴바이너리도같다. `integrity-comparison.json`에단언결과저장.
- OS패키지는24개버전차이가있다(`os-package-differences.json`의local/VM방향별목록).
  따라서이미지전체가동일하다고하지않는다.현재VM전체suite/native와이후실제운영Clair스모크로별도검증한다.
- 기존processing데이터1파일74,577바이트의해시manifest를저장했다. manifest SHA256
  `4f04c969efa971d87bf85fe73138c0b416a5c97e928746335ba096766fb004e5`.
  전환전/스모크후기존파일내용도확인한다.기존env/unit은읽기전용검사했고변경하지않는다.
- 네트워크없는5GB테스트컨테이너에서VM전체unittest실행중.운영비밀env는테스트컨테이너에전달하지않았다.
- 정확한merge9e4020a후속checks**6/6성공**(E2E/빌드/테스트/lint/security)확인.
  배포전외부health200·무인증POST/process401확인. 다음은VMsuite완료후idle재확인과rollback보존/전환이다.

## VM 전체 테스트·전환

- VM전체unittest **189개중183통과·6진단skip**,347.518초. native12개전부`ok`인것을로그로확인했다.
  테스트로그SHA256 `5041c21a8fc80d7e678fad865531425a25692819aa1aa6503728a7c24788bf2c`.
- 정확한merge의CI6/6및JAR/source무결성통과marker를전환스크립트가요구하도록했다.
- 전환직전JVM0,기존processing목록/파일내용,env/unit해시,clean checkout9e4020a,
  current/운영=f14c2f83·대상=850a4143을재확인했다.
- `rollback-pr169-20260919`에기존이미지를보존하고current를새이미지로전환,
  `systemctl restart clairkeys-omr`exit0. active/healthy와실행이미지·revision을확인했다.
  실패시이전이미지로복구하는경로는준비했지만실행할필요가없었다.
- 롤백명령:`podman tag localhost/clairkeys-omr:rollback-pr169-20260919 localhost/clairkeys-omr:current`
  후`systemctl restart clairkeys-omr`,image/health/auth확인. 새logical shape의privateOMR은이전엔진에재사용하지않는다.

## 원본 전송 심사와 운영 스모크

- 첫스모크실행은자동승인검사가"배포승인만으로민감할수있는PDF의운영VM전송이명시적으로승인되지않았다"며거부했다.
  해당명령은실행되지않았으며전송을우회하지않았다. 먼저스코어전송없는postflight로운영/설정/데이터보존을검증했다.
- 공개repo여부(private=false,visibility=public)를확인하고이슈134의공개첨부
  `https://github.com/user-attachments/files/31858211/Clair_de_Lune_easy_300dpi.pdf`를인증없이로컬다운로드했다.
  대상PDF와SHA256 `34d06c77398470ea6f9bf15d9cd5724a0db94c904eb81107c5ca29d2f1be5478`가같았다.
  공개된동일자료라는새근거로**같은명령**을재심사요청했고허용되어실행했다.로컬임시공개다운로드본도제거했다.
- `/data/analysis/pr169-live-nvEiRU`에공개원본과검증코드/기준표만임시전달했다. 기존사용자자료를전송하지않는다.
  실행중인production container에서`podman exec --workdir /app -e PYTHONPATH=/app clairkeys-omr-prod
  python3 <analysis>/run_case.py <PDF> <output>`로실제AudiverisProcessor와converter를호출했다.
  앱DB/콜백/사용자악보는쓰지않는다.
- 선택XML `output/meter-retry-qd605i7y/retry.mxl`. 전체원본기준표 **191/191·타이31/43·누락12·오검출0**,
  m3 15/15이벤트일치,m1 exact=true. raw191/dots116/canonical160,tempo69,총65.217392초.
  처리30.449초·자식최대RSS774,608KiB. concurrency1/heap3GB/timeout900설정유지.
- 로컬최종hardened-clair-1과raw events.json바이트동일·evaluation.json객체전체동일,
  animation.json은generated_at만차이. raw SHA256
  `2a0e5b81a5373695efe4f9659359cc7c2ac0b88af972cb80512ac4dd8f925390`.
  개별타이누락12/오검출0목록도동일하다.191/191을타이전체해결이나#134전체DONE으로해석하지않는다.
- finally에서원본PDF1·이미지포함OMR2를제거했고해당임시경로잔여PDF/OMR/래스터0확인.
  XML/JSON/텍스트로그·정리manifest만회수했다.기존/data/processing은손대지않았다.

## 최종 postflight·인계

- systemdactive/containerhealthy,current=running=850a4143,revision9e4020a,rollback=f14c2f83.
- JVM0,기존processing1개및기존파일1개내용hash동일,env/unit해시동일,배포checkout9e4020a clean.
  전환시각이후journal error/exception/traceback0.외부health200·무인증POST/process401재확인.
- 사용자history메모SHA36207439…보존.원격/로컬작업브랜치는삭제됐고현재local main이다.
  기존로컬기준선이미지·VM이전이미지·다른프로젝트/볼륨·사용자데이터는삭제하지않았다.
- 작업완료. 기존저장악보에반영하려면새로변환해야한다. 웹업로드/callback/player E2E는이번배포검증범위에없으며,
  운영모듈스모크와동일한검증이라고표현하지않는다. 전체#134는타이12누락등이남아IN_PROGRESS다.
