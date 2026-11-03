# #121 OMR 내부 관측 파일럿 검증 — 2026-11-03 KST

## 범위와 기준

- 기준 main `7b3be0e7915b2da92d6f810fe2f00ceab77c6209`, fetch 후 origin/main과 동일.
- 사용자 소유 `.codex/`는 유지·미포함. 전용 브랜치 `codex/issue-121-omr-monitor-pilot`.
- [phase](https://github.com/landfill/ClairKeys/blob/e770ecd5a631b419c0c14ba411ba06e5557fe5f0/docs/recovery/phases/ISSUE-121-monitor-pilot.md), D-104. 구현·PR만 승인됐으며 운영 VM·운영 환경변수·DB는 변경하지 않았다.

## 재현 및 환경 준비

| 명령 / 확인 | 결과 |
|---|---|
| 변경 전 `python -m unittest discover -s omr-service/tests -p test_monitoring.py` | `omr.monitoring` 모듈 부재로 실패 |
| 변경 전 `npx jest src/app/api/admin/omr/__tests__/route.test.ts --runInBand --silent` | route 모듈 부재로 실패 |
| `uv venv --python 3.10 local-test-data/venv-monitor310` 및 고정 `requirements-ci.txt` 설치 | Python 3.10.20, 설치 성공 |
| `npm ci` · `npx prisma generate` | 성공. 기존 설치 Next 15.5.25 → lockfile 15.5.28. DB 접속·migration 없음 |

기본 sandbox Python 실행은 결과 없이 멈춰 중단했고 확장 실행에서는 정상 종료했다.
설치 의존성이 오래된 상태의 전체 Jest 시도와 Prisma 생성 전 E2E 시도는 중단/실패했다.
생성 누락을 복구한 뒤 아래 최종 검증을 수행했다. 이를 제품 회귀나 통과로 기록하지 않는다.

## 최종 로컬 검증

| 명령 | 결과 |
|---|---|
| 변경 영역 Jest (운영자 page/API, 계약, 메뉴, 갱신 hook) | 최초 45 tests pass, 이후 세션 오류 fail-closed 회귀를 포함한 전체 실행에서도 해당 묶음 통과 |
| `PYTHON_BIN=<venv>/Scripts/python.exe npx jest src/utils/__tests__/converterCorpus.test.ts src/ci/__tests__/omrMonitoring.test.ts --runInBand --silent` | 2 suites / 16 tests pass. 실제 MusicXML corpus→canonical 계약과 Python bridge |
| 서비스 디렉터리에서 `<venv>/Scripts/python.exe -m unittest tests.test_monitoring tests.test_callback_delivery tests.test_service_contract tests.test_score_artifact` | 65 tests pass. 실제 XML fixture 비교는 `generated_at`만 제외, 음악 데이터·score artifact 동일 |
| `npx tsc --noEmit --incremental false` | exit 0 |
| `npm run lint` | exit 0, 경고·오류 0 |
| `NEXTAUTH_SECRET=test-secret npx playwright test e2e/omr-monitor.spec.ts --project=chromium --project=firefox --project='Mobile Chrome' --workers=2 --reporter=line` | 12 pass / 16.0s. 권한·직접 API·모바일 메뉴·fixture 표시·권한 소실·키보드 갱신 |
| `npm audit --omit=dev --json` | 운영 의존성 취약점 0건 |
| `git diff --check` | exit 0 |

E2E의 첫 화면 테스트는 Next route announcer와 제품 alert가 함께 잡혀 실패했다. 제품 alert 문구로 선택자를 제한한 뒤 위 12개를 통과했다.

## 전체 회귀와 baseline 차이

- 전체 Jest `PYTHON_BIN=<venv>/Scripts/python.exe npx jest --runInBand --json`: 179 suites 중 171 pass / 8 fail,
  1782 tests 중 1771 pass / 11 fail, 345.308s. 새 운영자 기능과 Python bridge는 통과했다.
  main 소스 사본의 같은 CRLF 조건에서 실패한 8개 묶음만 실행: **8 suites fail / 11 tests fail / 146 tests pass**, 202.88s.
  JSON의 실패 테스트 이름 11개를 `Compare-Object`로 대조해 차이 없음을 확인했다.
  `postMergeVerified`, `pianoSamples`(POSIX fixture script exit 127), `postMergeWorkflow`, `uploadPathInventory`,
  `prChecksWorkflow`(CRLF 문자열 비교), `nextConfig`(Windows ESM URL), `course`(asset 재생성),
  `omrRuntimeContract`(wedge fixture Windows 임시파일 잠금)이다. 실패를 제외하거나 설정을 완화하지 않았다.
- OMR 전체 Python `-m unittest discover -s tests -v`: 변경 브랜치 219 tests 중 errors 28 / skips 22.
  main의 격리 소스 사본(OMR·fixtures·계약 참조 src 포함, 원래 서비스 cwd) 211 tests도 **같은 errors 28 / skips 22**.
  오류 이름 28개를 `Compare-Object`로 대조했으며 차이 없음. 모두 기존 wedge fixture의 Windows NamedTemporaryFile 재열기 PermissionError다.
  추가된 계측 테스트 8개가 통과했다. 이후 실제 XML 비교와 호스트 수집·drop-in 회귀를 추가했고 변경 영역 65개를 통과했다.
- 별도 묶음 실행 때 기존 Audiveris 10ms timeout 회귀 한 건이 `SuccessfulProcess.kill` 부재로 실패한 적이 있다.
  이 테스트의 mock process 생성이 10ms를 넘으면 발생하는 기존 시간 의존 경로다. 전체 baseline 대조에서는 양쪽 모두 통과했다.
  Linux CI 결과와 구분한다. 이를 새 timeout 정책 변경으로 처리하지 않는다.
- 네이티브 Audiveris 미설치로 건너뛴 22개 native 검사는 통과로 세지 않는다.

## 브라우저 → API → 실제 로컬 FastAPI 확인

- 웹: Next 15.5.28 dev 서버, 테스트 전용 JWT·allowlist·loopback OMR URL·가짜 공유 토큰만 사용.
- OMR: 새 `app.py`를 Python 3.10 uvicorn으로 loopback :39121에 실행. synthetic UUID 대기 작업 1건만 계측기에 주입했다.
  PDF 변환·운영 API·운영 DB 요청은 하지 않았다.
- 브라우저 응답 fixture를 쓰지 않은 Chromium 확인: `/api/admin/omr` HTTP 200,
  `Cache-Control: private, no-store, max-age=0`, health=ok, monitor=ok, queued=1, host=unavailable, pageerror 0.
- 데스크톱 실제 로컬 조회와 모바일 fixture 스크린샷을 열어 확인했다. 모바일 문서 가로 overflow 없음,
  작업 표는 명시적인 별도 가로 스크롤 영역이다. 실제 호스트 수집이 없는 상태를 0으로 표시하지 않는다.
- 스크린샷은 로컬 실행 근거다. 운영 VM 또는 실제 운영자 로그인 검증 근거가 아니다.
  [로컬 실제 조회 화면](2026-11-03-omr-monitor-local.png) · [모바일 fixture 화면](2026-11-03-omr-monitor-mobile-fixture.png).

## 미검증 및 배포 승인 후 확인

- 운영 VM 배포·restart·호스트 systemd timer/mount·실제 SHA/image·VM 외부 health/auth·대표 PDF 성능/자원 비교.
- Linux/Rocky systemd hardening 및 DynamicUser/StateDirectory와 Podman bind mount 실동작.
- 실제 기기·스크린리더. 장기 이력·경보·synthetic·전체 품질은 비목표다.
- production build와 전체 브라우저 E2E는 PR CI에서 판정한다.
- PR CI·최신 head 리뷰 처리 원본은 [PR261 리뷰 기록](../reviews/PR-261.md)에 둔다.
- [배포·단계적 호환·롤백 런북](https://github.com/landfill/ClairKeys/blob/e770ecd5a631b419c0c14ba411ba06e5557fe5f0/omr-service/deploy/MONITORING.md).
