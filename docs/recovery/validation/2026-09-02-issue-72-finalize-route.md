# Validation — issue #72 / finalize route consistency

Date: 2026-09-02 KST
Branch: `codex/issue-72-finalize-route`
Commits: `e77e4a52e3fdc7fc42c2c572618c7a3db6de0212` (regression), `bac8cdd5b2f1602bdb2a0845cb322d086fa87dc5` (fix)
Pull request: [#107](https://github.com/landfill/ClairKeys/pull/107)
Environment: macOS (Darwin 25.5.0), Node/npm from repo lockfile, no database or OMR service reachable

## Claim being verified

1. `POST /api/omr/finalize`의 `alreadyStored` 단축 경로가, `animationDataUrl`은 있지만 `processingStatus`가
   `completed`가 아닌 행을 `completed`로 보정한다 (PR #68 R11).
2. 이미 `completed`인 행에는 쓰지 않는다 — 기존 멱등성 테스트가 수정 없이 통과한다.
3. `/result` fetch 위 주석과 409 분기 주석이 실제 sanitizer(`UUID_PATTERN` + `encodeURIComponent`)와
   타입 좁히기라는 사실을 가리킨다 (PR #68 R8). 이는 동작이 아니라 텍스트이므로 테스트 대상이 아니다.

## Regression evidence before the fix

`npx jest src/app/api/omr/finalize` at `e77e4a5`:

```
✕ repairs a stored row whose status drifted away from completed
Expected: {"data": ObjectContaining {"processingStatus": "completed"}, "where": {"id": 17}}
Number of calls: 0
Tests: 1 failed, 6 passed, 7 total
```

## Commands and results (at `bac8cdd`)

| Command | Result | Evidence |
|---|---|---|
| `npx jest src/app/api/omr` | PASS | 4 suites / 33 tests |
| `npm test -- --runInBand` | PASS | 85 suites / 778 tests (777 → 778) |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm run lint` | PASS | No ESLint warnings or errors |
| `npm run build` | PASS | Static/Dynamic route table emitted |
| `git diff --check main..HEAD` | PASS | no whitespace errors |

## Baseline comparison

- Fixed failures: 없음 — 기존 실패는 이미 해소된 상태
- Remaining pre-existing failures: 없음
- New failures: 없음

## Manual checks

- `prisma/schema.prisma:78` — `omrJobId String? @unique`. nullable이므로 `if (!storedJobId)`는 실제
  TypeScript 좁히기이며, `findUnique({ where: { omrJobId: jobId } })`로 찾은 행에서는 도달 불가.
- `docs/recovery/DECISIONS.md` D-018 Decision 3·Directive — "DB에 저장된 job id를 fetch target으로
  사용한다"를 명시. 왕복 제거는 결정 변경이므로 하지 않았다.
- `src/app/api/omr/status/[jobId]/route.ts:187-190` — status 라우트의 대응 단축 경로가 이미
  `processingStatus = 'completed'`를 쓰고 있음을 확인. finalize의 새 동작은 이것과 일치한다.

## Gaps and risks

- 운영 DB에 실제로 어긋난 행(`animationDataUrl` 있음 + `processingStatus != completed`)이 있는지 조회하지
  않았다. 이 PR은 그런 행이 생겼을 때의 동작을 고치는 것이고, 존재 여부는 별개다.
- hosted CodeQL 재분석은 PR checks에서 확인한다. 왕복을 유지했으므로 taint 경계는 변하지 않았다.
- 이슈 #72가 지목한 status 라우트의 409 분기는 주석만 달았고 동작은 그대로다.
