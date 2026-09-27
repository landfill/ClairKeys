# Validation — 연습 기록 (PR194)

Date: 2026-09-27 KST · Branch `codex/feat-practice-records` · head `b2a0d62`

| 단계 | 명령 | 결과 |
|---|---|---|
| 선실패 | 삭제 트랜잭션, 연습 API, 보고 훅, 요약 문구 | 1 fail + 모듈 없음 ×3 |
| 실제 DB | 임시 `postgres:16-alpine`(`--rm`), 모든 migration 적용(`20260901060000`은 CONCURRENTLY 때문에 임시 DB에서만 applied 표시) | FK `confdeltype=r` 확인. 기존 삭제 P2003 실패, 새 트랜잭션은 악보·두 사용자 기록 삭제 |
| 구현 후 | `PATH=<py3.10 venv>/bin:$PATH npx jest` | 1119/1119 |
| | `npx tsc --noEmit`, `npm run lint`, `npm run build` | PASS |
| | Playwright practice-records (D-058 세션 쿠키) | 8 pass / 2 mobile skip |

미검증: 운영 DB 쓰기, 계정 삭제 시 기록 처리. 임시 컨테이너는 종료와 함께 제거됨.
