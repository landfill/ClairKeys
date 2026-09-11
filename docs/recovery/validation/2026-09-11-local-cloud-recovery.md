# Local recovery after cloud setup failures

Date: 2026-09-11
PR151 head: 8f1d7fe41aaa240c0cc4ad472c0f6445e157f353
Worktree: /Users/h0977/dev/ClairKeys/.worktrees/callback-review

## Cloud boundary

Both 2026-09-11 retries failed with environment setup exit124. Expanded #146 logs show
7 upgraded/284 newly installed packages and154MB from archive.ubuntu.com, ending around26%.
Saved v4 wraps playwright install --with-deps in timeout300s. Candidate v5 separates system
packages900s and binaries240s; interactive test reached package149 but remained slow and was
cancelled. Candidate was NOT saved. Reload confirmed saved v4 unchanged. This is cancellation,
not evidence that v5 timed out. No agent-phase code ran in either failed retry.

## Regression and repair

- Fresh Python3.12 venv: unittest discovery for callback suite failed importing uvicorn.
- Installed the pinned dependencies now in omr-service/requirements-ci.txt in isolated .venv-review.
- Added regression cases before implementation: 11 tests ran with five failure instances:
  callback/config port0, callback/config empty port, and real HTTPX query logging.
- After repair, focused 11 tests pass. HTTP requests use MockTransport and fake credentials only.
- Requirements cover actual FastAPI app imports in all three Jest CI workflows.

## Commands and results

- In worktree: `.venv-review/bin/python -m unittest discover -s omr-service/tests -p test_callback_delivery.py`: 11 passed.
- Initial full discovery from worktree root failed with an omr import error. This command was wrong
  for the suite; no baseline claim was made.
- In omr-service: `../.venv-review/bin/python -m unittest discover -s tests -p 'test_*.py'`:
  160 tests, OK with6 skips (private source/native fixture availability).
- In worktree: `PYTHON_BIN=/Users/h0977/dev/ClairKeys/.worktrees/callback-review/.venv-review/bin/python npm test -- --runInBand`:
  103 suites,997 tests passed.
- `npx tsc --noEmit`: exit0; `npm run lint`: no warnings/errors.
- `DATABASE_URL=postgresql://test:test@localhost:5432/clairkeys_test NEXTAUTH_URL=http://localhost:3000 NEXTAUTH_SECRET=local-review-only npm run build </dev/null`: exit0.
  Build skips types/lint internally; those ran separately above. No production secrets supplied.
- `git diff --check`: pass. Both previously conflicting status records match origin/main.
- Push to existing PR151 branch succeeded. Hosted CI/review is not yet complete.

No VM rollout, production callback or OMR engine conversion was performed. No user-owned
uncommitted changes were included. node_modules reused via a symlink; Python environment isolated.
