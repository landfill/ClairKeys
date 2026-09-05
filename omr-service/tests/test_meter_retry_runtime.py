import asyncio
import tempfile
from time import monotonic
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch
import xml.etree.ElementTree as ET

from omr.audiveris import AudiverisProcessor
from test_audiveris_runtime import HangingProcess, SuccessfulProcess
from test_meter_retry import mxl_root


class MeterRetryRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.pdf = self.directory / 'input.pdf'
        self.original = self.directory / 'input.xml'
        self.original.write_bytes(ET.tostring(mxl_root()))
        (self.directory / 'input.omr').write_bytes(b'original graph')
        self.processor = AudiverisProcessor()

    def prepare(self, source, target, classify):
        target.write_bytes(b'copied graph')
        return [{'staff': '1', 'nine': .72, 'margin': .1}, {'staff': '2', 'nine': .73, 'margin': .1}]

    async def candidate_process(self, *command, **kwargs):
        output = Path(command[command.index('-output') + 1])
        (output / 'retry.xml').write_bytes(ET.tostring(mxl_root('9')))
        return SuccessfulProcess()

    def run_retry(self, deadline=None):
        return asyncio.run(self.processor._maybe_retry_meter(
            self.original, self.pdf, self.directory, deadline if deadline is not None else monotonic() + 5))

    def test_success_returns_separate_candidate_and_preserves_original(self):
        original = self.original.read_bytes()
        with patch('omr.audiveris.prepare_meter_retry', side_effect=self.prepare), patch(
                'omr.audiveris.asyncio.create_subprocess_exec', side_effect=self.candidate_process) as create:
            result = self.run_retry()
        self.assertNotEqual(result, self.original)
        self.assertEqual(self.original.read_bytes(), original)
        self.assertEqual((self.directory / 'input.omr').read_bytes(), b'original graph')
        self.assertIn('-transcribe', create.call_args.args)

    def test_normal_score_is_not_reclassified_or_restarted(self):
        self.original.write_bytes(ET.tostring(mxl_root(durations=(3, 3, 3))))
        with patch('omr.audiveris.prepare_meter_retry') as prepare, patch(
                'omr.audiveris.asyncio.create_subprocess_exec') as create:
            self.assertEqual(self.run_retry(), self.original)
        prepare.assert_not_called()
        create.assert_not_called()

    def test_ambiguous_graph_or_classifier_failure_preserves_result(self):
        for error in (None, ValueError('unknown graph')):
            with self.subTest(error=error), patch('omr.audiveris.prepare_meter_retry',
                                                return_value=None, side_effect=error), patch(
                    'omr.audiveris.asyncio.create_subprocess_exec') as create:
                self.assertEqual(self.run_retry(), self.original)
                create.assert_not_called()

    def test_exhausted_budget_does_not_start_retry(self):
        with patch('omr.audiveris.asyncio.create_subprocess_exec') as create:
            self.assertEqual(self.run_retry(monotonic() - 1), self.original)
            create.assert_not_called()

    def test_retry_receives_remaining_budget_not_a_fresh_timeout(self):
        with patch('omr.audiveris.prepare_meter_retry', side_effect=self.prepare), patch(
                'omr.audiveris.asyncio.create_subprocess_exec', side_effect=self.candidate_process), patch.object(
                self.processor, '_communicate_with_timeout', new=AsyncMock(return_value=(b'', b''))) as communicate:
            self.run_retry(monotonic() + .5)
        self.assertGreater(communicate.call_args.args[1], 0)
        self.assertLessEqual(communicate.call_args.args[1], .5)

    def test_failed_or_ambiguous_or_lost_pitch_candidate_falls_back(self):
        for variant in ('exit', 'multiple', 'pitch'):
            async def spawn(*command, **kwargs):
                output = Path(command[command.index('-output') + 1])
                (output / 'retry.xml').write_bytes(ET.tostring(mxl_root('9', pitch='D' if variant == 'pitch' else 'C')))
                if variant == 'multiple':
                    (output / 'second.xml').write_bytes(b'<score-partwise/>')
                process = SuccessfulProcess()
                if variant == 'exit':
                    process.returncode = 1
                return process
            with self.subTest(variant=variant), patch('omr.audiveris.prepare_meter_retry', side_effect=self.prepare), patch(
                    'omr.audiveris.asyncio.create_subprocess_exec', side_effect=spawn):
                self.assertEqual(self.run_retry(), self.original)

    def test_timed_out_retry_is_killed_and_original_result_survives(self):
        process = HangingProcess()
        with patch('omr.audiveris.prepare_meter_retry', side_effect=self.prepare), patch(
                'omr.audiveris.asyncio.create_subprocess_exec', new=AsyncMock(return_value=process)):
            self.assertEqual(self.run_retry(monotonic() + .02), self.original)
        self.assertTrue(process.killed)
        self.assertTrue(process.waited)

    def test_cancelled_retry_kills_process_and_propagates_cancellation(self):
        process = HangingProcess()
        async def run():
            task = asyncio.create_task(self.processor._maybe_retry_meter(
                self.original, self.pdf, self.directory, monotonic() + 5))
            await process.communicate_started.wait()
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task
        with patch('omr.audiveris.prepare_meter_retry', side_effect=self.prepare), patch(
                'omr.audiveris.asyncio.create_subprocess_exec', new=AsyncMock(return_value=process)):
            asyncio.run(run())
        self.assertTrue(process.killed)
        self.assertTrue(process.waited)


if __name__ == '__main__':
    unittest.main()
