"""Executable regressions for the completion callback trust boundary."""

import asyncio
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

import app
from omr.delivery import CallbackOriginError, validate_callback_url


class CallbackOriginPolicyTests(unittest.TestCase):
    def validate(self, callback_url, origin="https://app.example.com", environment="production"):
        with mock.patch.dict(
            os.environ,
            {
                "CLAIRKEYS_CALLBACK_ORIGIN": origin,
                "ENVIRONMENT": environment,
            },
            clear=True,
        ):
            return validate_callback_url(callback_url)

    def test_exact_https_origin_and_effective_port_are_accepted(self):
        self.assertEqual(
            self.validate("https://APP.example.com:443/api/omr/finalize?token=fake"),
            "https://APP.example.com:443/api/omr/finalize?token=fake",
        )

    def test_http_is_allowed_only_in_explicit_development(self):
        self.assertEqual(
            self.validate(
                "http://localhost:3000/api/omr/finalize",
                origin="http://localhost:3000",
                environment="development",
            ),
            "http://localhost:3000/api/omr/finalize",
        )
        with self.assertRaises(CallbackOriginError):
            self.validate(
                "http://localhost:3000/api/omr/finalize",
                origin="http://localhost:3000",
            )

    def test_missing_or_invalid_configuration_fails_closed(self):
        invalid_origins = ("", "not-a-url", "https://user@app.example.com", "https://app.example.com/path")
        for origin in invalid_origins:
            with self.subTest(origin=origin):
                with self.assertRaises(CallbackOriginError):
                    self.validate("https://app.example.com/api/omr/finalize", origin=origin)

    def test_ambiguous_or_different_destinations_are_rejected(self):
        rejected = (
            "https://user@app.example.com/api/omr/finalize",
            "https://app.example.com.evil.test/api/omr/finalize",
            "https://evil.test/api/omr/finalize",
            "https://app.example.com:444/api/omr/finalize",
            "https://app.example.com/api/omr/finalize#fragment",
            "//app.example.com/api/omr/finalize",
            "https:////app.example.com/api/omr/finalize",
        )
        for callback_url in rejected:
            with self.subTest(callback_url=callback_url):
                with self.assertRaises(CallbackOriginError):
                    self.validate(callback_url)


class _Response:
    def __init__(self, status_code=204, text=""):
        self.status_code = status_code
        self.text = text


class _Client:
    def __init__(self, calls, response=None, **kwargs):
        self.calls = calls
        self.response = response or _Response()
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def post(self, url, **kwargs):
        self.calls.append((url, self.kwargs, kwargs))
        return self.response


class CompletionDeliveryRuntimeTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.job_id = "job-safe-test"
        app.processing_jobs[self.job_id] = {
            "status": app.ProcessingStatus.COMPLETED,
            "animation_data": {"notes": [{"midi": 60}]},
            "result": {"title": "fixture", "composer": None, "processed_at": "fake"},
        }
        self.env = mock.patch.dict(
            os.environ,
            {
                "OMR_SHARED_SECRET": "fake-secret",
                "CLAIRKEYS_CALLBACK_ORIGIN": "https://app.example.com",
                "ENVIRONMENT": "production",
            },
            clear=True,
        )
        self.env.start()

    def tearDown(self):
        self.env.stop()
        app.processing_jobs.pop(self.job_id, None)

    async def test_rejected_url_makes_no_request_and_preserves_completed_result(self):
        calls = []
        factory = lambda **kwargs: _Client(calls, **kwargs)
        with self.assertLogs("app", level="ERROR") as captured:
            with mock.patch.object(app.httpx, "AsyncClient", side_effect=factory):
                await app.notify_completion(
                    "https://app.example.com.evil.test/finalize?token=must-not-log",
                    self.job_id,
                )

        self.assertEqual(calls, [])
        self.assertEqual(app.processing_jobs[self.job_id]["delivery_status"], "failed")
        self.assertEqual(app.processing_jobs[self.job_id]["status"], app.ProcessingStatus.COMPLETED)
        self.assertEqual(app.processing_jobs[self.job_id]["animation_data"]["notes"][0]["midi"], 60)
        logged = "\n".join(captured.output)
        self.assertNotIn("app.example.com.evil.test", logged)
        self.assertNotIn("must-not-log", logged)
        self.assertNotIn("fake-secret", logged)

    async def test_missing_or_invalid_origin_configuration_makes_no_request(self):
        for configured in (None, "not-an-origin"):
            with self.subTest(configured=configured):
                calls = []
                environment = {
                    "OMR_SHARED_SECRET": "fake-secret",
                    "ENVIRONMENT": "production",
                }
                if configured is not None:
                    environment["CLAIRKEYS_CALLBACK_ORIGIN"] = configured
                with mock.patch.dict(os.environ, environment, clear=True):
                    with mock.patch.object(
                        app.httpx,
                        "AsyncClient",
                        side_effect=lambda **kwargs: _Client(calls, **kwargs),
                    ):
                        await app.notify_completion(
                            "https://app.example.com/api/omr/finalize", self.job_id
                        )
                self.assertEqual(calls, [])
                self.assertEqual(
                    app.processing_jobs[self.job_id]["delivery_status"], "failed"
                )

    async def test_valid_delivery_keeps_timeout_status_and_disables_redirects(self):
        calls = []
        factory = lambda **kwargs: _Client(calls, **kwargs)
        with mock.patch.object(app.httpx, "AsyncClient", side_effect=factory):
            await app.notify_completion(
                "https://app.example.com/api/omr/finalize?token=fake",
                self.job_id,
            )

        self.assertEqual(app.processing_jobs[self.job_id]["delivery_status"], "delivered")
        self.assertEqual(len(calls), 1)
        _, client_options, request_options = calls[0]
        self.assertEqual(client_options["timeout"], 70.0)
        self.assertFalse(client_options["follow_redirects"])
        self.assertEqual(request_options["headers"]["X-ClairKeys-Token"], "fake-secret")

    async def test_redirect_is_not_followed_to_an_unvalidated_destination(self):
        calls = []
        factory = lambda **kwargs: _Client(calls, _Response(302), **kwargs)
        with (
            mock.patch.object(app.httpx, "AsyncClient", side_effect=factory),
            mock.patch.object(app, "MAX_DELIVERY_ATTEMPTS", 2),
            mock.patch.object(app.asyncio, "sleep", new=mock.AsyncMock()),
        ):
            await app.notify_completion("https://app.example.com/finalize", self.job_id)

        self.assertEqual(len(calls), 2)
        self.assertTrue(all(call[1]["follow_redirects"] is False for call in calls))
        self.assertEqual(app.processing_jobs[self.job_id]["delivery_status"], "failed")


if __name__ == "__main__":
    unittest.main()
