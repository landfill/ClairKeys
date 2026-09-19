"""Native pixel regression for disconnected dot ink claimed by a slur glyph."""
import os
from pathlib import Path
import subprocess
import unittest


class SlurDotErasureNativeTests(unittest.TestCase):
    def test_both_engines_preserve_only_isolated_dot_ink(self):
        engines = (
            os.getenv("AUDIVERIS_EXECUTABLE", "/opt/audiveris/bin/Audiveris"),
            os.getenv("AUDIVERIS_RECOVERY_EXECUTABLE", "/opt/clairkeys-audiveris-recovery/bin/Audiveris"),
        )
        classes = Path(os.getenv("SLUR_DOT_FIXTURE_CLASSES", "/opt/clairkeys-test-classes"))
        ran = False
        for configured in engines:
            executable = Path(configured)
            if not executable.is_file():
                continue
            ran = True
            with self.subTest(engine=configured):
                self.assertTrue((classes / "SlurDotErasureFixture.class").is_file(),
                                "the image must compile the native pixel fixture")
                home = executable.parent.parent
                result = subprocess.run(
                    [str(home / "lib/runtime/bin/java"), "--enable-native-access=ALL-UNNAMED",
                     "-Djava.awt.headless=true", "-Xmx3G", "-cp",
                     f"{home}/lib/app/*:{classes}", "SlurDotErasureFixture"],
                    capture_output=True, text=True, timeout=60)
                self.assertEqual(result.returncode, 0, result.stdout[-2000:] + result.stderr[-2000:])
                self.assertIn("slur dot erasure cases OK", result.stdout)
        if not ran:
            self.skipTest("no native Audiveris installation")


if __name__ == "__main__":
    unittest.main()
