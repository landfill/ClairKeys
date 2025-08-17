"""
ClairKeys OMR Service
FastAPI server for processing PDF sheet music to ClairKeys animation data
"""

import os
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import aiofiles
import asyncio
from datetime import datetime
import uuid
from pathlib import Path
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try different OMR processors in order of preference
try:
    from omr.audiveris_docker import AudiverisDockerProcessor as AudiverisProcessor
    logger.info("Using Audiveris Docker processor")
except ImportError:
    try:
        from omr.audiveris import AudiverisProcessor
        logger.info("Using native Audiveris processor")
    except ImportError:
        logger.warning("Audiveris not available, using alternative OMR")
        from omr.audiveris_alt import AlternativeOMRProcessor as AudiverisProcessor
from omr.converter import MusicXMLToClairKeysConverter
from omr.storage import SupabaseStorage

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
audiveris_processor = AudiverisProcessor()
converter = MusicXMLToClairKeysConverter()
storage = SupabaseStorage()

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
    file: UploadFile = File(...),
    title: Optional[str] = None,
    composer: Optional[str] = None,
    user_id: Optional[str] = None
):
    """
    Process PDF sheet music to ClairKeys animation data
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
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
            "user_id": user_id
        }
    }
    
    # Start background processing
    background_tasks.add_task(process_pdf_background, job_id, file, title, composer, user_id)
    
    return {
        "job_id": job_id,
        "status": ProcessingStatus.PENDING,
        "message": "PDF processing started"
    }

@app.get("/status/{job_id}")
async def get_processing_status(job_id: str):
    """Get processing status for a job"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return processing_jobs[job_id]

async def process_pdf_background(
    job_id: str,
    file: UploadFile,
    title: Optional[str],
    composer: Optional[str], 
    user_id: Optional[str]
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
        
        clairkeys_data = await converter.convert(musicxml_path, title, composer)
        logger.info(f"Converted to ClairKeys format for job {job_id}")
        
        # Step 3: Upload to Supabase Storage
        processing_jobs[job_id]["progress"] = 80
        processing_jobs[job_id]["message"] = "Uploading result to storage"
        
        storage_url = await storage.upload_animation_data(
            job_id, 
            clairkeys_data, 
            title or file.filename,
            user_id
        )
        logger.info(f"Uploaded to storage for job {job_id}: {storage_url}")
        
        # Step 4: Complete
        processing_jobs[job_id]["status"] = ProcessingStatus.COMPLETED
        processing_jobs[job_id]["progress"] = 100
        processing_jobs[job_id]["message"] = "Processing completed successfully"
        processing_jobs[job_id]["result"] = {
            "animation_data_url": storage_url,
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