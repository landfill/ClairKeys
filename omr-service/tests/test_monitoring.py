"""Monitoring must remain bounded, secret-free and outside conversion semantics."""
import asyncio
import json
import os
import sys
import tempfile
import unittest
import importlib.util
import re
import shlex
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from omr.monitoring import Monitor


class HostCollectorTests(unittest.TestCase):
    def test_host_collector_has_explicit_byte_units_without_hostnames_or_paths(self):
        script = Path(__file__).resolve().parents[1] / 'deploy/collect-host.py'
        spec = importlib.util.spec_from_file_location('host_collector', script)
        collector = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(collector)
        with tempfile.TemporaryDirectory() as directory:
            memory = Path(directory) / 'meminfo'
            memory.write_text('MemTotal: 100 kB\nMemAvailable: 25 kB\n', encoding='utf-8')
            result = collector.collect(memory, directory)
            self.assertEqual(result['memory_total_bytes'], 102400)
            self.assertEqual(result['memory_available_bytes'], 25600)
            self.assertGreater(result['data_total_bytes'], 0)
            self.assertEqual(set(result), {'sampled_at', 'memory_total_bytes',
                'memory_available_bytes', 'data_total_bytes', 'data_free_bytes'})

    def test_optional_mount_keeps_the_existing_container_command(self):
        directory = Path(__file__).resolve().parents[1] / 'deploy'
        def command(name):
            source = (directory / name).read_text(encoding='utf-8')
            start = re.search(r'ExecStart=(/usr/bin/podman run.*?)(?=\n[^ \t]|\Z)', source, re.S).group(1)
            return shlex.split(start.replace('\\\n', ' '))
        original = command('clairkeys-omr.service')
        extended = command('clairkeys-omr-monitor.conf')
        index = extended.index('/var/lib/clairkeys-omr-monitor:/run/clairkeys-monitor:ro')
        self.assertEqual(extended[index - 1], '-v')
        del extended[index - 1:index + 1]
        self.assertEqual(extended, original)


