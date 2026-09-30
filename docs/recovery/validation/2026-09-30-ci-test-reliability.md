# Validation — CI 검사 신뢰성 (PR206)

Date: 2026-09-30 KST · Branch `codex/test-omr-retry-deadline` · commits `d06332c`(테스트), `6d21565`(워크플로), `0bbc689`(phase)
Phase: [CI-test-reliability](../phases/CI-test-reliability.md)

환경: macOS, Python 3.10.19 venv(`uv`, `omr-service/requirements-ci.txt`), Node 로컬.

| 검사 | 명령 | 결과 |
|---|---|---|
| 재현(수정 전) | 모듈 시계 읽기마다 +30ms를 더하는 부하 모사 스크립트로 3개 timeout 테스트 실행 | 3/3 FAIL, `process.killed` False(기록된 증상과 동일) |
| 재현(수정 후) | 같은 스크립트 50회 반복 | 150/150 PASS |
| 재시도 스위트 | `python -m unittest discover -s tests -p 'test_*_retry_runtime.py'` | 23/23 PASS |
| 새 구조 테스트(수정 전) | `npx jest src/ci/__tests__/prChecksWorkflow.test.ts src/ci/__tests__/postMergeWorkflow.test.ts` | 2 failed(새 timeout 테스트), 14 pass |
| 전체 Jest (`d06332c`) | `PATH=<venv>/bin:$PATH npx jest` | 128 suites, 1278/1278 PASS |
| 전체 Jest (`6d21565`) | 같은 명령 | 128 suites, 1280/1280 PASS |
| tsc / lint | `npx tsc --noEmit --incremental false`, `npm run lint` | 두 커밋 모두 PASS |
| 워크플로 정적 검사 | actionlint 1.7.7 (`-shellcheck=`) `pr-checks.yml deploy.yml` | PASS |
| E2E 소요 실측 | `pr-checks.yml`·`deploy.yml` 최근 각 25 run의 `E2E Tests` job(완료, skip 제외) | 29건, 중앙값 16.5분, 최대 19.4분 |

- `6d21565` 첫 `src/ci` 실행에서 `omrCallbackDelivery` 1건이 `fastapi` 미설치로 실패했다. venv PATH 없이 실행한 환경 문제이며,
  venv PATH를 준 전체 Jest에서는 통과했다.
- 원래 간헐 실패는 전체 Jest 한 번 통과로는 증명되지 않는다. 결정적 근거는 부하 모사 전후 비교다.
- Playwright: 테스트·워크플로 설정만 바뀌어 로컬 실행 대상 spec 없음. 6개 브라우저 E2E는 PR CI가 맡는다.

미검증: hosted 러너에서 30분 상한 도달 시 실제 취소 동작.
