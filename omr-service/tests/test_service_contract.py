"""Contract tests for the OMR service's HTTP surface.

The `/process` field defects covered here were found by running the service
against a real PDF on 2026-08-21 and are recorded in
`docs/recovery/validation/2026-08-21-omr-service-first-run-defects.md`.

The storage tests that used to sit alongside them are gone, because the thing
they guarded is gone: D-011 removed `omr/storage.py` entirely. The service now
returns the animation JSON through `GET /result/{job_id}` and holds no storage
credentials at all, so there is no upload here that could fail dishonestly.
What replaces them asserts the *absence* — that no credential and no upload
found their way back in — plus the shared secret a public-IP deployment needs.

`app.py` cannot be imported here — fastapi and aiofiles are not installed in
this environment — so its request contract is asserted from its AST, the same
way `test_audiveris_runtime.py` asserts the Dockerfile's contract from its
text. `omr/auth.py` imports stdlib only, so it is exercised for real.
"""

import ast
import asyncio
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest import mock

OMR_SERVICE_ROOT = Path(__file__).resolve().parents[1]

import sys

if str(OMR_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(OMR_SERVICE_ROOT))

from omr import delivery
from omr.auth import SharedSecretError, verify_shared_secret
from omr.converter import MusicXMLToClairKeysConverter

APP_SOURCE = (OMR_SERVICE_ROOT / "app.py").read_text(encoding="utf-8")


