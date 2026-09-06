"""
Audiveris OMR Processor
Handles PDF to MusicXML conversion using Audiveris
"""

import asyncio
import logging
from pathlib import Path
from typing import Optional
import os
import tempfile
from time import monotonic

from omr.converter import MusicXMLToClairKeysConverter
from omr.meter_retry import accept_meter_retry, prepare_meter_retry, retry_is_eligible
from omr.time_numeral import classify_time_numeral
from omr.whole_note_retry import (
    accept_whole_note_retry,
    retry_is_eligible as whole_note_retry_is_eligible,
)
from omr.wedge_retry import (
    accept_wedge_retry,
    detect_wedge_export_loss,
    prepare_wedge_retry,
    recovery_region_constant,
)

logger = logging.getLogger(__name__)

class AudiverisProcessor:
    """Processes PDF files using Audiveris OMR engine"""
    
    def __init__(
        self,
        audiveris_executable: Optional[Path] = None,
        max_concurrent_conversions: Optional[int] = None,
        process_timeout_seconds: Optional[float] = None,
        audiveris_recovery_executable: Optional[Path] = None,
    ):
        configured_executable = os.getenv(
            "AUDIVERIS_EXECUTABLE", "/opt/audiveris/bin/Audiveris"
        )
        self.audiveris_executable = Path(
            audiveris_executable or configured_executable
        )
        self.audiveris_recovery_executable = Path(
            audiveris_recovery_executable or os.getenv(
                'AUDIVERIS_RECOVERY_EXECUTABLE',
                '/opt/clairkeys-audiveris-recovery/bin/Audiveris',
            )
        )
        concurrency = max_concurrent_conversions
        if concurrency is None:
            concurrency = int(os.getenv("AUDIVERIS_MAX_CONCURRENCY", "1"))
        if concurrency < 1:
            raise ValueError("AUDIVERIS_MAX_CONCURRENCY must be at least 1")
        self._conversion_slots = asyncio.Semaphore(concurrency)
        timeout_seconds = process_timeout_seconds
        if timeout_seconds is None:
            timeout_seconds = float(
                os.getenv("AUDIVERIS_TIMEOUT_SECONDS", "900")
            )
        if timeout_seconds <= 0:
            raise ValueError("AUDIVERIS_TIMEOUT_SECONDS must be greater than 0")
        self.process_timeout_seconds = timeout_seconds

    async def _kill_and_wait(
        self,
        process: asyncio.subprocess.Process,
    ) -> None:
        try:
            process.kill()
        except ProcessLookupError:
            pass
        await process.wait()

    async def _communicate_with_timeout(
        self,
        process: asyncio.subprocess.Process,
        timeout_seconds: float,
    ) -> tuple[bytes, bytes]:
        try:
            return await asyncio.wait_for(
                process.communicate(),
                timeout=timeout_seconds,
            )
        except asyncio.TimeoutError:
            await self._kill_and_wait(process)
            raise RuntimeError(
                f"Audiveris timed out after {timeout_seconds:g} seconds"
            ) from None
        except asyncio.CancelledError:
            await self._kill_and_wait(process)
            raise

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
        deadline = monotonic() + self.process_timeout_seconds
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
            
            remaining = deadline - monotonic()
            if remaining <= 0:
                await self._kill_and_wait(process)
                raise RuntimeError(f'Audiveris timed out after {self.process_timeout_seconds:g} seconds')
            stdout, stderr = await self._communicate_with_timeout(process, remaining)
            
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
            meter_result = await self._maybe_retry_meter(
                musicxml_path, pdf_path, output_dir, deadline
            )
            whole_note_result = await self._maybe_retry_whole_notes(
                meter_result, pdf_path, output_dir, deadline
            )
            music_family = 'Leland' if whole_note_result != meter_result else None
            return await self._maybe_retry_wedge(
                whole_note_result, pdf_path, output_dir, deadline, music_family
            )
            
        except Exception as e:
            logger.error(f"Error in Audiveris processing: {str(e)}")
            raise

    async def _maybe_retry_meter(
        self, original: Path, pdf_path: Path, output_dir: Path, deadline: float
    ) -> Path:
        """A failed optional recognition retry must never erase a valid first result.

        Called inside the existing conversion slot. Both JVMs are sequential and
        share the original deadline; normal results keep their original bytes.
        """
        source = output_dir / f'{pdf_path.stem}.omr'
        if not source.is_file() or monotonic() >= deadline:
            return original
        try:
            converter = MusicXMLToClairKeysConverter()
            before = converter._parse_musicxml(original).getroot()
            if not retry_is_eligible(before):
                return original
            retry_dir = Path(tempfile.mkdtemp(prefix='meter-retry-', dir=output_dir))
            target = retry_dir / 'retry.omr'
            jar = self.audiveris_executable.parent.parent / 'lib/app/audiveris.jar'
            evidence = prepare_meter_retry(source, target, lambda table: classify_time_numeral(table, jar))
            if not evidence:
                return original
            remaining = deadline - monotonic()
            if remaining <= 0:
                return original
            logger.info('Retrying internal meter interpretation using two-staff image evidence: %s', evidence)
            process = await asyncio.create_subprocess_exec(
                str(self.audiveris_executable), '-batch', '-transcribe', '-export',
                '-output', str(retry_dir), '--', str(target),
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, cwd=retry_dir,
            )
            remaining = deadline - monotonic()
            if remaining <= 0:
                await self._kill_and_wait(process)
                return original
            await self._communicate_with_timeout(process, remaining)
            if process.returncode != 0:
                logger.warning('Meter retry exited %s; retaining first recognition result', process.returncode)
                return original
            outputs = sorted(retry_dir.glob('*.mxl'))
            if not outputs:
                outputs = sorted(retry_dir.glob('*.xml'))
            if len(outputs) != 1:
                return original
            candidate = converter._parse_musicxml(outputs[0]).getroot()
            if not accept_meter_retry(before, candidate):
                logger.warning('Meter retry failed structure/pitch/rhythm guards; retaining first result')
                return original
            logger.info('Selected image-supported 9/8 reinterpretation; remaining recognition errors may persist')
            return outputs[0]
        except asyncio.CancelledError:
            raise
        except Exception as error:
            # Diagnostics only; PDF/image checkpoints stay inside the existing
            # request temp tree and are removed by the service's normal cleanup.
            logger.warning('Meter retry unavailable (%s); retaining first result', type(error).__name__)
            return original

    async def _maybe_retry_whole_notes(
        self, original: Path, pdf_path: Path, output_dir: Path, deadline: float
    ) -> Path:
        """Retry one guarded 4/4 piano with Leland inside the first deadline.

        This method is called while ``process_pdf`` still owns the conversion
        semaphore.  The original PDF and first XML/OMR stay untouched, and an
        unsupported or rejected candidate simply returns the first result.
        """
        source = output_dir / f'{pdf_path.stem}.omr'
        if monotonic() >= deadline:
            return original

        try:
            converter = MusicXMLToClairKeysConverter()
            before = converter._parse_musicxml(original).getroot()
            if not whole_note_retry_is_eligible(before, source):
                return original
            retry_dir = Path(tempfile.mkdtemp(prefix='whole-note-retry-', dir=output_dir))
            remaining = deadline - monotonic()
            if remaining <= 0:
                return original
            logger.info('Retrying guarded whole-note recognition with the Leland music template')
            process = await asyncio.create_subprocess_exec(
                str(self.audiveris_executable), '-batch', '-export',
                '-constant',
                'org.audiveris.omr.ui.symbol.MusicFont.defaultMusicFamily=Leland',
                '-output', str(retry_dir), '--', str(pdf_path),
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                cwd=retry_dir,
            )
            remaining = deadline - monotonic()
            if remaining <= 0:
                await self._kill_and_wait(process)
                return original
            await self._communicate_with_timeout(process, remaining)
            if process.returncode != 0:
                logger.warning(
                    'Whole-note retry exited %s; retaining first recognition result',
                    process.returncode,
                )
                return original
            outputs = sorted(retry_dir.glob('*.mxl'))
            if not outputs:
                outputs = sorted(retry_dir.glob('*.xml'))
            graphs = sorted(retry_dir.glob('*.omr'))
            if len(outputs) != 1 or len(graphs) != 1:
                return original
            candidate = converter._parse_musicxml(outputs[0]).getroot()
            if monotonic() >= deadline:
                return original
            if not accept_whole_note_retry(before, candidate, graphs[0]):
                logger.warning(
                    'Whole-note retry failed event/metadata/graph guards; retaining first result'
                )
                return original
            if monotonic() >= deadline:
                return original
            logger.info(
                'Selected graph-backed whole-note recovery; other recognition defects may persist'
            )
            return outputs[0]
        except asyncio.CancelledError:
            raise
        except Exception as error:
            logger.warning(
                'Whole-note retry unavailable (%s); retaining first result',
                type(error).__name__,
            )
            return original

    async def _maybe_retry_wedge(
        self, original: Path, pdf_path: Path, output_dir: Path, deadline: float,
        music_family: Optional[str] = None,
    ) -> Path:
        """Retry only a selected result with the D-054 export-loss signature.

        The first result and graph are opened read-only. Both optional JVMs run
        sequentially while ``process_pdf`` owns the existing semaphore and share
        its original deadline. Any ambiguity returns the selected result.
        """
        source = original.with_suffix('.omr')
        if monotonic() >= deadline or not source.is_file():
            return original
        try:
            converter = MusicXMLToClairKeysConverter()
            before = converter._parse_musicxml(original).getroot()
            trigger = detect_wedge_export_loss(before, source)
            if trigger is None:
                return original
            region_constant = recovery_region_constant(source, trigger)
            if region_constant is None:
                return original
            retry_dir = Path(tempfile.mkdtemp(prefix='wedge-retry-', dir=output_dir))
            symbols_dir = retry_dir / 'symbols'
            symbols_dir.mkdir()
            command = [
                str(self.audiveris_recovery_executable), '-batch', '-step', 'SYMBOLS', '-save',
            ]
            if music_family:
                command.extend((
                    '-constant',
                    f'org.audiveris.omr.ui.symbol.MusicFont.defaultMusicFamily={music_family}',
                ))
            command.extend(('-constant', region_constant,
                            '-output', str(symbols_dir), '--', str(pdf_path)))
            remaining = deadline - monotonic()
            if remaining <= 0:
                return original
            logger.info('Running isolated wedge candidate for missing measure %s',
                        trigger.measure_number)
            process = await asyncio.create_subprocess_exec(
                *command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                cwd=symbols_dir,
            )
            remaining = deadline - monotonic()
            if remaining <= 0:
                await self._kill_and_wait(process)
                return original
            await self._communicate_with_timeout(process, remaining)
            if process.returncode != 0:
                logger.warning('Wedge region candidate exited %s; retaining selected result',
                               process.returncode)
                return original
            symbol_graphs = sorted(symbols_dir.glob('*.omr'))
            if len(symbol_graphs) != 1 or monotonic() >= deadline:
                return original
            page_dir = retry_dir / 'page'
            page_dir.mkdir()
            prepared = page_dir / symbol_graphs[0].name
            evidence = prepare_wedge_retry(symbol_graphs[0], source, prepared, trigger)
            if evidence is None:
                return original
            command = [
                str(self.audiveris_executable), '-batch', '-step', 'PAGE', '-save', '-export',
            ]
            if music_family:
                command.extend((
                    '-constant',
                    f'org.audiveris.omr.ui.symbol.MusicFont.defaultMusicFamily={music_family}',
                ))
            command.extend(('-output', str(page_dir), '--', str(prepared)))
            remaining = deadline - monotonic()
            if remaining <= 0:
                return original
            process = await asyncio.create_subprocess_exec(
                *command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                cwd=page_dir,
            )
            remaining = deadline - monotonic()
            if remaining <= 0:
                await self._kill_and_wait(process)
                return original
            await self._communicate_with_timeout(process, remaining)
            if process.returncode != 0:
                logger.warning('Wedge PAGE candidate exited %s; retaining selected result',
                               process.returncode)
                return original
            outputs = sorted(page_dir.glob('*.mxl'))
            if not outputs:
                outputs = sorted(page_dir.glob('*.xml'))
            graphs = sorted(page_dir.glob('*.omr'))
            if len(outputs) != 1 or len(graphs) != 1 or monotonic() >= deadline:
                return original
            candidate = converter._parse_musicxml(outputs[0]).getroot()
            if not accept_wedge_retry(before, candidate, source, graphs[0], evidence):
                logger.warning(
                    'Wedge retry failed source/event/direction/slur guards; retaining selected result'
                )
                return original
            if monotonic() >= deadline:
                return original
            logger.info('Selected native source-backed wedge recovery')
            return outputs[0]
        except asyncio.CancelledError:
            raise
        except Exception as error:
            logger.warning('Wedge retry unavailable (%s); retaining selected result',
                           type(error).__name__)
            return original
    
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
            
            stdout, stderr = await self._communicate_with_timeout(
                process,
                min(self.process_timeout_seconds, 30.0),
            )
            
            if process.returncode != 0:
                logger.error("Audiveris launcher is not available")
                return False
            
            logger.info("Audiveris installation validated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error validating Audiveris installation: {str(e)}")
            return False
