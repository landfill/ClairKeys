"""Executable regression: flat ties along staff lines still link their heads.

Runs the installed Audiveris engines on a generated fixture. Hosted CI has no
Audiveris installation and skips it; the OMR image test run executes it.
"""
import os
import subprocess
import tempfile
import unittest
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from staff_line_ties_fixture import EXPECTED_MEASURES, write_pdf

ENGINES = (
    ("normal", os.getenv("AUDIVERIS_EXECUTABLE", "/opt/audiveris/bin/Audiveris")),
    ("recovery", os.getenv(
        "AUDIVERIS_RECOVERY_EXECUTABLE",
        "/opt/clairkeys-audiveris-recovery/bin/Audiveris")),
)


def _jar(executable: Path) -> Path:
    return executable.parent.parent / "lib/app/audiveris.jar"


def _available(executable: Path) -> bool:
    if not (executable.is_file() and os.access(executable, os.X_OK)):
        return False
    if not _jar(executable).is_file():
        return False
    try:
        import PIL  # noqa: F401
    except ImportError:
        return False
    return True


def _read_score(output_dir: Path) -> ET.Element:
    (mxl,) = output_dir.glob("*.mxl")
    with zipfile.ZipFile(mxl) as archive:
        (name,) = [n for n in archive.namelist()
                   if n.endswith(".xml") and not n.startswith("META-INF")]
        return ET.fromstring(archive.read(name))


class StaffLineTiesNativeTests(unittest.TestCase):
    def test_each_engine_ties_both_heads_of_a_chord_along_staff_lines(self):
        ran = False
        for label, configured in ENGINES:
            executable = Path(configured)
            if not _available(executable):
                continue
            ran = True
            with self.subTest(engine=label), tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp)
                pdf = work / "staff-line-ties.pdf"
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
        if not ran:
            self.skipTest("no native Audiveris installation")


if __name__ == "__main__":
    unittest.main()