def _process_pdf_signature() -> ast.arguments:
    tree = ast.parse((OMR_SERVICE_ROOT / "app.py").read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "process_pdf":
            return node.args
    raise AssertionError("process_pdf is not defined in app.py")


def _async_function(name: str) -> ast.AsyncFunctionDef:
    tree = ast.parse(APP_SOURCE)
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name:
            return node
    raise AssertionError(f"{name} is not defined in app.py")


def _calls_within(node: ast.AST, callee: str) -> bool:
    """True when `callee` is invoked anywhere inside `node`."""
    for child in ast.walk(node):
        if isinstance(child, ast.Call):
            func = child.func
            if isinstance(func, ast.Name) and func.id == callee:
                return True
            if isinstance(func, ast.Attribute) and func.attr == callee:
                return True
    return False


def _calls_within_body(body, callee: str) -> bool:
    """True when `callee` is invoked anywhere inside a list of statements."""
    return any(_calls_within(stmt, callee) for stmt in body)


def _default_call_name(default: ast.expr) -> str:
    if isinstance(default, ast.Call):
        func = default.func
        if isinstance(func, ast.Name):
            return func.id
        if isinstance(func, ast.Attribute):
            return func.attr
    return ""


class ProcessEndpointContractTests(unittest.TestCase):
    """`/process` must read the fields the Next.js route actually sends."""

    def _defaults_by_argument(self) -> dict:
        args = _process_pdf_signature()
        positional = args.args + args.kwonlyargs
        defaults = list(args.defaults) + [d for d in args.kw_defaults if d is not None]
        # Defaults align to the tail of the positional list.
        tail = positional[len(positional) - len(defaults):]
        return {arg.arg: default for arg, default in zip(tail, defaults)}

    def test_metadata_fields_are_declared_as_form_fields(self):
        """Without `Form(...)` FastAPI binds these as query parameters.

        `src/app/api/omr/upload/route.ts` sends them as multipart form fields,
        so every one was silently dropped and a score was stored under its PDF
        filename instead of the title the user typed.
        """
        defaults = self._defaults_by_argument()

        for field in ("title", "composer", "user_id", "callback_url"):
            with self.subTest(field=field):
                self.assertIn(field, defaults, f"{field} is not a declared parameter")
                self.assertEqual(
                    _default_call_name(defaults[field]),
                    "Form",
                    f"{field} must be declared with Form(...) or FastAPI reads it from the query string",
                )

    def test_sheet_music_id_is_accepted(self):
        """`route.ts` sends `sheet_music_id`; app.py never declared it."""
        defaults = self._defaults_by_argument()

        self.assertIn("sheet_music_id", defaults)
        self.assertEqual(_default_call_name(defaults["sheet_music_id"]), "Form")

    def test_tempo_is_a_typed_form_field(self):
        """Tempo must not silently fall through to the query string."""
        defaults = self._defaults_by_argument()
        args = _process_pdf_signature()
        annotations = {arg.arg: ast.unparse(arg.annotation) for arg in args.args if arg.annotation}

        self.assertIn("tempo", defaults)
        self.assertEqual(_default_call_name(defaults["tempo"]), "Form")
        self.assertEqual(annotations["tempo"], "Optional[float]")

    def test_tempo_is_forwarded_through_the_background_task(self):
        """A bound form value is useless unless it reaches the converter."""
        self.assertIn(
            "process_pdf_background, job_id, file, title, composer, user_id, tempo",
            APP_SOURCE,
        )
        self.assertIn(
            "converter.convert(musicxml_path, title, composer, tempo)",
            APP_SOURCE,
        )

    def test_callback_is_forwarded_through_the_background_task(self):
        """Completion delivery must not depend on a mounted browser poller.

        Asserted from the AST rather than from source text: the earlier version
        of this test matched the literal argument list, so reordering a
        parameter or running a formatter broke it while a `notify_completion`
        that sent nothing still passed.
        """
        background = _async_function("process_pdf_background")
        self.assertIn(
            "callback_url",
            [arg.arg for arg in background.args.args],
            "the background task cannot deliver a callback it never receives",
        )
        self.assertTrue(
            _calls_within(background, "notify_completion"),
            "process_pdf_background never invokes notify_completion",
        )

    def test_invalid_tempo_is_rejected_as_bad_request(self):
        """Bad numeric text and values outside 20..400 must both be HTTP 400."""
        self.assertIn("RequestValidationError", APP_SOURCE)
        self.assertIn('error["loc"][-1] == "tempo"', APP_SOURCE)
        self.assertIn("status_code=400", APP_SOURCE)
        self.assertIn("tempo < 20 or tempo > 400", APP_SOURCE)


class ConverterTempoUnitTests(unittest.TestCase):
    """Local unit coverage for MusicXML beat-unit arithmetic.

    These tests are useful when running `omr-service/tests` manually, but that
    directory is not invoked by any repository CI workflow. The Jest CLI gate
    in `src/utils/__tests__/converterTempoContract.test.ts` is the CI-enforced
    regression check for the emitted tempo contract.
    """

    def setUp(self):
        self.converter = MusicXMLToClairKeysConverter()

    def _metronome(self, unit, per_minute, dots=0):
        dot_xml = "<beat-unit-dot/>" * dots
        return ET.fromstring(
            f"<metronome><beat-unit>{unit}</beat-unit>{dot_xml}"
            f"<per-minute>{per_minute}</per-minute></metronome>"
        )

    def test_all_supported_beat_units_convert_to_quarter_bpm(self):
        multipliers = {
            "breve": 8,
            "long": 16,
            "whole": 4,
            "half": 2,
            "quarter": 1,
            "eighth": 0.5,
            "16th": 0.25,
            "32nd": 0.125,
            "64th": 0.0625,
            "128th": 0.03125,
        }
        for unit, multiplier in multipliers.items():
            with self.subTest(unit=unit):
                self.assertEqual(
                    self.converter._metronome_quarter_bpm(
                        self._metronome(unit, 10)
                    ),
                    10 * multiplier,
                )

    def test_multiple_augmentation_dots_are_geometric_not_repeated_1_5(self):
        self.assertEqual(
            self.converter._metronome_quarter_bpm(
                self._metronome("quarter", 60, dots=2)
            ),
            105,
        )

    def test_fractional_quarter_bpm_is_preserved(self):
        self.assertEqual(
            self.converter._metronome_quarter_bpm(
                self._metronome("eighth", 45)
            ),
            22.5,
        )

    def test_sound_tempo_stays_quarter_bpm_and_precedes_metronome(self):
        measure = ET.fromstring(
            "<measure><direction><direction-type>"
            "<metronome><beat-unit>eighth</beat-unit><per-minute>120</per-minute>"
            "</metronome></direction-type><sound tempo='72'/></direction></measure>"
        )
        self.assertEqual(self.converter._find_tempo(measure), 72)


class NoStorageCredentialsTests(unittest.TestCase):
    """D-011: the service must not be able to write to storage at all.

    Two facts settled the design. `SUPABASE_ANON_KEY` is rejected by Storage
    RLS with 403, so this service could never have stored anything; and handing
    it the service-role key instead would put an unrestricted credential on a
    public-IP VM. The upload therefore moved to the Next.js side, which already
    holds that key.
    """

    def test_storage_module_is_gone(self):
        self.assertFalse(
            (OMR_SERVICE_ROOT / "omr" / "storage.py").exists(),
            "omr/storage.py is back; the service is holding storage credentials again",
        )

    def test_app_reads_no_supabase_credentials(self):
        for name in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
            with self.subTest(name=name):
                self.assertNotIn(
                    'getenv("%s")' % name,
                    APP_SOURCE,
                    "app.py reads %s; D-011 keeps storage credentials off this service" % name,
                )

    def test_completed_job_carries_no_storage_url(self):
        """The old completion payload advertised `animation_data_url`.

        Before PR #38 that field could be a `file:///tmp/...` path no browser
        can fetch. There is no URL to advertise any more — the caller stores the
        payload and knows the URL it wrote.
        """
        self.assertNotIn("animation_data_url", APP_SOURCE)


def _handler_for(path):
    tree = ast.parse(APP_SOURCE)
    for node in ast.walk(tree):
        if not isinstance(node, ast.AsyncFunctionDef):
            continue
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Call) and decorator.args:
                first = decorator.args[0]
                if isinstance(first, ast.Constant) and first.value == path:
                    return node
    return None


