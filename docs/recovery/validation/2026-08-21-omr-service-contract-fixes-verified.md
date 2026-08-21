# Validation — OMR service contract fixes (PR #38) verified on the VM

Date: 2026-08-21
Commit: `9b85d82` on `codex/p1-omr-service-contract` (PR #38)
Environment: NAVER Cloud Platform VM `vm-naver-20260820145930` (Rocky Linux 8.8, 2 vCPU, 15Gi),
podman 4.4.1, image `clairkeys-omr:contract-fix`. Local test runs on macOS with Python 3.14;
`httpx`, `lxml`, `pydantic`, `starlette` present, `fastapi` and `aiofiles` absent.

The image used for the runtime checks was built with PR #37's `Dockerfile.audiveris` fix. Without
it the image does not build at all, so these two changes cannot be verified independently on a
real host.

## Claim being verified

That the two defects recorded in `2026-08-21-omr-service-first-run-defects.md` are fixed: that
`/process` reads the fields `/api/omr/upload` actually sends, and that a storage failure fails the
job instead of reporting success with an unreachable `file://` URL.

## Regression-first evidence

`omr-service/tests/test_service_contract.py` was written before the fix and failed against the
previous code — the run aborted at import with
`ImportError: cannot import name 'StorageUploadError' from 'omr.storage'`, since neither the error
type nor the guard existed.

After the fix: `python3 -m unittest tests.test_service_contract tests.test_audiveris_runtime` →
**18 tests, OK**.

`app.py` cannot be imported in this environment (no fastapi, no aiofiles), so its request contract
is asserted from its AST: each of `title`, `composer`, `user_id`, and `sheet_music_id` must have a
`Form(...)` call as its default. This mirrors how `test_audiveris_runtime.py` asserts the
Dockerfile's contract from its text. `storage.py` imports only stdlib plus `httpx`, so it is
exercised for real with a mocked transport.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| `python3 -m py_compile app.py omr/storage.py` | PASS | — |
| `python3 -m unittest tests.test_service_contract tests.test_audiveris_runtime` | PASS | 18 tests OK |
| `podman build … -t clairkeys-omr:contract-fix` | PASS | `Successfully tagged localhost/clairkeys-omr:contract-fix` |
| `POST /process` with all four fields as multipart | PASS | `{'filename': 'wtk1-prelude1-a4.pdf', 'title': 'WTK1 Prelude 1', 'composer': 'J.S. Bach', 'user_id': 'test-user', 'sheet_music_id': '42'}` |
| Same job, `ENVIRONMENT=production`, no credentials | PASS (fails as intended) | `"status": "failed"`, `progress` 80, message quotes the guard; `error` field set |
| Fallback file written? | PASS (none) | `/tmp/results` empty inside the container |
| Control: `ENVIRONMENT=development` | PASS | job `completed` with `file:///tmp/results/…json`, so the fallback is isolated, not removed |

Before the fix, the identical production-configured run returned
`"status": "completed"` with `"message": "Processing completed successfully"` and
`animation_data_url` set to a `file://` path.

## Gaps and risks

- **A real Supabase upload is still unverified.** The project's Storage host returned `NXDOMAIN`
  from both this workstation and the VM during this work; the user reported the project was down
  and being restored. Only the failure paths have been exercised against a live service.
- **`omr-service/tests/*.py` is not run by any CI workflow.** No job in `.github/workflows/`
  invokes them, so these tests and PR #37's protect nothing automatically. `converter.py` is
  covered indirectly because `src/utils/__tests__/converterCorpus.test.ts` spawns `omr.cli`, and
  `converter.py` imports only stdlib. Adding a job is a separate decision.
- The guard keys on `ENVIRONMENT`, which `fly.toml` sets and the VM run sets explicitly. An
  operator who forgets it gets the safe behaviour (treated as production), not the permissive one.
- Recognition accuracy remains unmeasured, and no Next.js end-to-end path has been exercised.
- Nothing is deployed or exposed yet: no systemd unit, no nginx, no TLS, no shared secret, and
  `OMR_SERVICE_URL` still defaults to the dead Fly host.
