# Validation — brace-expansion 5.0.12 고정 (PR207)

Date: 2026-09-30 KST · Branch `codex/chore-brace-expansion-5012` · commit `4c54b39`

원인: PR206 hosted Security Audit(run 36702723618)이 `npm audit --audit-level high`에서 brace-expansion 4.0.0–5.0.11 high 1건으로 실패.
PR206은 의존성을 바꾸지 않았다. 새 advisory GHSA-q2hr-2g5m-vwhr·GHSA-qhr7-859c-m2p7·GHSA-6j4f-fj2g-mc7p.

| 검사 | 명령 | 결과 |
|---|---|---|
| 감사(수정 전, hosted) | `npm audit --audit-level high` | exit 1, high 1건(brace-expansion) |
| 감사(수정 후) | 같은 명령 | exit 0, 0 vulnerabilities |
| 해석 | `npm ls brace-expansion --all` | 3곳(eslintrc minimatch 3, typescript-estree·jest reporters minimatch 9) 모두 5.0.12 |
| 전체 Jest | `PATH=<py3.10 venv>/bin:$PATH npx jest` | 128 suites, 1278/1278 PASS |
| tsc / lint | `npx tsc --noEmit --incremental false`, `npm run lint` | PASS |

미검증: 런타임 영향 없음(lint·test 도구 전용). production build·E2E는 PR CI가 맡는다.
