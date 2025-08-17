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
   - Download Audiveris 5.3.1 from GitHub releases
   - Extract to `/opt/audiveris` or set `AUDIVERIS_HOME` environment variable

4. **Run Development Server**
   ```bash
   python app.py
   ```

## Docker Build

```bash
docker build -t clairkeys-omr .
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

The service is configured for Fly.io's shared-cpu-1x@512MB specification:
- Java heap size limited to 400MB
- Container memory: 512MB
- Suitable for most sheet music processing tasks

## Error Handling

- Processing failures are tracked in job status
- Automatic cleanup of temporary files
- Fallback to local storage if Supabase is unavailable
- Comprehensive logging for debugging