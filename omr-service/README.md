# ClairKeys OMR Service

Optical Music Recognition service for converting PDF sheet music to ClairKeys animation data.

## Features

- PDF to MusicXML conversion using Audiveris
- MusicXML to ClairKeys animation data format conversion
- Returns the converted animation data to its caller; it holds no storage credential (D-011)
- Asynchronous processing with status tracking
- Container image; deployed on a NAVER Cloud VM with podman (see `deploy/`)

## Development Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # ENVIRONMENT=development runs without a shared secret.
   # No Supabase credentials belong here — see D-011.
   ```

3. **Install Audiveris**
   - Install the official Audiveris 5.11.0 package for your OS.
   - The Ubuntu package installs its bundled JRE and launcher at
     `/opt/audiveris/bin/Audiveris`; override that path with
     `AUDIVERIS_EXECUTABLE` when developing elsewhere.
   - Install the required Tesseract language data separately. The container
     supplies English and points `TESSDATA_PREFIX` at its trained-data folder.

4. **Run Development Server**
   ```bash
   python app.py
   ```

## Docker Build

```bash
docker build -f Dockerfile.audiveris -t clairkeys-omr .
docker run -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e OMR_SHARED_SECRET=... \
  clairkeys-omr
```

The service takes **no storage credentials** (D-011). It converts a PDF and
returns the animation JSON from `GET /result/{job_id}`; the Next.js side stores
it with `SUPABASE_SERVICE_ROLE_KEY`, so that key never reaches this host.

`OMR_SHARED_SECRET` is mandatory outside `ENVIRONMENT=development`: every
request must carry it as `X-ClairKeys-Token`, and an unset secret makes the
service refuse everything rather than run unauthenticated. `/health` stays open
for uptime checks, and so does `GET /` — corrected 2026-08-23, having been
described here as the only open endpoint. `/` returns the service name, a
version, and `"status": "running"`, so it discloses only that something is
listening on a port the caller already reached; whatever fronts the service in
production should still not proxy it.

Everything that costs CPU or reveals work — `/process`, `/status`, `/result` —
requires the token.

## Deployment

`deploy/` holds the systemd unit and the procedure actually applied to the NAVER
Cloud VM, including why the secret lives in a 600 env file rather than in the
unit. The exposure decision it implements — plain HTTP without TLS, for the test
phase only, and the condition for ending that — is **D-012** in
`docs/recovery/DECISIONS.md`. This is the repository's only active OMR
deployment procedure. Earlier hosting experiments are retained only in dated
recovery records and must not be used as deployment instructions.

## API Endpoints

Every endpoint except `/health` and `/` requires `X-ClairKeys-Token`. Without it
the service answers **401**, and if `OMR_SHARED_SECRET` is unset it answers
**503** to everything — it refuses rather than running open.

### `POST /process`
Process PDF sheet music to ClairKeys animation data.

**Request** (multipart/form-data):
- `file`: PDF file
- `title`: Optional title
- `composer`: Optional composer
- `user_id`: Optional user ID
- `sheet_music_id`: Optional; echoed back in `/status` as `file_info` so an
  operator can correlate a job with a database row

**Response:**
```json
{
  "job_id": "uuid",
  "status": "pending",
  "message": "PDF processing started"
}
```

### `GET /status/{job_id}`
Get processing status for a job. Polled in a loop, so it deliberately carries no
animation data — collect that from `/result` once, when `status` is `completed`.

**Response:**
```json
{
  "status": "completed",
  "progress": 100,
  "message": "Processing completed successfully",
  "file_info": { "filename": "...", "title": "...", "sheet_music_id": "..." },
  "result": {
    "title": "Moonlight Sonata",
    "composer": "Beethoven",
    "processed_at": "2026-08-23T05:30:31.862473"
  }
}
```

There is no `animation_data_url`. The service stores nothing and has no
credential to store it with (D-011); this example advertised that field until
2026-08-23, after the code had stopped returning it.

`404` here means the job is gone rather than still running — job state is held in
memory, so a restart drops every in-flight job. Callers must treat that as
terminal; the Next.js route does, and fails the row (PR #41).

### `GET /result/{job_id}`
Collect the converted animation data for a completed job. The caller stores what
it receives.

**Response:**
```json
{
  "job_id": "uuid",
  "animation_data": { "version": "1.0", "notes": [], "tempo": 0, "duration": 0 },
  "title": "...",
  "composer": "...",
  "processed_at": "..."
}
```

`409` if the job has not completed, `404` if it is unknown or was dropped.

### `GET /health`
Health check endpoint. Open — no token required.

### `GET /`
Service name, version, and `"status": "running"`. Also open; a proxy in front of
this service should not expose it.

## Memory Configuration

- Audiveris maximum Java heap: 3GB
- Native Audiveris conversions per service instance: 1
- Audiveris conversion timeout: 15 minutes
- Remaining memory is reserved for Python, native OCR libraries, and the OS

The service runs on a VM with **15GiB**, so the concurrency limit of 1 is
conservative rather than necessary — but nothing has re-measured it, and a
limit that has never caused a problem is a poor thing to raise on a guess.

They are no longer unvalidated. Real conversions have run in this container on
the VM since 2026-08-21: the Bach WTK1 Prelude 1 fixture completes in roughly 45
seconds and yields 514 notes. Measure representative PDFs before reducing the
headroom.

## Error Handling

- Processing failures are tracked in job status
- Automatic cleanup of temporary files
- Missing or failed Audiveris execution remains an explicit failed job; it
  never falls back to demo MusicXML
- No storage fallback in production. A development-only local path survives behind a guard
  that fails closed (PR #38); a production job fails rather than reporting success for a file
  nothing can fetch
- Comprehensive logging for debugging
