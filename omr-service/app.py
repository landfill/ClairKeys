"""
ClairKeys OMR Service
FastAPI server for processing PDF sheet music to ClairKeys animation data
"""

import os
import uvicorn
from fastapi import Depends, FastAPI, File, Form, Header, Request, UploadFile, HTTPException, BackgroundTasks
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import aiofiles
import asyncio
from datetime import datetime
import math
import uuid
from pathlib import Path
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from omr.audiveris import AudiverisProcessor
from omr.auth import SharedSecretError, verify_shared_secret
from omr.converter import MusicXMLToClairKeysConverter

# Initialize FastAPI app
app = FastAPI(
    title="ClairKeys OMR Service",
    description="Optical Music Recognition service for converting PDF sheet music to ClairKeys animation data",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize processors
#
# D-011: this service holds no storage credentials. It converts a PDF and hands
# the animation JSON back through `GET /result/{job_id}`; the Next.js side
# stores it with the SUPABASE_SERVICE_ROLE_KEY it already has. The powerful key
# stays on Vercel rather than on a public-IP VM, and a service that cannot write
# anywhere cannot quietly write somewhere unreadable.
audiveris_processor = AudiverisProcessor()
converter = MusicXMLToClairKeysConverter()


@app.exception_handler(RequestValidationError)
async def tempo_request_validation_error(
    request: Request,
    error: RequestValidationError,
):
    """Return HTTP 400 when the multipart tempo field is not numeric.

    FastAPI normally returns 422 before `process_pdf` runs when a float form
    field contains text. The upload contract uses 400 for every invalid tempo,
    while unrelated request validation retains FastAPI's normal response.
    """
    if any(error["loc"][-1] == "tempo" for error in error.errors()):
        return JSONResponse(
            status_code=400,
            content={"detail": "Tempo must be a number between 20 and 400 BPM"},
        )
    return await request_validation_exception_handler(request, error)


def require_shared_secret(
    x_clairkeys_token: Optional[str] = Header(default=None),
) -> None:
    """FastAPI dependency guarding every endpoint that costs CPU or reveals work.

    The check itself is in `omr/auth.py` and imports stdlib only, so it stays
    testable in an environment without fastapi.
    """
    try:
        verify_shared_secret(x_clairkeys_token)
    except SharedSecretError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error


# Processing status storage (in production, use Redis or database)
processing_jobs = {}

class ProcessingStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@app.get("/health")
async def health_check():
    """Health check endpoint for Fly.io"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "ClairKeys OMR Service",
        "version": "1.0.0",
        "status": "running"
    }

@app.post("/process")
async def process_pdf(
    background_tasks: BackgroundTasks,
    _: None = Depends(require_shared_secret),
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    composer: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    sheet_music_id: Optional[str] = Form(None),
    tempo: Optional[float] = Form(None),
):
    """
    Process PDF sheet music to ClairKeys animation data

    Every field below `file` must be declared with `Form(...)`. FastAPI binds a
    plain scalar parameter to the query string, and `/api/omr/upload` sends
    these as multipart form fields, so without it they arrive as None and a
    score is stored under its PDF filename.
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    if tempo is not None and (
        not math.isfinite(tempo) or tempo < 20 or tempo > 400
    ):
        raise HTTPException(
            status_code=400,
            detail="Tempo must be a number between 20 and 400 BPM",
        )
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    processing_jobs[job_id] = {
        "status": ProcessingStatus.PENDING,
        "progress": 0,
        "message": "Job queued for processing",
        "created_at": datetime.utcnow().isoformat(),
        "file_info": {
            "filename": file.filename,
            "title": title,
            "composer": composer,
            "user_id": user_id,
            "sheet_music_id": sheet_music_id,
            "tempo": tempo,
        }
    }
    
    # Start background processing
    background_tasks.add_task(process_pdf_background, job_id, file, title, composer, user_id, tempo)
    
    return {
        "job_id": job_id,
        "status": ProcessingStatus.PENDING,
        "message": "PDF processing started"
    }

@app.get("/status/{job_id}")
async def get_processing_status(
    job_id: str,
    _: None = Depends(require_shared_secret),
):
    """Get processing status for a job.

    The animation payload is deliberately absent: this endpoint is polled in a
    loop, and a few hundred notes repeated on every poll is the cost of putting
    it here. `GET /result/{job_id}` returns it once, when the caller is ready to
    store it.
    """
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = processing_jobs[job_id]
    return {key: value for key, value in job.items() if key != "animation_data"}


@app.get("/result/{job_id}")
async def get_processing_result(
    job_id: str,
    _: None = Depends(require_shared_secret),
):
    """Return the converted animation data for a completed job.

    This is the D-011 handoff. The caller stores what it receives; the service
    never writes it anywhere, so there is no path here that can report success
    for a file no browser can fetch.
    """
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = processing_jobs[job_id]

    if job["status"] != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=409,
            detail=f"Job is {job['status']}, not completed",
        )

    animation_data = job.get("animation_data")
    if animation_data is None:
        # A completed job without its payload is a defect, not an empty score.
        raise HTTPException(
            status_code=500,
            detail="Job completed but its animation data is no longer held",
        )

    return {
        "job_id": job_id,
        "animation_data": animation_data,
        "title": job["result"]["title"],
        "composer": job["result"]["composer"],
        "processed_at": job["result"]["processed_at"],
    }

