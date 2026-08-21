"""Contract tests for the OMR service's HTTP surface and storage behaviour.

Both defects covered here were found by running the service against a real PDF
on 2026-08-21 and are recorded in
`docs/recovery/validation/2026-08-21-omr-service-first-run-defects.md`. Each
test fails against the code as it stood before that date.

`app.py` cannot be imported here — fastapi and aiofiles are not installed in
this environment — so its request contract is asserted from its AST, the same
way `test_audiveris_runtime.py` asserts the Dockerfile's contract from its
text. `storage.py` imports only stdlib plus httpx, so it is exercised for real.
"""

import ast
import asyncio
import unittest
from pathlib import Path
from unittest import mock

OMR_SERVICE_ROOT = Path(__file__).resolve().parents[1]

import sys

if str(OMR_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(OMR_SERVICE_ROOT))

from omr.storage import StorageUploadError, SupabaseStorage, assert_local_fallback_allowed


def _process_pdf_signature() -> ast.arguments:
    tree = ast.parse((OMR_SERVICE_ROOT / "app.py").read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "process_pdf":
            return node.args
    raise AssertionError("process_pdf is not defined in app.py")


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

        for field in ("title", "composer", "user_id"):
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


class LocalFallbackGuardTests(unittest.TestCase):
    def test_fallback_is_refused_in_production(self):
        with mock.patch.dict("os.environ", {"ENVIRONMENT": "production"}, clear=False):
            with self.assertRaises(StorageUploadError):
                assert_local_fallback_allowed()

    def test_fallback_is_refused_when_environment_is_unset(self):
        """An unset ENVIRONMENT must fail closed, not open."""
        environ = {k: v for k, v in __import__("os").environ.items() if k != "ENVIRONMENT"}
        with mock.patch.dict("os.environ", environ, clear=True):
            with self.assertRaises(StorageUploadError):
                assert_local_fallback_allowed()

    def test_fallback_is_permitted_in_development(self):
        with mock.patch.dict("os.environ", {"ENVIRONMENT": "development"}, clear=False):
            assert_local_fallback_allowed()


class StorageUploadHonestyTests(unittest.TestCase):
    """A job must not report success when nothing was uploaded."""

    def _upload(self, storage: SupabaseStorage):
        return asyncio.run(
            storage.upload_animation_data("job-1", {"notes": []}, "Title", "user-1")
        )

    def test_missing_credentials_fail_in_production(self):
        with mock.patch.dict(
            "os.environ",
            {"ENVIRONMENT": "production", "SUPABASE_URL": "", "SUPABASE_ANON_KEY": ""},
            clear=False,
        ):
            storage = SupabaseStorage()
            with self.assertRaises(StorageUploadError):
                self._upload(storage)

    def test_rejected_upload_fails_instead_of_returning_a_local_path(self):
        with mock.patch.dict(
            "os.environ",
            {
                "ENVIRONMENT": "production",
                "SUPABASE_URL": "https://example.supabase.co",
                "SUPABASE_ANON_KEY": "anon-key",
            },
            clear=False,
        ):
            storage = SupabaseStorage()
            response = mock.Mock(status_code=403, text="new row violates row-level security policy")
            with mock.patch("omr.storage.httpx.AsyncClient") as client_cls:
                client = client_cls.return_value.__aenter__.return_value
                client.post = mock.AsyncMock(return_value=response)
                with self.assertRaises(StorageUploadError) as caught:
                    self._upload(storage)

        self.assertIn("403", str(caught.exception))

    def test_transport_error_is_not_swallowed(self):
        """A deleted or paused Supabase project must fail the job.

        On 2026-08-21 the project's host stopped resolving; the previous code
        caught the exception, wrote a local file, and reported the job
        completed.
        """
        with mock.patch.dict(
            "os.environ",
            {
                "ENVIRONMENT": "production",
                "SUPABASE_URL": "https://example.supabase.co",
                "SUPABASE_ANON_KEY": "anon-key",
            },
            clear=False,
        ):
            storage = SupabaseStorage()
            with mock.patch("omr.storage.httpx.AsyncClient") as client_cls:
                client = client_cls.return_value.__aenter__.return_value
                client.post = mock.AsyncMock(side_effect=OSError("Name or service not known"))
                with self.assertRaises(StorageUploadError):
                    self._upload(storage)

    def test_successful_upload_returns_the_public_url(self):
        with mock.patch.dict(
            "os.environ",
            {
                "ENVIRONMENT": "production",
                "SUPABASE_URL": "https://example.supabase.co",
                "SUPABASE_ANON_KEY": "anon-key",
            },
            clear=False,
        ):
            storage = SupabaseStorage()
            response = mock.Mock(status_code=200, text="")
            with mock.patch("omr.storage.httpx.AsyncClient") as client_cls:
                client = client_cls.return_value.__aenter__.return_value
                client.post = mock.AsyncMock(return_value=response)
                url = self._upload(storage)

        self.assertTrue(url.startswith("https://example.supabase.co/storage/v1/object/public/"))
        self.assertNotIn("file://", url)


if __name__ == "__main__":
    unittest.main()
