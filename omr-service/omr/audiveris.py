"""
Audiveris OMR Processor
Handles PDF to MusicXML conversion using Audiveris
"""

import asyncio
import subprocess
import logging
from pathlib import Path
from typing import Optional
import os

logger = logging.getLogger(__name__)

class AudiverisProcessor:
    """Processes PDF files using Audiveris OMR engine"""
    
    def __init__(self):
        self.audiveris_home = os.getenv("AUDIVERIS_HOME", "/opt/audiveris")
        self.java_home = os.getenv("JAVA_HOME", "/usr/lib/jvm/java-11-openjdk-amd64")
        
    async def process_pdf(self, pdf_path: Path, output_dir: Path) -> Path:
        """
        Process PDF file with Audiveris to generate MusicXML
        
        Args:
            pdf_path: Path to input PDF file
            output_dir: Directory for output files
            
        Returns:
            Path to generated MusicXML file
        """
        try:
            logger.info(f"Starting Audiveris processing for {pdf_path}")
            
            # Prepare output path
            musicxml_path = output_dir / "output.xml"
            
            # Build Audiveris command
            # Audiveris CLI: java -jar audiveris.jar -batch -export -output output.xml input.pdf
            audiveris_jar = Path(self.audiveris_home) / "lib" / "audiveris.jar"
            
            if not audiveris_jar.exists():
                # Try alternative path structure
                audiveris_jar = Path(self.audiveris_home) / "audiveris.jar"
            
            if not audiveris_jar.exists():
                raise FileNotFoundError(f"Audiveris JAR not found at {audiveris_jar}")
            
            cmd = [
                "java",
                "-Xmx400m",  # Limit memory to 400MB (keeping some buffer for 512MB container)
                "-jar", str(audiveris_jar),
                "-batch",
                "-export",
                "-output", str(musicxml_path),
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
            
            # Verify output file exists
            if not musicxml_path.exists():
                # Sometimes Audiveris creates files with different names
                # Look for any .xml files in the output directory
                xml_files = list(output_dir.glob("*.xml"))
                if xml_files:
                    musicxml_path = xml_files[0]
                    logger.info(f"Found MusicXML file: {musicxml_path}")
                else:
                    raise FileNotFoundError("No MusicXML output file generated")
            
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
            audiveris_jar = Path(self.audiveris_home) / "lib" / "audiveris.jar"
            if not audiveris_jar.exists():
                audiveris_jar = Path(self.audiveris_home) / "audiveris.jar"
            
            if not audiveris_jar.exists():
                logger.error(f"Audiveris JAR not found at {audiveris_jar}")
                return False
            
            # Test Java availability
            process = await asyncio.create_subprocess_exec(
                "java", "-version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error("Java not available")
                return False
            
            logger.info("Audiveris installation validated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error validating Audiveris installation: {str(e)}")
            return False