class ResultEndpointTests(unittest.TestCase):
    """The D-011 handoff: a completed job's payload is collectable by the caller."""

    def test_result_endpoint_exists(self):
        self.assertIsNotNone(
            _handler_for("/result/{job_id}"),
            "GET /result/{job_id} is missing; the caller cannot collect the payload",
        )

    def test_status_endpoint_does_not_carry_the_payload(self):
        """`/status` is polled in a loop; the payload must not ride along."""
        self.assertIn('key != "animation_data"', APP_SOURCE)


class SharedSecretRoutingTests(unittest.TestCase):
    """Every endpoint that costs CPU or reveals work must require the secret."""

    GUARDED = ("/process", "/status/{job_id}", "/result/{job_id}")

    def test_guarded_endpoints_depend_on_the_secret(self):
        for path in self.GUARDED:
            with self.subTest(path=path):
                handler = _handler_for(path)
                self.assertIsNotNone(handler, "no handler declared for %s" % path)

                defaults = list(handler.args.defaults) + [
                    d for d in handler.args.kw_defaults if d is not None
                ]
                depends = [
                    d
                    for d in defaults
                    if isinstance(d, ast.Call)
                    and _default_call_name(d) == "Depends"
                    and any(
                        isinstance(a, ast.Name) and a.id == "require_shared_secret"
                        for a in d.args
                    )
                ]
                self.assertTrue(
                    depends, "%s does not depend on require_shared_secret" % path
                )

    def test_health_is_reachable_without_the_secret(self):
        """nginx and any uptime check need one unauthenticated endpoint."""
        handler = _handler_for("/health")
        self.assertIsNotNone(handler)
        self.assertNotIn("require_shared_secret", ast.dump(handler))


class SharedSecretVerificationTests(unittest.TestCase):
    """The check itself, exercised for real."""

    def test_matching_secret_is_accepted(self):
        with mock.patch.dict("os.environ", {"OMR_SHARED_SECRET": "s3cret"}, clear=False):
            verify_shared_secret("s3cret")

    def test_wrong_secret_is_rejected_with_401(self):
        with mock.patch.dict("os.environ", {"OMR_SHARED_SECRET": "s3cret"}, clear=False):
            with self.assertRaises(SharedSecretError) as caught:
                verify_shared_secret("wrong")
        self.assertEqual(caught.exception.status_code, 401)

    def test_missing_header_is_rejected(self):
        with mock.patch.dict("os.environ", {"OMR_SHARED_SECRET": "s3cret"}, clear=False):
            with self.assertRaises(SharedSecretError):
                verify_shared_secret(None)

    def test_unset_secret_refuses_every_request_in_production(self):
        """Fails closed: a forgotten secret yields a service nobody can drive."""
        import os as _os

        environ = {
            k: v
            for k, v in _os.environ.items()
            if k not in ("OMR_SHARED_SECRET", "ENVIRONMENT")
        }
        with mock.patch.dict("os.environ", environ, clear=True):
            with self.assertRaises(SharedSecretError) as caught:
                verify_shared_secret("anything")
        self.assertEqual(caught.exception.status_code, 503)

    def test_development_may_run_without_a_secret(self):
        import os as _os

        environ = {
            k: v for k, v in _os.environ.items() if k != "OMR_SHARED_SECRET"
        }
        environ["ENVIRONMENT"] = "development"
        with mock.patch.dict("os.environ", environ, clear=True):
            verify_shared_secret(None)


