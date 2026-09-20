# Issue125 검증 및 인계

Date: 2026-09-20
Status: IN_PROGRESS; 구현 완료/PR/CI/리뷰 통과 주장 아님

## 시작과 실행 환경

- git fetch origin, branch main, main..origin/main=0; 기준680fa00.
- 사용자 변경 보존: validation/2026-09-13-handoff-history.md, .bkit/, .gemini/, .pdca-status.json.
- 최신 #125 조회/규약 순서 확인 뒤 codex/issue-125-score-panel 생성.
- Orca run run_6b8ba27d9af3; agy models에서 gemini-3.8-flash-high 확인, 실제 TUI/작업 실행 인증 확인.
- Codex login status=ChatGPT 인증. 모델 캐시에 gpt-5.6-sol, gpt-5.6-luna는 별도 항목이며 단일 sol luna 없음.
  사용자에게 정확한 식별자 질문; 임의 대체 없음. Gemini 구현 담당과 별도 Gemini 독립 검증 담당 분리.
- 주 담당은 설계/TS/DB/UI/통합 검증. OMR worker ctx_3d3628887d5c는 app/converter/Python tests만 소유.
  독립 검증 ctx_f00e45d986eb는 전용 보고서와 신규 독립 테스트만 수정, settled/release external_terminal 확인.
- 상태 기록은 공유 작업자의 branch 전환 충돌을 피하려 Orca child checkout issue125-status-records에서 main으로 전환해 기록.

## 실패 먼저 / 초기 실행 결과

- score GET 테스트: 구현 전 module missing, 구현 후 권한·ID·캐시·오류8개 통과.
- scorePersistence: 구현 전3실패/1레거시통과, 구현 후4통과(저장 실패 재시도·유효성·호환).
- scoreDisplay/ScoreToggle: 구현 전 module missing, 구현 후6통과.
- ScoreFingering: 구현 전1실패, 구현 후 기존 keyboard 포함3통과.
- npx tsc --noEmit 및 npm run lint 초기 통과. 최종 코드 전체 검증은 대기.

## 렌더러 사전 검증

- opensheetmusicdisplay 2.1.3 exact 설치; npm audit0 vulnerabilities.
- BSD-3-Clause, VexFlow MIT, JSZip MIT 선택 가능. OSMD 라이선스 원문 public/licenses에 포함.
- 근거: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/develop/LICENSE
- 실제 기존 Clair 생성 MXL을 converter parser로 plain XML 추출, Orca 실제 브라우저 localhost8765에서17마디/2보표/SVG1 확인.
- plain XML 문자열 load는 invalid document 재현; DOMParser Document 인수로 해결.
- 실제 Next15/React19 localhost3100에서 API fixture로 악보/강조 렌더링 확인. 이는 신규 업로드 E2E가 아니다.
- 임시 원본/스크린샷 local-test-data/results/issue125-renderer 및 issue125-browser (Git 제외).

## 격리 DB 검증

- 새 clairkeys-issue125-db postgres16-alpine,512MiB/1CPU,127.0.0.1:55432; 기존 Docker ps 비어있었음.
- 기존 migration 20260901060000은 CREATE INDEX CONCURRENTLY transaction 오류로 migrate deploy 실패.
  해당 SQL을 이 격리DB에서 psql 개별 statement 적용 후 prisma migrate resolve --applied, 재개.
  이번 20260920030000 migration 정상 적용. 기존 migration 수정은 범위 밖.
- Prisma 실제 생성→artifact nested create→sheet delete 후 artifact count0. pg_class.relrowsecurity=true.
  실제 비소유자 DB 역할 RLS 테스트는 아직 대기.
- 앱 storage는 localhost55433 Supabase protocol stand-in. 운영/외부 저장소 검증을 주장하지 않는다.

## 남은 조건

OMR 구현/실제 매핑·Docker 빌드/실행·신규 업로드/저장 browser·전체 자동검증·리뷰 findings·PR/CI/실제 리뷰.
병합·운영 접근/배포·이슈 종료 미수행.

## 구현 커밋 bd23b19 / 최종 로컬 앱 검증

- 명시적32파일 stage·cached diff/check·Lore 검토 후 bd23b19 생성. 사용자 파일 제외 확인.
- 최종 PATH=/tmp/clairkeys-issue125-venv/bin:$PATH npm test -- --runInBand:111suites1073tests PASS (36.351s).
  새 Python artifact/독립 mapping5개를 Jest CI bridge에 포함. 직접 focused33 PASS.
- npx tsc --noEmit PASS; npm run lint PASS; npm run build PASS. build 자체는 types/lint skip이므로 별도 명령으로 검증했다.
- npm start의 빌드된 앱 localhost3100: PC+MobileChrome4 PASS, 기기 비해당2skip. 신규 e2e/score-panel.spec.ts.
- 실제 업로드: local-test-data/scores/Clair_de_Lune_easy_300dpi.pdf → browser form → Docker OMR → local Next → DB/private XML.
  sheet3/job ba227caf-da3b-49b6-875f-77e6bedaebf4; canonical150, mapping191,17measures,XML88362bytes.
  Storage animation JSON은 로컬 Supabase protocol stand-in이며 외부 Supabase 검증 아님. XML은 실제 PostgreSQL에 저장.
