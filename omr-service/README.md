# ClairKeys OMR Service

Optical Music Recognition service for converting PDF sheet music to ClairKeys animation data.

## Features

- PDF to MusicXML conversion using Audiveris
- MusicXML to ClairKeys animation data format conversion
- Supabase Storage integration
- Asynchronous processing with status tracking
- Docker containerization for Fly.io deployment

## Development Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
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
`docs/recovery/DECISIONS.md`. The Fly.io section below is historical: `fly.toml`
was written but never deployed.

## Fly.io Deployment

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login and Initialize**
   ```bash
   fly auth login
   fly apps create clairkeys-omr
   ```

3. **Set Environment Variables**
   ```bash
   fly secrets set OMR_SHARED_SECRET=$(openssl rand -hex 32)
   ```

   No Supabase credentials are set here — see D-011 above.

4. **Deploy**
   ```bash
   fly deploy
   ```

## API Endpoints

### `POST /process`
Process PDF sheet music to ClairKeys animation data.

**Request:**
- `file`: PDF file (multipart/form-data)
- `title`: Optional title
- `composer`: Optional composer
- `user_id`: Optional user ID

**Response:**
```json
{
  "job_id": "uuid",
  "status": "pending",
  "message": "PDF processing started"
}
```

### `GET /status/{job_id}`
Get processing status for a job.

**Response:**
```json
{
  "status": "completed",
  "progress": 100,
  "message": "Processing completed successfully",
  "result": {
    "animation_data_url": "https://...",
    "title": "Moonlight Sonata",
    "composer": "Beethoven"
  }
}
```

### `GET /health`
Health check endpoint.

## Memory Configuration

The current Fly configuration is a provisional safe starting point:

- Audiveris maximum Java heap: 3GB
- Container memory: 4GB
- Native Audiveris conversions per service instance: 1
- Audiveris conversion timeout: 15 minutes
- Remaining memory is reserved for Python, native OCR libraries, and the OS

These values have not yet been validated with a real container conversion or
Fly deployment. Measure representative PDFs before reducing the headroom.

## Error Handling

- Processing failures are tracked in job status
- Automatic cleanup of temporary files
- Missing or failed Audiveris execution remains an explicit failed job; it
  never falls back to demo MusicXML
- Fallback to local storage if Supabase is unavailable
- Comprehensive logging for debugging