class CompletionDeliveryTests(unittest.TestCase):
    """Delivering a completed job must not be able to un-complete it.

    `process_pdf_background` marks a job COMPLETED, fills in `animation_data`,
    and only then announces it. Announcing is a separate concern with its own
    failure modes — an unreachable Next.js host, a secret that does not match,
    a callback URL that no longer resolves. None of those change the fact that
    the conversion succeeded and the payload is sitting in memory ready for
    `GET /result/{job_id}`.

    The delivery call therefore may not sit inside the `try` whose handler
    writes `status = FAILED`. If it does, a delivery fault rewrites a finished
    job as a failed one and the browser fallback — the very thing that is
    supposed to catch a missed callback — shows the user a failure for a score
    that exists.
    """

    def _background_try(self) -> ast.Try:
        background = _async_function("process_pdf_background")
        tries = [n for n in background.body if isinstance(n, ast.Try)]
        self.assertEqual(
            len(tries), 1, "process_pdf_background should have exactly one top-level try"
        )
        return tries[0]

    def test_the_failure_handler_marks_the_job_failed(self):
        """Guards the premise of the test below.

        If the handler stops writing FAILED, the containment test underneath
        would pass for the wrong reason.
        """
        handler_source = "\n".join(
            ast.unparse(h) for h in self._background_try().handlers
        )
        self.assertIn("ProcessingStatus.FAILED", handler_source)

    def test_delivery_is_not_inside_the_block_that_can_fail_the_job(self):
        node = self._background_try()

        self.assertFalse(
            _calls_within_body(node.body, "notify_completion"),
            "notify_completion is inside the try whose handler writes FAILED; a "
            "delivery fault would rewrite a completed job as failed",
        )
        self.assertTrue(
            _calls_within_body(node.orelse, "notify_completion")
            or _calls_within(_async_function("process_pdf_background"), "notify_completion"),
            "the background task must still deliver the completion",
        )

    def test_delivery_runs_only_when_the_conversion_succeeded(self):
        """A failed conversion has nothing to announce.

        `else` is the placement that satisfies both halves: it runs only when
        the `try` raised nothing, and an exception it raises is not caught by
        the handler above it.
        """
        node = self._background_try()
        self.assertTrue(
            _calls_within_body(node.orelse, "notify_completion"),
            "notify_completion should sit in the try's `else`, so it runs after "
            "a successful conversion and never after a failed one",
        )

    def test_the_callback_client_outlives_the_route_it_calls(self):
        """The producer's timeout must exceed the consumer's own budget.

        `src/app/api/omr/finalize/route.ts` declares `maxDuration = 60`, and the
        `/result` fetch inside it alone may take 30s before Storage is even
        touched. A client that gives up at 30s abandons a finalize that is still
        working and retries a second later, so the same job runs finalize twice
        concurrently: two `/result` fetches, two Storage uploads, two row
        updates. The upsert keeps that correct, but it doubles the work in
        exactly the case that was already slow.
        """
        finalize_route = (
            OMR_SERVICE_ROOT.parent
            / "src/app/api/omr/finalize/route.ts"
        ).read_text(encoding="utf-8")
        match = re.search(r"maxDuration\s*=\s*(\d+)", finalize_route)
        self.assertIsNotNone(match, "finalize route no longer declares maxDuration")
        max_duration = int(match.group(1))

        self.assertGreater(
            delivery.CALLBACK_TIMEOUT_SECONDS,
            max_duration,
            "the callback client would abandon a finalize that is still running",
        )


class DeliveryRetryPolicyTests(unittest.TestCase):
    """The retry policy is exercised for real — `omr/delivery.py` is stdlib only.

    This is the part of delivery that can be wrong in an interesting way, so it
    lives outside `app.py` where a test can actually run it rather than read it.
    """

    def test_a_permanent_rejection_is_not_retried(self):
        """400 and 401 do not become true because we asked twelve more times.

        400 means the job id is not a UUID — this service generated it, so it
        will not change. 401 means the shared secret does not match, which is
        deployment configuration. Retrying either spends ten minutes of backoff
        to reach the conclusion already in hand, and buries a configuration
        fault under a long quiet period instead of surfacing it.
        """
        for status in (400, 401, 403, 422):
            with self.subTest(status=status):
                self.assertFalse(delivery.is_retryable_status(status))

    def test_a_missing_row_is_retried(self):
        """404 is the upload race, not a permanent answer.

        `/api/omr/upload` writes `omrJobId` only after `/process` answers, so a
        conversion that finishes quickly can deliver before the row carries the
        id the callback looks it up by. That window closes on its own within a
        retry or two, which is why 404 must stay outside the permanent set.
        """
        self.assertTrue(delivery.is_retryable_status(404))

    def test_transient_server_faults_are_retried(self):
        for status in (409, 500, 502, 503, 504):
            with self.subTest(status=status):
                self.assertTrue(delivery.is_retryable_status(status))

    def test_backoff_grows_then_settles_at_the_ceiling(self):
        delay = delivery.INITIAL_BACKOFF_SECONDS
        seen = [delay]
        for _ in range(delivery.MAX_DELIVERY_ATTEMPTS):
            delay = delivery.next_backoff_seconds(delay)
            seen.append(delay)

        self.assertEqual(seen[:7], [1, 2, 4, 8, 16, 32, 60])
        self.assertTrue(all(d <= delivery.MAX_BACKOFF_SECONDS for d in seen))

    def test_app_uses_the_shared_policy_rather_than_its_own(self):
        """A second copy of the rule in `app.py` is how the two drift apart."""
        notify = _async_function("notify_completion")
        self.assertTrue(
            _calls_within(notify, "is_retryable_status"),
            "notify_completion must consult the shared retry policy",
        )


if __name__ == "__main__":
    unittest.main()
