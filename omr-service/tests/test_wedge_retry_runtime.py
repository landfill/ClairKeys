import asyncio
from pathlib import Path
import tempfile
from time import monotonic
import unittest
from unittest.mock import AsyncMock, patch
import xml.etree.ElementTree as ET

from omr.audiveris import AudiverisProcessor
from test_audiveris_runtime import HangingProcess, SuccessfulProcess
from test_wedge_retry import archive, candidate_sheet, fixture_sheet, score


class WedgeRetryRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.pdf = self.directory / 'input.pdf'
        self.pdf.write_bytes(b'%PDF source')
        self.original = self.directory / 'input.xml'
        self.original.write_bytes(ET.tostring(score()))
        archive(self.directory, 'input.omr', fixture_sheet('selected-sheet.xml'))
        self.processor = AudiverisProcessor()

    def run_retry(self, deadline=None, family='Leland'):
        return asyncio.run(self.processor._maybe_retry_wedge(
            self.original, self.pdf, self.directory,
            deadline if deadline is not None else monotonic() + 5,
            family,
        ))

    async def native_candidate(self, *command, **kwargs):
        output = Path(command[command.index('-output') + 1])
        step = command[command.index('-step') + 1]
        if step == 'SYMBOLS':
            archive(output, 'input.omr', fixture_sheet('symbols-sheet.xml'), symbols=True)
        else:
            (output / 'input.xml').write_bytes(ET.tostring(score(include_target=True)))
            archive(output, 'input.omr', candidate_sheet())
        return SuccessfulProcess()

    def test_success_runs_scoped_symbols_then_stock_page(self):
        original_xml = self.original.read_bytes()
        original_graph = self.original.with_suffix('.omr').read_bytes()
        with patch('omr.audiveris.asyncio.create_subprocess_exec',
                   side_effect=self.native_candidate) as create:
            result = self.run_retry()
        self.assertNotEqual(result, self.original)
        self.assertEqual(self.original.read_bytes(), original_xml)
        self.assertEqual(self.original.with_suffix('.omr').read_bytes(), original_graph)
        self.assertEqual(create.call_count, 2)
        symbols, page = (call.args for call in create.call_args_list)
        self.assertEqual(symbols[0], str(self.processor.audiveris_recovery_executable))
        self.assertIn('org.audiveris.omr.ui.symbol.MusicFont.defaultMusicFamily=Leland', symbols)
        self.assertTrue(any(
            arg.startswith('org.audiveris.omr.sheet.ledger.LedgersPostAnalysis.recoveryRegions=')
            for arg in symbols))
        self.assertFalse(any('LedgersBuilder.maxThicknessHigh=' in arg for arg in symbols))
        self.assertFalse(any('LedgersBuilder.maxThicknessHigh=' in arg for arg in page))
        self.assertEqual(page[0], str(self.processor.audiveris_executable))
        self.assertEqual(symbols[-1], str(self.pdf))
        self.assertTrue(str(result.parent).startswith(str(self.directory / 'wedge-retry-')))

    def test_complete_export_and_multiple_gap_controls_never_spawn(self):
        cases = [score(include_target=True), score()]
        cases[1].find('part').remove(cases[1].find("part/measure[@number='3']"))
        for index, root in enumerate(cases):
            self.original.write_bytes(ET.tostring(root))
            with self.subTest(index=index), patch(
                    'omr.audiveris.asyncio.create_subprocess_exec') as create:
                self.assertEqual(self.run_retry(), self.original)
                create.assert_not_called()

    def test_rejected_native_candidate_preserves_selected_result(self):
        async def changed_direction(*command, **kwargs):
            output = Path(command[command.index('-output') + 1])
            step = command[command.index('-step') + 1]
            if step == 'SYMBOLS':
                archive(output, 'input.omr', fixture_sheet('symbols-sheet.xml'), symbols=True)
            else:
                candidate = score(include_target=True)
                direction = ET.SubElement(candidate.find("part/measure[@number='1']"), 'direction')
                ET.SubElement(ET.SubElement(direction, 'direction-type'), 'words').text = 'changed'
                (output / 'input.xml').write_bytes(ET.tostring(candidate))
                archive(output, 'input.omr', candidate_sheet())
            return SuccessfulProcess()

        with patch('omr.audiveris.asyncio.create_subprocess_exec', side_effect=changed_direction):
            self.assertEqual(self.run_retry(), self.original)

    def test_exhausted_budget_does_not_spawn(self):
        with patch('omr.audiveris.asyncio.create_subprocess_exec') as create:
            self.assertEqual(self.run_retry(monotonic() - 1), self.original)
            create.assert_not_called()

    def test_timeout_kills_candidate_and_preserves_selected_result(self):
        process = HangingProcess()
        with patch('omr.audiveris.asyncio.create_subprocess_exec',
                   new=AsyncMock(return_value=process)):
            self.assertEqual(self.run_retry(monotonic() + .02), self.original)
        self.assertTrue(process.killed)
        self.assertTrue(process.waited)

    def test_expiration_during_acceptance_keeps_selected_result(self):
        expired = False

        def clock():
            return 2 if expired else 0

        def accept(*args):
            nonlocal expired
            expired = True
            return True

        with patch('omr.audiveris.asyncio.create_subprocess_exec',
                   side_effect=self.native_candidate), patch(
                       'omr.audiveris.accept_wedge_retry', side_effect=accept), patch(
                       'omr.audiveris.monotonic', side_effect=clock):
            self.assertEqual(self.run_retry(deadline=1), self.original)

    def test_page_stage_cancellation_kills_candidate_and_propagates(self):
        page_process = HangingProcess()
        calls = 0

        async def processes(*command, **kwargs):
            nonlocal calls
            calls += 1
            output = Path(command[command.index('-output') + 1])
            if calls == 1:
                archive(output, 'input.omr', fixture_sheet('symbols-sheet.xml'), symbols=True)
                return SuccessfulProcess()
            return page_process

        async def run():
            task = asyncio.create_task(self.processor._maybe_retry_wedge(
                self.original, self.pdf, self.directory, monotonic() + 5, 'Leland'))
            await page_process.communicate_started.wait()
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task

        with patch('omr.audiveris.asyncio.create_subprocess_exec', side_effect=processes):
            asyncio.run(run())
        self.assertEqual(calls, 2)
        self.assertTrue(page_process.killed)
        self.assertTrue(page_process.waited)

    def test_cancellation_kills_candidate_and_propagates(self):
        process = HangingProcess()

        async def run():
            task = asyncio.create_task(self.processor._maybe_retry_wedge(
                self.original, self.pdf, self.directory, monotonic() + 5, 'Leland'))
            await process.communicate_started.wait()
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task

        with patch('omr.audiveris.asyncio.create_subprocess_exec',
                   new=AsyncMock(return_value=process)):
            asyncio.run(run())
        self.assertTrue(process.killed)
        self.assertTrue(process.waited)


if __name__ == '__main__':
    unittest.main()
