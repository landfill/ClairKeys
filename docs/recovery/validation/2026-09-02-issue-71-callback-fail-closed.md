# Validation — issue #71 / callback address fails closed

Date: 2026-09-02 KST
Branch: `codex/issue-71-callback-fail-closed`
Commits: `dea17cc` (regression), `dd6f62b` (fix + D-036), `24424e7` (review regression), `0dd2e07` (helper)
Pull request: [#109](https://github.com/landfill/ClairKeys/pull/109)
Environment: macOS (Darwin 25.5.0), Node/npm from repo lockfile, no database or OMR service reachable

## Claim being verified

1. `POST /api/omr/upload`은 `NEXTAUTH_URL`이 미설정이거나 공백이면 행을 만들기 전에 503
   `OMR_CALLBACK_NOT_CONFIGURED`로 거부한다 — 잘못된 절대 URL과 같은 분기.
2. `request.nextUrl.origin`은 이 라우트에서 더 이상 읽지 않는다.
3. `NEXTAUTH_URL`이 설정된 경우 기존 동작(콜백 URL 구성, 행 생성, 서비스 호출)은 바뀌지 않는다.

## Regression evidence before the fix

`npx jest src/app/api/omr/upload` at `dea17cc`:

```
✕ refuses before creating a row when NEXTAUTH_URL is unset
✕ refuses before creating a row when NEXTAUTH_URL is blank
    Expected: "OMR_CALLBACK_NOT_CONFIGURED"
    Received: "OMR_SERVICE_UNAVAILABLE"
Tests: 2 failed, 11 passed, 13 total
```

`OMR_SERVICE_UNAVAILABLE`은 행이 생성되고 서비스 호출까지 간 뒤의 응답이다 — 이슈가 지적한 "미설정을 조용히
추측한다"가 그대로 관측됐다.

## Commands and results (at `dd6f62b`)

| Command | Result | Evidence |
|---|---|---|
| `npx jest src/app/api/omr/upload` | PASS | 13/13 (11 → 13) |
| `npm test -- --runInBand` | PASS | 85 suites / 781 tests (778 → 781) |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm run lint` | PASS | No ESLint warnings or errors |
| `npm run build` | PASS | Compiled successfully, 33 static pages |
| `git diff --check` | PASS | clean |
| `grep -n "nextUrl" src/app/api/omr/upload/route.ts` | PASS | no match |

## Review-driven second pass (at `0dd2e07`)

독립 리뷰가 첫 구현에서 두 결함을 찾았다. 둘 다 `24424e7`에서 실패로 관측한 뒤 고쳤다.

| Case | Before (`dd6f62b`) | After (`0dd2e07`) |
|---|---|---|
| `NEXTAUTH_URL=ftp://app.example.test` | 200 — 행 생성, 서비스 호출 | 503 `OMR_CALLBACK_NOT_CONFIGURED`, 행 없음 |
| `NEXTAUTH_URL=https://admin:hunter2@app.example.test with space` | 503이지만 `console.error`에 `hunter2` 포함 | 503, 로그에 값 없음 |

| Command | Result | Evidence |
|---|---|---|
| `npx jest src/app/api/omr src/lib/omr` | PASS | 5 suites / 64 tests |
| `npm test -- --runInBand` | PASS | 85 suites / 793 tests |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm run lint` | PASS | clean |
| `npm run build` | PASS | Compiled successfully |

## Production configuration check

`vercel env ls production` and `vercel env ls preview` (names only, values not pulled):

| Variable | Production | Preview |
|---|---|---|
| `NEXTAUTH_URL` | present (389d) | present (389d) |
| `OMR_SERVICE_URL` | present | present |
| `OMR_SHARED_SECRET` | present | present |

리뷰 R2가 지적한 대로, 2026-08-28의 콜백 주소 관측은 fallback이었어도 같은 값을 내므로 설정 여부의 증거가 아니었다.
위 조회가 그 자리를 대신한다. 값이 `https://clairkeys.vercel.app`인지는 확인하지 않았다 — `vercel env pull`은 값을
로컬에 내려받으므로 하지 않았다.

## Baseline comparison

- Fixed failures: 없음 — 기존 실패는 이미 해소된 상태
- Remaining pre-existing failures: 없음
- New failures: 없음

## Manual checks

- `.github/workflows/{test,pr-checks,deploy}.yml` — 5개 job 모두 `NEXTAUTH_URL: http://localhost:3000` 설정.
  hosted E2E는 fallback에 기대지 않는다.
- `docs/`, `README.md`, `.env.example` — origin fallback을 문서화한 곳 없음 (HANDOFF의 역사 기록 제외).
- D-018 Decision 1 — "없으면 현재 요청 origin을 쓴다" 명시 확인. 결정 변경이므로 D-036을 같은 커밋에 넣었다.

## Gaps and risks

- 운영 `NEXTAUTH_URL`의 존재는 확인했지만 값은 확인하지 않았다. 값이 잘못돼 있다면 업로드가 503으로 거부된다 —
  의도된 동작이며 운영자가 고칠 문제다.
- 이슈 #71 선택 항목 2(`omr-service` 호스트 검증)는 하지 않았다. D-036 Rejected 참조.