async def process_pdf_background(
    job_id: str,
    file: UploadFile,
    title: Optional[str],
    composer: Optional[str], 
    user_id: Optional[str],
    tempo: Optional[float],
):
    """Background task for processing PDF"""
    try:
        # Update status to processing
        processing_jobs[job_id]["status"] = ProcessingStatus.PROCESSING
        processing_jobs[job_id]["progress"] = 10
        processing_jobs[job_id]["message"] = "Saving uploaded file"
        
        # Create temporary directories using mounted volume
        temp_dir = Path(f"/data/processing/{job_id}")
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Save uploaded file
        pdf_path = temp_dir / f"input.pdf"
        async with aiofiles.open(pdf_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        logger.info(f"Saved PDF for job {job_id}: {pdf_path}")
        
        # Step 1: PDF to MusicXML using Audiveris
        processing_jobs[job_id]["progress"] = 30
        processing_jobs[job_id]["message"] = "Processing PDF with Audiveris OMR"
        
        musicxml_path = await audiveris_processor.process_pdf(pdf_path, temp_dir)
        logger.info(f"Generated MusicXML for job {job_id}: {musicxml_path}")
        
        # Step 2: MusicXML to ClairKeys JSON
        processing_jobs[job_id]["progress"] = 60
        processing_jobs[job_id]["message"] = "Converting to ClairKeys format"
        
        clairkeys_data = await converter.convert(musicxml_path, title, composer, tempo)
        logger.info(f"Converted to ClairKeys format for job {job_id}")
        
        # Step 3: Hold the result for the caller to collect (D-011)
        #
        # There is no upload step here any more. The previous one used
        # SUPABASE_ANON_KEY, which Storage RLS rejects with 403, so this service
        # could never have stored anything; giving it the service-role key
        # instead would put an unrestricted credential on a public-IP VM. The
        # caller collects the payload from `GET /result/{job_id}` and stores it
        # with the key it already holds.
        processing_jobs[job_id]["animation_data"] = clairkeys_data

        processing_jobs[job_id]["status"] = ProcessingStatus.COMPLETED
        processing_jobs[job_id]["progress"] = 100
        processing_jobs[job_id]["message"] = "Processing completed successfully"
        processing_jobs[job_id]["result"] = {
            "title": title or file.filename,
            "composer": composer,
            "processed_at": datetime.utcnow().isoformat()
        }
        
        # Cleanup temporary files
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        logger.info(f"Successfully completed job {job_id}")
        
    except Exception as e:
        logger.error(f"Error processing job {job_id}: {str(e)}")
        processing_jobs[job_id]["status"] = ProcessingStatus.FAILED
        processing_jobs[job_id]["message"] = f"Processing failed: {str(e)}"
        processing_jobs[job_id]["error"] = str(e)
        
        # Cleanup on error
        temp_dir = Path(f"/data/processing/{job_id}")
        if temp_dir.exists():
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=False
    )
