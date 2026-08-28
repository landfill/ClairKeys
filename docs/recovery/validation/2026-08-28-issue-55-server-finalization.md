# Validation — issue 55/server-owned OMR finalization

Date: 2026-08-28
Commit: `00b6b411a47d5cb6ae662cfdaa3a7d44c7f40ae7`
Environment: macOS, Node/Jest, Python 3.14, local mocks; external OMR/Supabase not contacted

## Claim being verified

브라우저가 업로드 화면을 떠나도 OMR 생산자가 인증된 Next.js callback을 호출해 변환 결과 저장을
트리거한다. OMR 서비스는 storage credential을 갖지 않고, 브라우저 poll은 중복 안전한 fallback이다.

## Regression before implementation

| Command | Result | Evidence |
|---|---|---|
| focused Jest: upload + finalize route | FAIL | callback URL 없음 1건, finalize route module 없음 3건 — 4 failed / 8 passed |
| `python3 -m unittest omr-service/tests/test_service_contract.py` | FAIL | callback form binding·background forwarding 없음 — 2 failed / 20 passed |

회귀만 담은 커밋은 `7c0242f`다.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| focused Jest 3 route suites | PASS | 3 suites / 21 tests |
| `python3 -m unittest omr-service/tests/test_service_contract.py` | PASS | 22 tests |
| `npm test -- --runInBand` | PASS | 55 suites / 522 tests |
| `python3 -m unittest discover -s omr-service/tests` (repo root) | INVOCATION_ERROR | `omr` module path가 없어 22 pass 후 `test_audiveris_runtime` import error; 코드 실패 아님 |
| `python3 -m unittest discover -s tests` (`omr-service/` cwd) | PASS | 34 tests |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm run lint` | PASS | warnings/errors 0 |
| `npm run build` | PASS | Prisma generate + Next production build; `/api/omr/finalize` route 포함 |
| `git diff --check` | PASS | whitespace error 없음 |

### Hosted security review correction

- 최초 head `00b6b41`에서 CodeQL `js/request-forgery` critical 1건이 실패했다. callback request의
  `job_id`가 공유 helper를 거쳐 OMR `/result` fetch URL에 도달했다.
- `6f624f7`에서 UUID 외 입력을 400으로 거절하고, request 값은 DB lookup에만 사용하며, fetch에는
  DB row에서 다시 읽은 `omrJobId`만 전달한다. path encoding도 추가했다.
- 수정 후 focused Jest **3 suites / 19 tests**, tsc, lint, diff check 통과. hosted CodeQL 재실행은
  이 기록 시점에 대기 중이다.

## Baseline comparison

- Fixed failures: browser poll만 존재하던 완료 trigger에 producer callback 계약과 endpoint 추가.
- Remaining pre-existing failures: 없음. 잘못된 cwd의 Python discovery 호출은 올바른 cwd에서 재실행해 통과.
- New failures: 없음.

## Manual checks

- `OMR_SHARED_SECRET` 미설정 503, 불일치 401, 저장 완료 뒤 재호출 no-op을 route tests로 확인.
- storage 실패 뒤 `failed` 행도 후속 callback이 다시 저장해 `completed`로 복구함을 확인.
- callback URL이 잘못되면 DB 행 생성 전에 503으로 거절함을 확인.

## Gaps and risks

- 실제 VM→Vercel callback과 실제 Supabase 저장은 배포 전이라 검증하지 못했다.
- callback retry는 OMR 프로세스 메모리이며 재시작을 견디지 않는다. 영속 queue로 표현하지 않는다.
- 실제 PDF 업로드 뒤 즉시 페이지를 떠나는 사용자 시나리오는 배포 후 검증해야 한다.
