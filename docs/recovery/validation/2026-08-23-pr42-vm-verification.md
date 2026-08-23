# Validation — PR #42 (D-011) exercised against a live OMR service on the NAVER VM

Date: 2026-08-23
Branch verified: `codex/p1-omr-result-handoff` at `dcc946a` (PR #42 head)
Image: `localhost/clairkeys-omr:pr42` (`2304d56eae3d`, 911 MB), built on the VM from
`omr-service/Dockerfile.audiveris` at that commit
Environment: NAVER Cloud Platform VM `vm-naver-20260820145930` (KR-1, Rocky Linux 8.8,
2 vCPU, 15Gi RAM, 94G free), podman 4.4.1

The VM's public IP is deliberately **not** recorded here, for the reason
`2026-08-21-issue-22-naver-vm-omr-runtime-proof.md` already gives.

## Why this ran before the merge-approval request, not after

`omr-service/*.py` is executed by **no CI workflow**, and PR #42's own base is a `codex/*`
branch, so no test workflow has run on it at all. The VM is the only place this code is
exercised. Everything in PR #42's "Not verified" list was a claim; this record converts
three of the four into evidence.

## Method

`/opt/clairkeys` holds three uncommitted modifications (`Dockerfile.audiveris`, `app.py`,
`omr/storage.py`). Before touching anything, each file's working-tree blob was hashed and
compared with `main`:

| File | VM working tree | `main` |
|---|---|---|
| `omr-service/Dockerfile.audiveris` | `a8280937860d…` | `a8280937860d…` |
| `omr-service/app.py` | `e63fd0ba9206…` | `e63fd0ba9206…` |
| `omr-service/omr/storage.py` | `9d8f45650200…` | `9d8f45650200…` |

All three are byte-identical to merged `main` — they are the source of PRs #37/#38 and carry
nothing unmerged. They were still left untouched: the branch was checked out into a **separate
worktree** at `/opt/clairkeys-pr42` via `git worktree add --detach`, and
`git -C /opt/clairkeys status --short` reports the same three modifications afterwards.

The existing `contract-fix` container was left running on `127.0.0.1:8000` throughout, so the
pre-change behaviour stayed available for direct comparison. The new container ran on
`127.0.0.1:8001` with a separate `/data-pr42` mount.

The shared secret was generated on the VM (`openssl rand -hex 32`) into `/root/.pr42-secret`
mode 600 and never printed.

Note on the build: `Dockerfile.audiveris` is unchanged in PR #42, so podman reused cached
layers and the build finished in seconds. The image contents were therefore verified directly
rather than inferred from a successful build.

## Results

### A. The image really carries PR #42's code

| Check | Result |
|---|---|
| `/app/omr/storage.py` | **absent** — PASS |
| `/app/omr/auth.py` | present — PASS |
| `@app.get("/result/{job_id}")` in `/app/app.py` | 1 occurrence — PASS |

### B. Unset `OMR_SHARED_SECRET` fails closed (`ENVIRONMENT=production`)

| Request (no token) | Status |
|---|---|
| `GET /health` | 200 |
| `GET /` | 200 |
| `POST /process` | **503** |
| `GET /status/{id}` | **503** |
| `GET /result/{id}` | **503** |

Body: `OMR_SHARED_SECRET is not configured. The service refuses requests rather than running
unauthenticated.`

### C. The gate, with the secret set

| Request | Status |
|---|---|
| `GET /health`, no token | 200 |
| `POST /process`, no token | **401** |
| `POST /process`, wrong token | **401** |
| `GET /status/{id}`, no token | **401** |
| `GET /result/{id}`, no token | **401** |
| `GET /status/{id}`, correct token, unknown job | 404 |

Side by side, same request, same host, two containers:

```
contract-fix (8000)  POST /process  no token → HTTP 422
pr42         (8001)  POST /process  no token → HTTP 401
```

The 422 is the point: the pre-change service **accepted** the request and only complained
that the multipart fields were missing. 422 → 401 is the observable proof the gate exists.

### D. A job completes with no storage credentials — the D-011 claim

`podman inspect` of the running container matched no `SUPABASE`/`STORAGE_KEY`/`SERVICE_ROLE`
environment variable.

Mutopia Bach WTK1 Prelude 1 (`/data/testpdf/wtk1-prelude1-a4.pdf`, 74,577 bytes), all four
form fields bound (`title`, `composer`, `user_id`, `sheet_music_id=9999`):

```
14:29:44  pending
14:29:49  processing 30%  "Processing PDF with Audiveris OMR"
14:30:34  completed 100%  "Processing completed successfully"
```

47 seconds end to end. **The identical job on the `contract-fix` image failed**, at progress
80, quoting the PR #38 storage guard — recorded in
`2026-08-21-omr-service-first-run-defects.md`. Removing the credential requirement is what
changed the outcome.

### E. `GET /result` returns the payload

```
HTTP 200, 45,580 bytes
top-level:      job_id, animation_data, title, composer, processed_at
animation_data: version, title, composer, tempo, duration, keySignature,
                timeSignature, metadata, notes
notes:          514
version:        1.0
first note:     {"midi": 60, "start": 0.0, "duration": 1.0, "hand": "L",
                 "voice": 5, "staff": 2}
```

514 notes is the same count the `contract-fix` run produced on 2026-08-21, so the conversion
itself is unchanged by this PR — only where the result goes.

`GET /status` on the same completed job returns keys `created_at, file_info, message,
progress, result, status` and **no `animation_data`**, confirming the payload stays off the
polled endpoint.

Nothing was written anywhere: `find /data -type f` inside the container returns **0 files**,
and the container log mentions `file://`, `supabase`, and `storage` zero times.

### F. The 30 s `/result` timeout

Three consecutive fetches of the completed job: **0.0138 s, 0.0136 s, 0.0135 s** for 45,580
bytes. Loopback, so this measures serialisation rather than transfer, but the payload is
45 KB and the budget is 30 s. There is no plausible headroom problem for a score this size.

### G. Payload lifetime across a restart — previously untested, and it does **not** behave
as PR #42's review log claims

```
before restart:  GET /result/{job} → 200
podman restart omr-pr42
after restart:   GET /result/{job} → 404  {"detail":"Job not found"}
                 GET /status/{job} → 404
```

The in-memory payload is lost, as expected. What does not hold is the review log's reading of
the consequence:

> "a restart between completion and collection fails the row, which is correct but untested"

It does not fail the row. `/status` returns **404**, and
`src/app/api/omr/status/[jobId]/route.ts:88-93` treats every non-ok status the same way:

```ts
if (!statusResponse.ok) {
  console.error('OMR service status error:', statusResponse.status, await statusResponse.text())
  return NextResponse.json(
    { error: '처리 상태를 가져오지 못했습니다.', code: 'OMR_SERVICE_ERROR' },
    { status: 502 }
  )
}
```

No database write happens on that path. The row keeps `status = processing` and its
`omrJobId`, and every subsequent poll takes the identical route and returns the identical
502. The row can never be moved again.

This is the same failure shape PR #41 exists to remove — a row stranded at `processing` that
no later poll can advance — reached by a different door. It is **not a regression introduced
by PR #42**: the pre-change service also held job state in memory and also 404'd after a
restart. What PR #42 changes is only that the review log asserts it is handled.

The service currently has **no systemd unit**, so any VM reboot does this to every in-flight
job at once.

The distinction the route does not draw is between "unreachable, try again later" (the
`catch` branch above it, which deliberately leaves the stored status alone) and "the service
answered, and this job is permanently gone". A 404 from `/status` is the second, and only the
second is safe to mark failed.

## What this record does not establish

- The Next.js half of D-011 — `/api/omr/status/[jobId]` fetching `/result` and storing it
  with `SUPABASE_SERVICE_ROLE_KEY` — has still only been exercised by Jest against mocks. No
  real Supabase upload has run.
- No end-to-end path from the browser has run, because the service is not reachable from
  Vercel (see the HANDOFF entry for 2026-08-23 on the missing exposure step).
- Recognition accuracy is untouched by this record, as always: 514 notes is a count, not a
  correctness claim.
- `omr-service/tests/*.py` still runs in no CI workflow. This validation is a manual run and
  protects nothing automatically.

## Reproduction

Scripts used are session-local. The sequence is:

```bash
git -C /opt/clairkeys fetch origin codex/p1-omr-result-handoff
git -C /opt/clairkeys worktree add --detach /opt/clairkeys-pr42 FETCH_HEAD
cd /opt/clairkeys-pr42/omr-service
podman build -f Dockerfile.audiveris -t clairkeys-omr:pr42 .

podman run -d --name omr-pr42 -p 127.0.0.1:8001:8000 \
  -e ENVIRONMENT=production \
  -e OMR_SHARED_SECRET="$(cat /root/.pr42-secret)" \
  -e AUDIVERIS_MAX_CONCURRENCY=1 \
  -v /data-pr42:/data \
  clairkeys-omr:pr42

curl -s -X POST http://127.0.0.1:8001/process \
  -H "X-ClairKeys-Token: $(cat /root/.pr42-secret)" \
  -F "file=@/data/testpdf/wtk1-prelude1-a4.pdf" \
  -F "title=WTK1 Prelude 1" -F "composer=J.S. Bach" \
  -F "user_id=verify-pr42" -F "sheet_music_id=9999"
```

The `omr-pr42` container was left running on `127.0.0.1:8001` (loopback only, not reachable
from outside the VM) so the next session can re-drive it without a rebuild. `/root/.pr42-secret`
holds the secret it runs with.