- Docker build --platform linux/amd64 -f omr-service/Dockerfile.audiveris -t clairkeys-omr:issue125-score-panel omr-service PASS.
  컨테이너 clairkeys-issue125-omr(memory5GiB,cpu2,JAVA_TOOL_OPTIONS=-Xmx3g,기존 concurrency1), host58000.
  app47e2ae68…/converter e8f05bc5…/artifact aa601288… 확인. converter 이후 공백만 정리했고 최종 이미지 재빌드 예정.
- 실제 변환 후 /data/processing 파일0. health200. 원본PDF는 Git/DB에 보관하지 않았다.
- pause/resume,Home/End seek,1.5x,toggle off 시 동일 playhead,refresh ON 유지,console pageErrors0.
  PC1440x1000 production: score top112 bottom452; playback box top550.5 bottom909.5.
- 자연 곡 끝은 기존 handleStop에 따라 time0/첫 마디로 돌아옴. 처음 검증 스크립트가 마지막 마디 유지를 기대해 실패했으나
  기존 hook 계약을 확인하고 기대를 수정, 재실행 PASS. 제품 동작은 변경하지 않음.
- 실제 API owner200/anonymous401/other-user404; 공개설정 후 anonymous sheet hasScore=false/score401.
  테스트용 복제 악보를 DELETE API로 제거한 뒤 artifact count0. 실제 RLS 테스트역할 SELECT0, owner SELECT1, cascade후0.
- OMR worker 및 final 독립 worker 모두 settled. 네이티브 Docker 전체 테스트는 아직 실행 중이며 완료로 세지 않는다.

## 통합/push checkpoint cdc7cc1

- bd23b19 뒤 main 상태 기록만 Lore merge해 cdc7cc17c51508951a2fa142f8405ebb89fae320. origin/codex/issue-125-score-panel push 완료.
- Chromium/Firefox/WebKit/MobileChrome/MobileSafari의 새 score-panel Playwright10 PASS/기기 비해당5skip (16.8s).
- 실제 변환 canonical150음은 기존 guarded-clair-2 기준 notes 전 필드·tempo·duration 동일(9/8).
- 첫 Docker 전체 실행 실패:202개 errors47/skip3. /fixtures 누락46건 및 /src/app/api/omr/finalize/route.ts 누락1건.
  성공으로 세지 않는다. 당시 native는 실행 통과했으나 환경을 고쳐 전체 재실행 중이다.
- 최종 clairkeys-omr:issue125-final 재빌드; 새 컨테이너에 fixtures를 /fixtures:ro, callback route 파일을 /src/...에 제공.
  app47e2ae68…/converter bfaecc0d…/artifact aa601288… 및 callback route26e8a400… SHA가 checkout과 일치.
  이전 이미지 converter와 AST도 동일(공백만 정리); 신규 독립5개 포함 최종211개 목표로 실행 중.
- 수정된 실행: docker run --platform linux/amd64 --memory5g --cpus2 -v "$PWD/fixtures:/fixtures:ro"
  -v "$PWD/src:/src:ro" ... clairkeys-omr:issue125-final, 이후 PYTHONPATH=/app python3 -m unittest discover -s /app/tests -v.
  실제 재실행에서는 src 전체 mount 대신 필요한 단일 tracked route를 docker cp하고 SHA를 대조했다.

## PR173 생성 checkpoint

- non-draft PR173 생성, head cdc7cc17c51508951a2fa142f8405ebb89fae320. CI/actual review pending.
- 두번째 Docker211개:204pass6진단skip1error. 남은 실패는 /omr-service/audiveris-patches/0001-region-scoped-ledger-recovery.patch 경로였다.
  /omr-service→/app 링크로 이미지에 원래 들어있는 패치파일을 연결. 해당 test_wedge_retry.py20개:17pass3진단skip (0.157s).
  네이티브19개 모두 실행/통과 확인; 경로를 완전히 보정한 최종전체 실행도 시작했다.
- [PR 리뷰 기록](../reviews/PR-173.md)에 CI/리뷰 대응을 추적한다. 아직 goal 완료 아님.

## Docker 최종 성공 / 실제 리뷰 P1 수정946f975

- 경로를 보정한 최종 Docker 전체211개 중205 PASS/6보관진단skip,432.367s. Native19전부 실행통과; 신규 artifact10/독립mapping5 모두 실행.
  [실행 로그](2026-09-20-issue-125-evidence/docker-tests.log). 현재 TS callback source로 갱신한 test_service_contract31개 추가PASS.
- Chromium/Firefox/WebKit/MobileChrome/MobileSafari10 PASS/기기 비해당5skip: [로그](2026-09-20-issue-125-evidence/browser-tests.log).
- 실제 Codex 리뷰 cdc7cc1: P1 영구적인 malformed/oversized artifact가 processing에 남음. ACCEPTED→FIXED.
  새4사례 모두 [수정전 실패](2026-09-20-issue-125-evidence/review-p1-before.log) → 수정후 focused23 PASS.
  invalid artifact는 callback422로 producer 재시도중단/DBfailed, poll200 statusfailed로 프론트 종료. transient storage재시도는 유지.
- 946f975848e2cf658a8783cd02f2b688e6a78843 Lore commit/push, GitHub답변 및 threadresolved, @codex review 재요청.
- 수정후 전체Jest112suites1077tests PASS(37.064s), npx tsc --noEmit PASS, npm run lint PASS, npm run build PASS.
- 현재 head CI/재리뷰를 확인하기 전 goal 완료가 아니다.
