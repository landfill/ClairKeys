"""Executable regression: a tie hugging its heads' staff line survives the slur purge (D-072).

Runs both installed Audiveris engines on a generated fixture. Hosted CI has no
Audiveris installation and skips it; the OMR image test run executes it and
requires both engines once either is present.
"""
import os
import subprocess
import tempfile
import unittest
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from staff_line_hugging_ties_fixture import EXPECTED_MEASURES, write_pdf

ENGINES = (
    ("normal", os.getenv("AUDIVERIS_EXECUTABLE", "/opt/audiveris/bin/Audiveris")),
    ("recovery", os.getenv(
        "AUDIVERIS_RECOVERY_EXECUTABLE",
        "/opt/clairkeys-audiveris-recovery/bin/Audiveris")),
)


def _jar(executable: Path) -> Path:
    return executable.parent.parent / "lib/app/audiveris.jar"


def _read_score(output_dir: Path) -> ET.Element:
    (mxl,) = output_dir.glob("*.mxl")
    with zipfile.ZipFile(mxl) as archive:
        (name,) = [n for n in archive.namelist()
                   if n.endswith(".xml") and not n.startswith("META-INF")]
        return ET.fromstring(archive.read(name))


class StaffLineHuggingTiesNativeTests(unittest.TestCase):
    def test_each_engine_ties_both_heads_when_tie_ends_hug_their_staff_line(self):
        engines = [(label, Path(configured)) for label, configured in ENGINES]
        if not any(executable.is_file() for _, executable in engines):
            self.skipTest("no native Audiveris installation")
        for label, executable in engines:
            self.assertTrue(executable.is_file() and os.access(executable, os.X_OK)
                            and _jar(executable).is_file(),
                            f"both native engines are required: {label} {executable}")
        for label, executable in engines:
            with self.subTest(engine=label), tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp)
                pdf = work / "staff-line-hugging-ties.pdf"
                write_pdf(_jar(executable), pdf)
                completed = subprocess.run(
                    [str(executable), "-batch", "-export", "-output", str(work), "--", str(pdf)],
                    cwd=work, capture_output=True, text=True, timeout=300)
                self.assertEqual(completed.returncode, 0, completed.stdout[-2000:])
                root = _read_score(work)

                self.assertEqual(
                    [(t.findtext("beats"), t.findtext("beat-type")) for t in root.iter("time")],
                    [("3", "4")])
                measures = root.findall("part/measure")
                self.assertEqual(len(measures), len(EXPECTED_MEASURES))
                for measure, expected in zip(measures, EXPECTED_MEASURES):
                    notes = [n for n in measure.findall("note") if n.find("pitch") is not None]
                    found = [
                        (n.findtext("pitch/step") + n.findtext("pitch/octave"), n.findtext("type"),
                         sorted(t.get("type") for t in n.findall("tie")))
                        for n in notes]
                    lower, upper = expected["pitches"]
                    self.assertEqual(
                        found,
                        [(lower, "half", ["start"]), (upper, "half", ["start"]),
                         (lower, "quarter", ["stop"]), (upper, "quarter", ["stop"])],
                        f"measure {measure.get('number')}")


if __name__ == "__main__":
    unittest.main()
