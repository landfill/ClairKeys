# PR261 계측 누락 시 정상 집계 방지 — 2026-11-03 KST

## 재현과 수정

자체 검토에서 collector.update 실패를 주입했을 때 변환 결과는 보존되지만 snapshot이 정상 0건으로 반환되는 것을 재현했다.
`test_instrumentation_failure_preserves_fixture_result`에 불완전 snapshot 거절 조건을 먼저 추가했다.
수정 전 단일 테스트는 `RuntimeError not raised`로 실패했다.

D-104를 보완해 이벤트 기록 실패 시 process-local incomplete flag를 설정한다.
snapshot은 해당 프로세스의 재시작까지 거절되며 기존 `/monitor`의 sanitized 503 처리로 전달된다.
health·변환·기존 status/result 계약은 유지한다. 운영 restart는 수행하지 않는다.

## 검증

| 명령 | 결과 |
|---|---|
| `<Python3.10 venv>/Scripts/python.exe -m unittest tests.test_monitoring.RuntimeTests.test_instrumentation_failure_preserves_fixture_result` (수정 전) | 1 fail, RuntimeError not raised |
| 같은 venv로 `-m unittest tests.test_monitoring tests.test_callback_delivery tests.test_service_contract tests.test_score_artifact` (수정 후) | 65 tests pass, 0.901s |
| `npx tsc --noEmit --incremental false` | exit 0 |
| `npm run lint` | exit 0, 경고·오류 0 |
| `PYTHON_BIN=<venv>/Scripts/python.exe npx jest --maxWorkers=4 --json` | 180 suites 중 172 pass / 8 fail, 1784 tests 중 1773 pass / 11 fail, 183.745s. 검증된 main baseline과 같은 실패 이름 11개 |
| `git diff --check` | exit 0 |

실제 VM의 계측 오류·운영 복구는 미검증이다. CI·리뷰의 원본은 [PR261 기록](../reviews/PR-261.md)이다.
