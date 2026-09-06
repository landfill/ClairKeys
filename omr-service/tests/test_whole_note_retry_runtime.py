import asyncio
import tempfile
from time import monotonic
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch
import xml.etree.ElementTree as ET

from omr.audiveris import AudiverisProcessor
from test_audiveris_runtime import HangingProcess, SuccessfulProcess
from test_whole_note_retry import archive, score, valid_candidate


class WholeNoteRetryRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.pdf = self.directory / 'input.pdf'
        self.pdf.write_bytes(b'%PDF original all pages')
        self.original = self.directory / 'input.xml'
        self.original.write_bytes(ET.tostring(score()))
        source = archive(self.directory, 'source.omr', cautionary=True)
        source.replace(self.directory / 'input.omr')
        self.processor = AudiverisProcessor()

    async def candidate_process(self, *command, **kwargs):
        output = Path(command[command.index('-output') + 1])
        (output / 'input.xml').write_bytes(ET.tostring(valid_candidate()))
        archive(output, 'input.omr', whole_count=8)
        return SuccessfulProcess()

    def run_retry(self, deadline=None):
        return asyncio.run(self.processor._maybe_retry_whole_notes(
            self.original, self.pdf, self.directory,
            deadline if deadline is not None else monotonic() + 5))

    def test_success_uses_only_leland_constant_original_pdf_and_separate_directory(self):
        original_xml = self.original.read_bytes()
        original_graph = (self.directory / 'input.omr').read_bytes()
        with patch('omr.audiveris.asyncio.create_subprocess_exec', side_effect=self.candidate_process) as create:
            result = self.run_retry()
        command = create.call_args.args
        self.assertNotEqual(result, self.original)
        self.assertEqual(self.original.read_bytes(), original_xml)
        self.assertEqual((self.directory / 'input.omr').read_bytes(), original_graph)
        self.assertIn('org.audiveris.omr.ui.symbol.MusicFont.defaultMusicFamily=Leland', command)
        self.assertNotIn('-transcribe', command)
        self.assertEqual(command[-1], str(self.pdf))
        self.assertNotEqual(result.parent, self.directory)

    def test_three_four_and_six_eight_never_spawn_retry(self):
        for meter in ('3', '6'):
            self.original.write_bytes(ET.tostring(score(meter)))
            with self.subTest(meter=meter), patch(
                    'omr.audiveris.asyncio.create_subprocess_exec') as create:
                self.assertEqual(self.run_retry(), self.original)
                create.assert_not_called()

    def test_actual_satie_and_always_return_the_identical_path(self):
        root = Path(__file__).resolve().parents[2] / 'local-test-data/results'
        controls = [
            root / 'satie-2026-09-06/original-diagnostic.mxl',
            root / 'always-with-me-2026-09-06/diagnostic.mxl',
        ]
        if not all(path.is_file() for path in controls):
            self.skipTest('retained local control diagnostics are not present')
        with patch('omr.audiveris.asyncio.create_subprocess_exec') as create:
            for original in controls:
                with self.subTest(score=original.parent.name):
                    result = asyncio.run(self.processor._maybe_retry_whole_notes(
                        original, Path('control.pdf'), original.parent, monotonic() + 5))
                    self.assertIs(result, original)
            create.assert_not_called()

    def test_exhausted_budget_does_not_start_retry(self):
        with patch('omr.audiveris.asyncio.create_subprocess_exec') as create:
            self.assertEqual(self.run_retry(monotonic() - 1), self.original)
            create.assert_not_called()

    def test_rejected_candidate_preserves_original_result(self):
        async def altered(*command, **kwargs):
            output = Path(command[command.index('-output') + 1])
            candidate = valid_candidate()
            candidate.find("part/measure[@number='2']/note/duration").text = '8'
            (output / 'input.xml').write_bytes(ET.tostring(candidate))
            archive(output, 'input.omr', whole_count=8)
            return SuccessfulProcess()
        with patch('omr.audiveris.asyncio.create_subprocess_exec', side_effect=altered):
            self.assertEqual(self.run_retry(), self.original)

    def test_timed_out_retry_is_killed_and_original_survives(self):
        process = HangingProcess()
        with patch('omr.audiveris.asyncio.create_subprocess_exec', new=AsyncMock(return_value=process)):
            self.assertEqual(self.run_retry(monotonic() + .02), self.original)
        self.assertTrue(process.killed)
        self.assertTrue(process.waited)

    def test_cancelled_retry_is_killed_and_propagates(self):
        process = HangingProcess()

        async def run():
            task = asyncio.create_task(self.processor._maybe_retry_whole_notes(
                self.original, self.pdf, self.directory, monotonic() + 5))
            await process.communicate_started.wait()
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task

        with patch('omr.audiveris.asyncio.create_subprocess_exec', new=AsyncMock(return_value=process)):
            asyncio.run(run())
        self.assertTrue(process.killed)
        self.assertTrue(process.waited)


if __name__ == '__main__':
    unittest.main()
