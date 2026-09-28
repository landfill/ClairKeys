# Validation — 작업 규약 중복 정리 (PR199)

Date: 2026-09-28 KST · Branch `codex/doc-harness-dedupe` · heads `cd58f3c`, `0455dfa`

변경은 `docs/`·`*.md`와 PR 템플릿뿐이다(애플리케이션·워크플로 코드 없음).

| 검사 | 명령 | 결과 |
|---|---|---|
| 링크 | 편집 문서 5개 상대 링크 존재 확인(python) | PASS |
| 전체 Jest (`cd58f3c`) | `PATH=<uv py3.10 venv>/bin:$PATH npx jest` 2회 | 1회차 1 fail/1248 pass, 2회차 2 fail/1247 pass. 실패는 모두 `omrRuntimeContract` → Python `test_*_retry_runtime.py`의 `test_timed_out_retry_is_killed_*` |
| 실패 단독 재실행 | `npx jest src/utils/__tests__/omrRuntimeContract.test.ts` | 19/19 PASS |
| tsc / lint | `npx tsc --noEmit --incremental false`, `npm run lint` | PASS |
| hosted (`cd58f3c`) | PR Checks | 문서 전용 PR: `Lint` 실행, `Run Tests`·`E2E Tests`·`Security Audit`·`Build Check` skipped, All Checks Complete PASS, MERGEABLE/CLEAN — D-087의 미검증 항목(skipped→success 집계)을 실측 |

## 기존 간헐 실패 (이 PR과 무관)

테스트는 재시도 마감을 `monotonic() + .02`(20ms)로 준다. `omr-service/omr/audiveris.py`의 재시도 경로(199·212–213행 등)는
프로세스를 띄우기 전에 마감이 지났으면 원래 결과를 그대로 돌려주므로, 전체 병렬 실행처럼 부하가 크면 프로세스가 생기지 않아
`process.killed`가 False로 남는다. 이 PR은 코드를 바꾸지 않았고 같은 코드의 hosted CI(`5bffb90` Run Tests)는 통과했다.
수정은 별도 작업 후보로 분리했다(시간 제어로 결정적 테스트화).

미검증: 새 규약을 따른 실제 작업 한 사이클(다음 코드 PR에서 확인).