class SnapshotTests(unittest.TestCase):
    def test_window_bounds_and_restart_reset(self):
        clock = [0.0]
        monitor = Monitor(clock=lambda: clock[0])
        for index in range(120):
            monitor.update('accepted', str(index))
            monitor.update('failed', str(index))
        snapshot = monitor.snapshot()
        self.assertEqual(len(snapshot['jobs']['recent']), 100)
        self.assertEqual(snapshot['jobs']['failed'], 100)
        clock[0] = 3601
        self.assertEqual(monitor.snapshot()['jobs']['failed'], 0)
        self.assertEqual(Monitor().snapshot()['jobs']['recent'], [])

    def test_queue_is_slot_wait_and_callback_does_not_fail_conversion(self):
        clock = [10.0]
        monitor = Monitor(clock=lambda: clock[0])
        monitor.update('accepted', 'safe-id')
        monitor.update('stage', 'safe-id', 'save_pdf')
        monitor.update('stage', 'safe-id', 'audiveris_wait')
        clock[0] = 20
        self.assertEqual(monitor.snapshot()['jobs']['oldest_wait_seconds'], 10)
        monitor.update('stage', 'safe-id', 'audiveris')
        self.assertEqual(monitor.snapshot()['jobs']['queued'], 0)
        monitor.update('completed', 'safe-id')
        monitor.update('callback_attempt', 'safe-id')
        monitor.update('callback', 'safe-id', 'exhausted')
        row = monitor.snapshot()['jobs']['recent'][0]
        self.assertEqual(row['status'], 'completed')
        self.assertEqual(row['wait_seconds'], 10)
        self.assertEqual(row['callback']['status'], 'exhausted')
        self.assertEqual(row['callback']['attempts'], 1)

    def test_live_jobs_are_not_evicted_by_terminal_history(self):
        monitor = Monitor()
        monitor.update('accepted', 'waiting')
        for index in range(105):
            monitor.update('accepted', str(index))
            monitor.update('failed', str(index))
        self.assertEqual(monitor.snapshot()['jobs']['queued'], 1)

    def test_host_missing_and_stale_are_not_zero(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'host.json'
            monitor = Monitor(host_path=path)
            self.assertEqual(monitor.snapshot()['host']['status'], 'unavailable')
            path.write_text(json.dumps({'sampled_at': '2000-01-01T00:00:00+00:00',
                'memory_total_bytes': 10, 'memory_available_bytes': 4,
                'data_total_bytes': 20, 'data_free_bytes': 8}), encoding='utf-8')
            self.assertEqual(monitor.snapshot()['host']['status'], 'stale')
            path.write_text('{"token":"private"}', encoding='utf-8')
            host = monitor.snapshot()['host']
            self.assertEqual(host['status'], 'unavailable')
            self.assertIsNone(host['memory_total_bytes'])
            self.assertNotIn('private', json.dumps(host))


class RuntimeTests(unittest.IsolatedAsyncioTestCase):
    async def test_failure_stage_is_sanitized_and_does_not_call_callback(self):
        import app
        import omr.monitoring as telemetry
        for stage in ('save_pdf', 'audiveris', 'xml_to_json'):
            with self.subTest(stage=stage), tempfile.TemporaryDirectory() as directory, \
                 mock.patch.dict(os.environ, {'OMR_PROCESSING_DIR': directory}), \
                 mock.patch.object(telemetry, 'monitor', Monitor()) as collector:
                job_id = 'stage-fixture'
                collector.update('accepted', job_id)
                app.processing_jobs[job_id] = {'status': 'pending'}
                async def engine(*args):
                    telemetry.observe('stage', job_id, 'audiveris')
                    if stage == 'audiveris':
                        raise RuntimeError('private-file-token')
                    return Path('fixture.xml')
                file = mock.Mock(filename='private.pdf', read=mock.AsyncMock(
                    side_effect=RuntimeError('private-file-token') if stage == 'save_pdf' else None,
                    return_value=b'%PDF'))
                with mock.patch.object(app.audiveris_processor, 'process_pdf', side_effect=engine), \
                     mock.patch.object(app.converter, 'convert_with_artifact', new=mock.AsyncMock(side_effect=RuntimeError('private-file-token'))), \
                     mock.patch.object(app, 'notify_completion', new=mock.AsyncMock()) as callback:
                    await app.process_pdf_background(job_id, file, None, None, None, None, None)
                row = collector.snapshot()['jobs']['recent'][0]
                self.assertEqual(row['status'], 'failed')
                self.assertEqual(row['stage'], stage)
                self.assertNotIn('private', json.dumps(row))
                callback.assert_not_called()
                app.processing_jobs.pop(job_id, None)

    async def test_real_semaphore_boundary_is_observed(self):
        from omr.audiveris import AudiverisProcessor
        import omr.monitoring as telemetry
        processor = AudiverisProcessor(max_concurrent_conversions=1)
        entered = asyncio.Event()
        release = asyncio.Event()
        async def engine(*args):
            entered.set()
            await release.wait()
            return Path('fixture.xml')
        with mock.patch.object(telemetry, 'monitor', Monitor()) as collector, \
             mock.patch.object(processor, '_process_pdf_unlocked', side_effect=engine):
            for job in ('one', 'two'):
                collector.update('accepted', job)
                collector.update('stage', job, 'audiveris_wait')
            first = asyncio.create_task(processor.process_pdf(Path('input.pdf'), Path('one')))
            await entered.wait()
            second = asyncio.create_task(processor.process_pdf(Path('input.pdf'), Path('two')))
            await asyncio.sleep(0)
            self.assertEqual(collector.snapshot()['jobs']['queued'], 1)
            self.assertEqual(collector.snapshot()['jobs']['processing'], 1)
            release.set()
            await asyncio.gather(first, second)
            self.assertEqual(collector.snapshot()['jobs']['queued'], 0)

    async def test_endpoint_requires_token_and_does_not_expose_job_payload(self):
        import app
        import httpx
        with mock.patch.dict(os.environ, {'OMR_SHARED_SECRET': 'test-only', 'ENVIRONMENT': 'production'}):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app.app), base_url='http://test') as client:
                self.assertEqual((await client.get('/monitor')).status_code, 401)
                response = await client.get('/monitor', headers={'X-ClairKeys-Token': 'test-only'})
                self.assertEqual(response.status_code, 200)
                self.assertIn('no-store', response.headers['cache-control'])
                self.assertNotIn('file_info', response.text)

    async def test_instrumentation_failure_preserves_fixture_result(self):
        import app
        from omr.monitoring import monitor
        job_id = 'fixture-job'
        payload = {'notes': [{'midi': 60, 'start': 0, 'duration': 1}], 'duration': 1}
        artifact = {'musicxml': 'fixture'}
        app.processing_jobs[job_id] = {'status': 'pending'}
        try:
            with tempfile.TemporaryDirectory() as directory, mock.patch.dict(os.environ, {'OMR_PROCESSING_DIR': directory}), \
                 mock.patch.object(monitor, 'update', side_effect=RuntimeError('secret-exception')), \
                 mock.patch.object(app.audiveris_processor, 'process_pdf', new=mock.AsyncMock(return_value=Path('fixture.xml'))), \
                 mock.patch.object(app.converter, 'convert_with_artifact', new=mock.AsyncMock(return_value=(payload, artifact))), \
                 mock.patch.object(app, 'notify_completion', new=mock.AsyncMock()):
                file = mock.Mock(filename='private.pdf', read=mock.AsyncMock(return_value=b'%PDF'))
                await app.process_pdf_background(job_id, file, 'private title', None, 'private-user', None, None)
            self.assertEqual(app.processing_jobs[job_id]['status'], 'completed')
            self.assertEqual(app.processing_jobs[job_id]['animation_data'], payload)
            self.assertEqual(app.processing_jobs[job_id]['score_artifact'], artifact)
        finally:
            app.processing_jobs.pop(job_id, None)

    async def test_real_xml_fixture_matches_direct_conversion_with_telemetry(self):
        import app
        import omr.monitoring as telemetry
        fixture = Path(__file__).resolve().parents[2] / 'fixtures/animation-contract/07-tempo-change/input.musicxml'
        expected, expected_artifact = await app.converter.convert_with_artifact(fixture, None, None, None)
        job_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
        app.processing_jobs[job_id] = {'status': 'pending'}
        try:
            with tempfile.TemporaryDirectory() as directory, mock.patch.dict(os.environ, {'OMR_PROCESSING_DIR': directory}), \
                 mock.patch.object(telemetry, 'monitor', Monitor()) as collector, \
                 mock.patch.object(app.audiveris_processor, 'process_pdf', new=mock.AsyncMock(return_value=fixture)), \
                 mock.patch.object(app, 'notify_completion', new=mock.AsyncMock()):
                collector.update('accepted', job_id)
                await app.process_pdf_background(job_id, mock.Mock(filename='fixture.pdf', read=mock.AsyncMock(return_value=b'%PDF')), None, None, None, None, None)
                result = app.processing_jobs[job_id]
                # Wall-clock generation metadata is not part of musical equivalence.
                actual = dict(result['animation_data'])
                expected = dict(expected)
                actual.pop('generated_at')
                expected.pop('generated_at')
                self.assertEqual(actual, expected)
                self.assertEqual(result['score_artifact'], expected_artifact)
                self.assertEqual(collector.snapshot()['jobs']['completed'], 1)
                before = json.dumps(result, sort_keys=True)
                collector.snapshot()
                self.assertEqual(json.dumps(app.processing_jobs[job_id], sort_keys=True), before)
        finally:
            app.processing_jobs.pop(job_id, None)


if __name__ == '__main__':
    unittest.main()
