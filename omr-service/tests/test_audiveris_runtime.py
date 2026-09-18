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
    def test_existing_positional_constructor_contract_is_preserved(self):
        processor = AudiverisProcessor(Path('/tmp/stock-audiveris'), 2, 3)

        self.assertEqual(processor.audiveris_executable, Path('/tmp/stock-audiveris'))
        self.assertEqual(processor._conversion_slots._value, 2)
        self.assertEqual(processor.process_timeout_seconds, 3)

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
        self.assertNotRegex(dockerfile.lower(), r"apt-get install[^\n]*openjdk")
        self.assertIn("rm -rf /tmp/jdk25", dockerfile)

    def test_container_builds_an_isolated_region_recovery_engine(self):
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")
        patch_file = (
            OMR_SERVICE_ROOT / "audiveris-patches/0001-region-scoped-ledger-recovery.patch"
        )

        self.assertTrue(patch_file.is_file())
        self.assertIn(
            "555ce0821e4fe175ea50d54518cd6fbece9663c1998de529bc6ce429534457df",
            dockerfile,
        )
        self.assertIn(
            "81202a3d8b10912c132a8340d3de6d6a70782d39cd15e0972410a95212f46f3c",
            dockerfile,
        )
        self.assertIn("cp -a /opt/audiveris /opt/clairkeys-audiveris-recovery", dockerfile)
        self.assertIn("/opt/clairkeys-audiveris-recovery/bin/Audiveris -version", dockerfile)
        checksum = dockerfile.index('echo "${LEDGERS_POST_ANALYSIS_SHA256}')
        normalize = dockerfile.index("sed -i 's/\\r$//'", checksum)
        apply_patch = dockerfile.index('patch --directory=/tmp/audiveris-source', normalize)
        self.assertLess(checksum, normalize)
        self.assertLess(normalize, apply_patch)
        self.assertIn(
            'Math.floor(info.height) == maxHeight + 1',
            patch_file.read_text(encoding="utf-8"),
        )

    def test_every_engine_links_a_line_third_dot_to_the_head_below_it(self):
        """Dot order must not decide which line head keeps its augmentation dot.

        In a chord whose two heads sit on adjacent lines, the dot between them
        belongs to the lower head. Stock 5.11.0 hands it to the upper head when
        that dot is processed first, the upper dot then finds no head, and
        LINKS rounds the chord's [1, 0] dots to zero (#134, D-062). The same
        holds when the lower head belongs to another voice's chord at the same
        abscissa, which stock hands the dot to the upper voice (D-064).
        """
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")
        patch_file = OMR_SERVICE_ROOT / "audiveris-patches/0002-line-head-dot-link.patch"

        self.assertTrue(patch_file.is_file())
        patch_text = patch_file.read_text(encoding="utf-8")
        self.assertIn("head.getCenter().y > dotCenter.y", patch_text)
        # D-064 removed the first-chord restriction of D-062 decision 2.
        self.assertNotIn("firstChord", patch_text)
        self.assertIn(
            "4741eeafed3105f42e908dcb810eea65d7e41400a305f1a693ed7235dc5fa87b",
            dockerfile,
        )
        checksum = dockerfile.index('echo "${AUGMENTATION_DOT_INTER_SHA256}')
        normalize = dockerfile.index("sed -i 's/\\r$//'", checksum)
        apply_patch = dockerfile.index("--input=/tmp/dot-link.patch", normalize)
        update_normal = dockerfile.index(
            "--file /opt/audiveris/lib/app/audiveris.jar", apply_patch
        )
        copy_recovery = dockerfile.index(
            "cp -a /opt/audiveris /opt/clairkeys-audiveris-recovery"
        )
        self.assertLess(checksum, normalize)
        self.assertLess(normalize, apply_patch)
        # The recovery engine is copied from the normal one, so it inherits the fix.
        self.assertLess(update_normal, copy_recovery)
        self.assertIn(
            "grep -Fqx 'org/audiveris/omr/sig/inter/AugmentationDotInter.class'",
            dockerfile,
        )

    def test_every_engine_retries_staff_line_tie_ends_only_as_ties(self):
        """A flat tie merged into a staff line must still reach its heads.

        The skeleton keeps staff lines, so such a tie's curve ends where it leaves
        the line, beyond the standard 2.0 interline link coverage. Only clumps the
        standard look-up leaves empty are retried with a wider coverage on staff
        line ends, and the result is kept only as a tie (#134, D-063).
        """
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")
        patch_file = OMR_SERVICE_ROOT / "audiveris-patches/0003-staff-line-tie-head-link.patch"

        self.assertTrue(patch_file.is_file())
        patch_text = patch_file.read_text(encoding="utf-8")
        self.assertIn("final boolean onStaffLine = (selected == null);", patch_text)
        self.assertIn("if (onStaffLine && !selected.slur.isTie())", patch_text)
        self.assertIn("canBeTie(slur, linkPair)", patch_text)
        self.assertIn("3.5,", patch_text)
        self.assertIn("0.25,", patch_text)
        for checksum in (
            "d9f92f97b42aad8c3763bdae7db35b272b394b2154014c03b665baaf12fbe797",
            "0b77cf4e453559b34cfccd9b5f00666f4718ff3d3993f9948e1c58a901dc0d12",
        ):
            self.assertIn(checksum, dockerfile)
        checksum = dockerfile.index('echo "${CLUMP_PRUNER_SHA256}')
        normalize = dockerfile.index("sed -i 's/\\r$//'", checksum)
        apply_patch = dockerfile.index("--input=/tmp/tie-link.patch", normalize)
        update_normal = dockerfile.index(
            "-C /tmp/tie-classes org/audiveris/omr/sheet/curve", apply_patch
        )
        copy_recovery = dockerfile.index(
            "cp -a /opt/audiveris /opt/clairkeys-audiveris-recovery"
        )
        self.assertLess(dockerfile.index('echo "${SLUR_LINKER_SHA256}'), normalize)
        self.assertLess(checksum, normalize)
        self.assertLess(normalize, apply_patch)
        # The recovery engine is copied from the normal one, so it inherits the fix.
        self.assertLess(update_normal, copy_recovery)
        self.assertIn(
            "grep -Fqx 'org/audiveris/omr/sheet/curve/ClumpPruner$ClumpLinker.class'",
            dockerfile,
        )

    def test_every_engine_pulls_a_beam_end_back_to_its_stem(self):
        """A beam must not keep an end that runs past the stem it belongs to.

        When the ink of a slur or tie running along a beam merges into it, the
        beam is built past its stems. That stem then sits inside the beam rather
        than on its end portion, and SigReducer deletes the beam for lacking a
        stem there, turning the beamed notes into quarters (#134, D-065).
        """
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")
        patch_file = OMR_SERVICE_ROOT / "audiveris-patches/0004-beam-end-stem-anchor.patch"

        self.assertTrue(patch_file.is_file())
        patch_text = patch_file.read_text(encoding="utf-8")
        self.assertIn("trimBeams();", patch_text)
        self.assertIn("hasSideStumpSeed(beam, side,", patch_text)
        self.assertIn("getXOutGapMaximum(0)", patch_text)
        self.assertIn("getXInGapMaximum(0)", patch_text)
        # Only ink as thick as a real beam of the sheet may be trimmed, so that the
        # curve of a slur crossing a group's stems cannot be kept as a beam.
        self.assertIn("minTrimHeightRatio", patch_text)
        self.assertIn("heightParams.typicalHeight", patch_text)
        self.assertIn(
            "fa9505b66f2bae9d03a49b69f2f26a27c4c40a4ac18e973123935fe99a84c483",
            dockerfile,
        )
        checksum = dockerfile.index('echo "${BEAMS_BUILDER_SHA256}')
        normalize = dockerfile.index("sed -i 's/\\r$//'", checksum)
        apply_patch = dockerfile.index("--input=/tmp/beam-anchor.patch", normalize)
        update_normal = dockerfile.index(
            "-C /tmp/beam-classes org/audiveris/omr/sheet/beam", apply_patch
        )
        copy_recovery = dockerfile.index(
            "cp -a /opt/audiveris /opt/clairkeys-audiveris-recovery"
        )
        self.assertLess(checksum, normalize)
        self.assertLess(normalize, apply_patch)
        # The recovery engine is copied from the normal one, so it inherits the fix.
        self.assertLess(update_normal, copy_recovery)
        self.assertIn(
            "grep -Fqx 'org/audiveris/omr/sheet/beam/BeamsBuilder.class'",
            dockerfile,
        )

    def test_every_engine_keeps_the_displaced_head_of_a_second(self):
        """A second's displaced head must not be pruned before its side is judged.

        Two heads a step apart cannot share a side of their stem, so one is
        engraved on the other side. pruneStemHeads cuts such a head for sitting
        at a stem end on the non-canonical side and checkHeads then deletes it
        for having no stem, although checkHeadSide would have kept it had it run
        first (#134, D-066).
        """
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")
        patch_file = OMR_SERVICE_ROOT / "audiveris-patches/0005-second-interval-head-prune.patch"

        self.assertTrue(patch_file.is_file())
        patch_text = patch_file.read_text(encoding="utf-8")
        self.assertIn("hasDisplacedNeighbor(stem, head, headSide)", patch_text)
        # The exception reuses the engine's own test, rather than inventing one.
        self.assertIn("lookupHead(stem, targetSide, pitch - 1, staff)", patch_text)
        self.assertIn("lookupHead(stem, targetSide, pitch + 1, staff)", patch_text)
        # Exactly one step: a head at the same pitch on the other side is a duplicate
        # reading of one notehead, and pruning it is what stops a doubled note.
        self.assertNotIn("targetSide, pitch, staff", patch_text)
        self.assertIn("headSide.opposite()", patch_text)
        self.assertIn(
            "6d1b2517d3d0fff6f37c337f6bb1fc02b4ab8ce1dd1dd0ecf3ab4d1e4b2ab244",
            dockerfile,
        )
        checksum = dockerfile.index('echo "${SIG_REDUCER_SHA256}')
        normalize = dockerfile.index("sed -i 's/\\r$//'", checksum)
        apply_patch = dockerfile.index("--input=/tmp/second-head.patch", normalize)
        update_normal = dockerfile.index(
            "-C /tmp/reducer-classes org/audiveris/omr/sig", apply_patch
        )
        copy_recovery = dockerfile.index(
            "cp -a /opt/audiveris /opt/clairkeys-audiveris-recovery"
        )
        self.assertLess(checksum, normalize)
        self.assertLess(normalize, apply_patch)
        # The recovery engine is copied from the normal one, so it inherits the fix.
        self.assertLess(update_normal, copy_recovery)
        self.assertIn(
            "grep -Fqx 'org/audiveris/omr/sig/SigReducer.class'",
            dockerfile,
        )

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

    def test_bundled_launcher_caps_the_audiveris_heap(self):
        dockerfile = (OMR_SERVICE_ROOT / "Dockerfile.audiveris").read_text(encoding="utf-8")

        self.assertIn("java-options=-Xmx3G", dockerfile)

    def test_repository_exposes_only_the_applied_vm_deployment_contract(self):
        deployment_unit = (
            OMR_SERVICE_ROOT / "deploy" / "clairkeys-omr.service"
        ).read_text(encoding="utf-8")

        self.assertFalse((OMR_SERVICE_ROOT / "fly.toml").exists())
        self.assertIn("/usr/bin/podman run", deployment_unit)
        self.assertIn("--env-file /etc/clairkeys-omr.env", deployment_unit)


if __name__ == "__main__":
    unittest.main()
