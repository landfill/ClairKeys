import ast
import asyncio
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from omr.audiveris import AudiverisProcessor


OMR_SERVICE_ROOT = Path(__file__).resolve().parents[1]


class SuccessfulProcess:
    returncode = 0

    async def communicate(self):
        return b"", b""


class HangingProcess:
    returncode = None

    def __init__(self):
        self.killed = False
        self.waited = False
        self.communicate_started = asyncio.Event()

    async def communicate(self):
        self.communicate_started.set()
        await asyncio.Future()

    def kill(self):
        self.killed = True
        self.returncode = -9

    async def wait(self):
        self.waited = True
        return self.returncode


class AudiverisProcessorTests(unittest.TestCase):
    def test_native_launcher_receives_output_folder_and_returns_mxl(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            temp_dir = Path(temporary_directory)
            executable = temp_dir / "Audiveris"
            executable.touch(mode=0o755)
            os.chmod(executable, 0o755)
            pdf_path = temp_dir / "input.pdf"
            pdf_path.write_bytes(b"%PDF-1.4")
            output_dir = temp_dir / "output"
            output_dir.mkdir()
            mxl_path = output_dir / "input.mxl"
            mxl_path.write_bytes(b"PK")

            processor = AudiverisProcessor(audiveris_executable=executable)

            with patch(
                "omr.audiveris.asyncio.create_subprocess_exec",
                new=AsyncMock(return_value=SuccessfulProcess()),
            ) as create_process:
                result = asyncio.run(processor.process_pdf(pdf_path, output_dir))

            self.assertEqual(result, mxl_path)
            create_process.assert_awaited_once_with(
                str(executable),
                "-batch",
                "-export",
                "-output",
                str(output_dir),
                "--",
                str(pdf_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=output_dir,
            )

    def test_concurrent_conversions_are_serialized_to_one_jvm(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            temp_dir = Path(temporary_directory)
            executable = temp_dir / "Audiveris"
            executable.touch(mode=0o755)
            os.chmod(executable, 0o755)
            processor = AudiverisProcessor(
                audiveris_executable=executable,
                max_concurrent_conversions=1,
            )
            active_conversions = 0
            maximum_active_conversions = 0

            async def fake_process(pdf_path, output_dir):
                nonlocal active_conversions, maximum_active_conversions
                active_conversions += 1
                maximum_active_conversions = max(
                    maximum_active_conversions, active_conversions
                )
                await asyncio.sleep(0.01)
                active_conversions -= 1
                return output_dir / f"{pdf_path.stem}.mxl"

            async def run_concurrently():
                with patch.object(
                    processor,
                    "_process_pdf_unlocked",
                    side_effect=fake_process,
                ):
                    await asyncio.gather(
                        processor.process_pdf(
                            temp_dir / "first.pdf", temp_dir / "first-output"
                        ),
                        processor.process_pdf(
                            temp_dir / "second.pdf", temp_dir / "second-output"
                        ),
                    )

            asyncio.run(run_concurrently())

            self.assertEqual(maximum_active_conversions, 1)

    def test_multiple_mxl_outputs_fail_instead_of_returning_partial_score(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            temp_dir = Path(temporary_directory)
            executable = temp_dir / "Audiveris"
            executable.touch(mode=0o755)
            os.chmod(executable, 0o755)
            pdf_path = temp_dir / "input.pdf"
            pdf_path.write_bytes(b"%PDF-1.4")
            output_dir = temp_dir / "output"
            output_dir.mkdir()
            (output_dir / "movement-1.mxl").write_bytes(b"PK")
            (output_dir / "movement-2.mxl").write_bytes(b"PK")

            processor = AudiverisProcessor(audiveris_executable=executable)

            with patch(
                "omr.audiveris.asyncio.create_subprocess_exec",
                new=AsyncMock(return_value=SuccessfulProcess()),
            ):
                with self.assertRaisesRegex(
                    RuntimeError, "generated multiple MusicXML files"
                ):
                    asyncio.run(processor.process_pdf(pdf_path, output_dir))

    def test_timed_out_conversion_kills_process_and_releases_slot(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            temp_dir = Path(temporary_directory)
            executable = temp_dir / "Audiveris"
            executable.touch(mode=0o755)
            os.chmod(executable, 0o755)
            pdf_path = temp_dir / "input.pdf"
            pdf_path.write_bytes(b"%PDF-1.4")
            output_dir = temp_dir / "output"
            retry_output_dir = temp_dir / "retry-output"
            retry_output_dir.mkdir()
            retry_mxl_path = retry_output_dir / "input.mxl"
            retry_mxl_path.write_bytes(b"PK")
            hanging_process = HangingProcess()
            processor = AudiverisProcessor(
                audiveris_executable=executable,
                process_timeout_seconds=0.01,
            )

            with patch(
                "omr.audiveris.asyncio.create_subprocess_exec",
                new=AsyncMock(
                    side_effect=[hanging_process, SuccessfulProcess()]
                ),
            ):
                with self.assertRaisesRegex(RuntimeError, "timed out after"):
                    asyncio.run(processor.process_pdf(pdf_path, output_dir))
                retry_result = asyncio.run(
                    processor.process_pdf(pdf_path, retry_output_dir)
                )

            self.assertTrue(hanging_process.killed)
            self.assertTrue(hanging_process.waited)
            self.assertEqual(retry_result, retry_mxl_path)

    def test_timed_out_installation_validation_kills_process(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            executable = Path(temporary_directory) / "Audiveris"
            executable.touch(mode=0o755)
            os.chmod(executable, 0o755)
            hanging_process = HangingProcess()
            processor = AudiverisProcessor(
                audiveris_executable=executable,
                process_timeout_seconds=0.01,
            )

            with patch(
                "omr.audiveris.asyncio.create_subprocess_exec",
                new=AsyncMock(return_value=hanging_process),
            ):
                result = asyncio.run(processor.validate_audiveris_installation())

            self.assertFalse(result)
            self.assertTrue(hanging_process.killed)
            self.assertTrue(hanging_process.waited)

    def test_cancelled_conversion_kills_process_before_releasing_slot(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            temp_dir = Path(temporary_directory)
            executable = temp_dir / "Audiveris"
            executable.touch(mode=0o755)
            os.chmod(executable, 0o755)
            pdf_path = temp_dir / "input.pdf"
            pdf_path.write_bytes(b"%PDF-1.4")
            hanging_process = HangingProcess()
            processor = AudiverisProcessor(audiveris_executable=executable)

            async def run_and_cancel():
                task = asyncio.create_task(
                    processor.process_pdf(pdf_path, temp_dir / "output")
                )
                await hanging_process.communicate_started.wait()
                task.cancel()
                with self.assertRaises(asyncio.CancelledError):
                    await task

            with patch(
                "omr.audiveris.asyncio.create_subprocess_exec",
                new=AsyncMock(return_value=hanging_process),
            ):
                asyncio.run(run_and_cancel())

            self.assertTrue(hanging_process.killed)
            self.assertTrue(hanging_process.waited)


class DeploymentStaticContractTests(unittest.TestCase):
    def test_app_uses_only_the_native_audiveris_processor(self):
        tree = ast.parse((OMR_SERVICE_ROOT / "app.py").read_text(encoding="utf-8"))
        imported_modules = {
            node.module
            for node in ast.walk(tree)
            if isinstance(node, ast.ImportFrom) and node.module is not None
        }

        self.assertIn("omr.audiveris", imported_modules)
        self.assertNotIn("omr.audiveris_docker", imported_modules)
        self.assertNotIn("omr.audiveris_alt", imported_modules)

    def test_container_installs_the_verified_release_and_ocr_language_data(self):
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")

        self.assertIn("Audiveris-5.11.0-ubuntu22.04-x86_64.deb", dockerfile)
        self.assertIn(
            "ae714594f40e54b1a4951fc3f914f08ae38fe5d07b7f2283b1a904fdb6e0a318",
            dockerfile,
        )
        self.assertIn("tesseract-ocr-eng", dockerfile)
        self.assertIn("TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata", dockerfile)
        self.assertIn("/opt/audiveris/bin/Audiveris", dockerfile)
        self.assertIn("AUDIVERIS_MAX_CONCURRENCY=1", dockerfile)
        self.assertIn("AUDIVERIS_TIMEOUT_SECONDS=900", dockerfile)
        self.assertIn("grep -Fqx 'java-options=-Xmx3G'", dockerfile)
        self.assertGreaterEqual(dockerfile.count("--no-install-recommends"), 2)
        self.assertNotIn("openjdk", dockerfile.lower())

    def test_container_replaces_english_data_with_checksum_pinned_legacy_model(self):
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")

        self.assertIn(
            "ARG TESSDATA_REPOSITORY_URL=https://raw.githubusercontent.com/tesseract-ocr/tessdata",
            dockerfile,
        )
        self.assertIn("ARG TESSDATA_TAG=4.1.0", dockerfile)
        self.assertIn(
            "ARG TESSDATA_ENG_SHA256=daa0c97d651c19fba3b25e81317cd697e9908c8208090c94c3905381c23fc047",
            dockerfile,
        )
        self.assertIn(
            '"${TESSDATA_REPOSITORY_URL}/${TESSDATA_TAG}/eng.traineddata"',
            dockerfile,
        )
        self.assertIn(
            'echo "${TESSDATA_ENG_SHA256}  /tmp/eng.traineddata" | sha256sum -c -',
            dockerfile,
        )
        self.assertIn(
            "install -m 0644 /tmp/eng.traineddata "
            "/usr/share/tesseract-ocr/4.00/tessdata/eng.traineddata",
            dockerfile,
        )

    def test_container_supplies_the_needs_the_deb_does_not_declare(self):
        """The 5.11.0 .deb fails to install and then fails to run without these.

        Both were found by building the image for the first time on
        2026-08-21; neither is visible from the package metadata. The postinst
        shells out to xdg-desktop-menu/xdg-mime, which exit 3 in a minimal
        image and take `dpkg --configure` down with them. Separately, gtk-3 is
        loaded through JNA by WellKnowns' static initialiser, so a launcher
        that installed cleanly still died before parsing its own arguments.
        """
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")

        self.assertIn("desktop-file-utils", dockerfile)
        self.assertIn("shared-mime-info", dockerfile)
        self.assertIn("/usr/share/applications", dockerfile)
        self.assertIn("libgtk-3-0", dockerfile)

    def test_build_proves_the_launcher_starts_not_merely_that_it_exists(self):
        """`test -x` passed on an image whose launcher could not run at all.

        The build must invoke the launcher so that a missing runtime
        dependency fails the build instead of surfacing as a failed
        conversion in production.
        """
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")

        self.assertIn("/opt/audiveris/bin/Audiveris -version", dockerfile)

    def test_fly_memory_and_bundled_launcher_heap_leave_headroom(self):
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")
        fly_configuration = (OMR_SERVICE_ROOT / "fly.toml").read_text(encoding="utf-8")

        self.assertIn("java-options=-Xmx3G", dockerfile)
        self.assertIn('memory = "4gb"', fly_configuration)


if __name__ == "__main__":
    unittest.main()
