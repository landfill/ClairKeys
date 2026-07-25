"""
Audiveris OMR Processor
Handles PDF to MusicXML conversion using Audiveris
"""

import asyncio
import logging
from pathlib import Path
from typing import Optional
import os

logger = logging.getLogger(__name__)

class AudiverisProcessor:
    """Processes PDF files using Audiveris OMR engine"""
    
    def __init__(
        self,
        audiveris_executable: Optional[Path] = None,
        max_concurrent_conversions: Optional[int] = None,
    ):
        configured_executable = os.getenv(
            "AUDIVERIS_EXECUTABLE", "/opt/audiveris/bin/Audiveris"
        )
        self.audiveris_executable = Path(
            audiveris_executable or configured_executable
        )
        concurrency = max_concurrent_conversions
        if concurrency is None:
            concurrency = int(os.getenv("AUDIVERIS_MAX_CONCURRENCY", "1"))
        if concurrency < 1:
            raise ValueError("AUDIVERIS_MAX_CONCURRENCY must be at least 1")
        self._conversion_slots = asyncio.Semaphore(concurrency)

    async def process_pdf(self, pdf_path: Path, output_dir: Path) -> Path:
        """
        Process PDF file with Audiveris to generate MusicXML
        
        Args:
            pdf_path: Path to input PDF file
            output_dir: Directory for output files
            
        Returns:
            Path to generated MusicXML file
        """
        async with self._conversion_slots:
            return await self._process_pdf_unlocked(pdf_path, output_dir)

    async def _process_pdf_unlocked(
        self, pdf_path: Path, output_dir: Path
    ) -> Path:
        try:
            logger.info(f"Starting Audiveris processing for {pdf_path}")
            
            if not self.audiveris_executable.is_file() or not os.access(
                self.audiveris_executable, os.X_OK
            ):
                raise FileNotFoundError(
                    f"Audiveris launcher is not executable: {self.audiveris_executable}"
                )

            output_dir.mkdir(parents=True, exist_ok=True)
            
            cmd = [
                str(self.audiveris_executable),
                "-batch",
                "-export",
                "-output", str(output_dir),
                "--",
                str(pdf_path)
            ]
            
            logger.info(f"Running Audiveris command: {' '.join(cmd)}")
            
            # Run Audiveris process
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=output_dir
            )
            
            stdout, stderr = await process.communicate()
            
            # Check if process completed successfully
            if process.returncode != 0:
                error_msg = f"Audiveris failed with return code {process.returncode}"
                if stderr:
                    error_msg += f"\nStderr: {stderr.decode()}"
                if stdout:
                    error_msg += f"\nStdout: {stdout.decode()}"
                logger.error(error_msg)
                raise RuntimeError(error_msg)
            
            output_files = sorted(output_dir.glob("*.mxl"))
            if not output_files:
                output_files = sorted(output_dir.glob("*.xml"))
            if not output_files:
                raise FileNotFoundError("No MusicXML output file generated")
            if len(output_files) > 1:
                raise RuntimeError(
                    "Audiveris generated multiple MusicXML files; "
                    "multi-output scores are not yet supported"
                )

            musicxml_path = output_files[0]
            
            logger.info(f"Successfully generated MusicXML: {musicxml_path}")
            return musicxml_path
            
        except Exception as e:
            logger.error(f"Error in Audiveris processing: {str(e)}")
            raise
    
    async def validate_audiveris_installation(self) -> bool:
        """
        Validate that Audiveris is properly installed and accessible
        
        Returns:
            True if Audiveris is available, False otherwise
        """
        try:
            if not self.audiveris_executable.is_file() or not os.access(
                self.audiveris_executable, os.X_OK
            ):
                logger.error(
                    f"Audiveris launcher is not executable: {self.audiveris_executable}"
                )
                return False
            
            process = await asyncio.create_subprocess_exec(
                str(self.audiveris_executable), "-version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error("Audiveris launcher is not available")
                return False
            
            logger.info("Audiveris installation validated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error validating Audiveris installation: {str(e)}")
            return False
