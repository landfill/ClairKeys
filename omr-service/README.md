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
docker run -p 8000:8000 -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... clairkeys-omr
```

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
   fly secrets set SUPABASE_URL=https://your-project.supabase.co
   fly secrets set SUPABASE_ANON_KEY=your-anon-key
   ```

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
