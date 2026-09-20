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
