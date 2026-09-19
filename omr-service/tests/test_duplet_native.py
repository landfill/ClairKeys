"""Require actual duplet semantics and digit discrimination on both installed engines."""
import os
from pathlib import Path
import subprocess
import unittest


class DupletNativeTests(unittest.TestCase):
    def test_duplet_factors_and_digit_discrimination_in_both_engines(self):
        engines = (
            os.getenv("AUDIVERIS_EXECUTABLE", "/opt/audiveris/bin/Audiveris"),
            os.getenv("AUDIVERIS_RECOVERY_EXECUTABLE", "/opt/clairkeys-audiveris-recovery/bin/Audiveris"),
        )
        classes = Path(os.getenv("DUPLET_FIXTURE_CLASSES", "/opt/clairkeys-test-classes"))
        if not any(Path(engine).is_file() for engine in engines):
            self.skipTest("no native Audiveris installation")
        for engine in engines:
            self.assertTrue(Path(engine).is_file(), f"both native engines are required: {engine}")
        for configured in engines:
            executable = Path(configured)
            for fixture, marker in (("DupletFixture", "duplet factor cases OK"),
                                    ("DupletRecognitionFixture", "duplet recognition cases OK")):
                with self.subTest(engine=configured, fixture=fixture):
                    self.assertTrue((classes / (fixture + ".class")).is_file(),
                                    "the image must compile every duplet native fixture")
                    home = executable.parent.parent
                    result = subprocess.run(
                        [str(home / "lib/runtime/bin/java"), "--enable-native-access=ALL-UNNAMED",
                         "-Djava.awt.headless=true", "-Xmx3G", "-cp",
                         f"{home}/lib/app/*:{classes}", fixture],
                        capture_output=True, text=True, timeout=120)
                    self.assertEqual(result.returncode, 0, result.stdout[-4000:] + result.stderr[-4000:])
                    self.assertIn(marker, result.stdout)
