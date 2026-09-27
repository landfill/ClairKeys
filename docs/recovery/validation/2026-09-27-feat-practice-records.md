# Validation — 연습 기록 (PR194)

Date: 2026-09-27 KST · Branch `codex/feat-practice-records` · heads `b2a0d62` → `aaf758b`

| 단계 | 명령 | 결과 |
|---|---|---|
| 선실패 | 삭제 트랜잭션, 연습 API, 보고 훅, 요약 문구 | 1 fail + 모듈 없음 ×3 |
| 실제 DB | 임시 `postgres:16-alpine`(`--rm`), 모든 migration 적용(`20260901060000`은 CONCURRENTLY 때문에 임시 DB에서만 applied 표시) | FK `confdeltype=r` 확인. 기존 삭제 P2003 실패, 새 트랜잭션은 악보·두 사용자 기록 삭제 |
| 구현 후 | `PATH=<py3.10 venv>/bin:$PATH npx jest` | 1119/1119 |
| | `npx tsc --noEmit`, `npm run lint`, `npm run build` | PASS |
| | Playwright practice-records (D-058 세션 쿠키) | 8 pass / 2 mobile skip |

| 리뷰 수정 `aaf758b` | 5개 회귀 테스트 선실패 → sheet API + 보고 훅 63/63, 전체 Jest 1123/1123(py3.10 venv), tsc, lint, Playwright practice-records 8 pass / 2 skip | PASS |
| 경쟁 재현 | 임시 `postgres:16-alpine` 두 연결: T1 `FOR UPDATE`→2초 대기→기록·악보 삭제→COMMIT, T2 기록 INSERT | T2 1.61초 대기 후 `Key (sheetMusicId)=(1) is not present` 실패, 최종 악보0·기록0 |

미검증: 운영 DB 쓰기, 계정 삭제 시 기록 처리. 임시 컨테이너는 종료와 함께 제거됨.
