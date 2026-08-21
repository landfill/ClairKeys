# Validation — OMR service first run, and two defects it exposed

Date: 2026-08-21
Commit: `72b4bdb` (`main`); image built from `codex/p1-omr-naver-vm-runtime` at `8045eb0`
Environment: NAVER Cloud Platform VM `vm-naver-20260820145930` (KR-1, Rocky Linux 8.8, 2 vCPU,
15Gi RAM), podman 4.4.1, container `clairkeys-omr` from image `clairkeys-omr:5.11.0` bound to
`127.0.0.1:8000` with `/data` mounted from the host. No Supabase credentials configured.

## Claim being verified

That the FastAPI service in `omr-service/app.py` starts, serves its endpoints, and processes a real
PDF end to end through `POST /process` — the step
`2026-08-21-issue-22-naver-vm-omr-runtime-proof.md` explicitly listed as untested.

It does. **In doing so it exposed two defects, both of which report success for work that did not
happen.** Neither is caused by the container or by this deployment; both are in code that has been
on `main` throughout.

## Commands and results

| Command | Result | Evidence |
|---|---|---|
| `podman run -d … clairkeys-omr:5.11.0` | PASS | `Up`, `127.0.0.1:8000->8000/tcp`, `Uvicorn running on http://0.0.0.0:8000` |
| `GET /health` | PASS | `{"status":"healthy","timestamp":"2026-08-21T07:56:29…"}` HTTP 200 |
| `GET /` | PASS | `{"service":"ClairKeys OMR Service","version":"1.0.0","status":"running"}` HTTP 200 |
| `GET /status/nonexistent` | PASS | `{"detail":"Job not found"}` HTTP 404 |
| `POST /process` with a real 2-page PDF | PASS | job accepted, `progress` 30 → 100 in ~25 s wall clock |
| Host mount used for job scratch | PASS | `Saved PDF … /data/processing/<job_id>/input.pdf` |
| Audiveris invoked by the service | PASS | `/opt/audiveris/bin/Audiveris -batch -export -output /data/processing/<job_id> -- …/input.pdf` |
| Job state survives a restart | **FAIL (known)** | after `podman kill -s SIGKILL` + `start`, the completed job returns HTTP 404 while its JSON still sits in the container layer |

## Defect 1 — `/process` silently ignores every form field except the file

`app.py:71-78` declares the metadata as plain function parameters:

```python
async def process_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = None,
    composer: Optional[str] = None,
    user_id: Optional[str] = None
):
```

FastAPI binds a non-Pydantic scalar parameter to a **query** parameter unless it is declared
`Form(...)`. `file` is annotated `File(...)`, so it binds; the other three do not.

Measured, same PDF, same service:

| How the fields were sent | `file_info` returned |
|---|---|
| multipart form fields | `{'title': None, 'composer': None, 'user_id': None}` |
| query string | `{'title': 'QueryTitle', 'composer': 'QueryComposer', 'user_id': 'query-user'}` |

`src/app/api/omr/upload/route.ts:77-82` sends all of them as `FormData`, so **every one is
dropped**. The consequences are silent, not loud:

- `app.py:167` falls back to `title or file.filename`, so a score is stored under its **PDF
  filename** rather than the title the user typed.
- `composer` and `user_id` reach the OMR service as `None`.
- `sheet_music_id`, which `route.ts:82` also sends, is **not declared in `app.py` at all**, so
  there is no way for a result to be correlated back to its `SheetMusic` row from inside the
  service.

## Defect 2 — a failed upload is reported as a completed job

`omr/storage.py` routes to `_save_local_fallback` from three places: missing credentials
(`storage.py:47-49`), a non-2xx upload response (`storage.py:76-78`), and **any exception**
(`storage.py:86-88`). The fallback writes to `/tmp/results` inside the container and returns a
`file://` URL. Its own comment concedes the point: "this would need to be served by a static file
server in production".

Observed on this run, with no credentials configured:

```json
{
  "status": "completed",
  "progress": 100,
  "message": "Processing completed successfully",
  "result": {
    "animation_data_url": "file:///tmp/results/20260821_075731_0f79b0a3-….json"
  }
}
```

`src/app/api/omr/status/[jobId]/route.ts` is what consumes this, and `animationDataUrl` is what a
browser is later asked to fetch. A `file://` path inside an ephemeral container resolves to nothing
for any client. The failure surfaces later, as an unplayable score, rather than at the point it
occurred.

This is the shape of concealment D-001 and D-010 were written against, and it is listed verbatim
in `AGENTS.md` § "금지되는 완료 상태". The fallback is not a container artifact: an unreachable
Supabase, a revoked key, or a 500 from storage would take the same path **in production, with
credentials correctly configured.**

## Gaps and risks

- **Neither defect has a fix yet.** Both are code changes and therefore need a branch and PR;
  neither belongs in PR #37, whose scope is the image.
- **Supabase upload is still unverified.** No credentials are configured on the VM, so only the
  fallback path has ever run. Verifying the real path needs `SUPABASE_URL` and
  `SUPABASE_ANON_KEY`.
- **Do not expose the service before Defect 2 is fixed.** Deploying as-is means a user's upload
  reports success and produces an unplayable score — worse than the current honest failure, which
  P1-A deliberately created.
- Job state is an in-memory dict (`app.py:49`), now demonstrated: a completed job returned 404
  after a container restart while its result file remained on disk. `AGENTS.md` forbids describing
  this queue as persistent.
- `/tmp/results` is in the container's writable layer, not the `/data` mount, so fallback output is
  lost when the container is recreated.
- Recognition accuracy remains unmeasured; nothing here changes that.
