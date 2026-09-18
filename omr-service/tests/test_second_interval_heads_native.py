"""Executable regression: a second written across a stem must keep both heads.

Clair de Lune m5 and m7 lose the lower note of a second whose head is displaced to
the other side of the stem. The head is detected and linked, then pruneStemHeads
cuts it from the stem for sitting at a stem end on the non-canonical side, and
checkHeads deletes it for having no stem. checkHeadSide already tolerates that
shape but runs afterwards, so it never gets its turn.

This fixture reproduces the geometry. Each measure must keep the chord of a
second; the rest of the measure is checked too so a fix cannot buy the chord by
dropping something else.

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

from second_interval_heads_fixture import EXPECTED_MEASURES, write_pdf

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


def _pitch(note: ET.Element) -> str:
    pitch = note.find("pitch")
    return pitch.findtext("step") + pitch.findtext("octave")


class SecondIntervalHeadsNativeTests(unittest.TestCase):
    def test_each_engine_keeps_the_displaced_head_of_a_second(self):
        ran = False
        for label, configured in ENGINES:
            executable = Path(configured)
            if not _available(executable):
                continue
            ran = True
            with self.subTest(engine=label), tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp)
                pdf = work / "second-interval-heads.pdf"
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
                    found = [(_pitch(n), n.findtext("type"), n.find("chord") is not None)
                             for n in notes]
                    where = f"measure {measure.get('number')}: {found}"

                    # The chord of a second is written lower note first, with the
                    # upper one carrying <chord/>, so the whole measure reads:
                    # eighth, the chord, two more eighths, then the quarter.
                    upper, lower = expected["chord"]
                    self.assertEqual(upper, expected["eighths"], where)
                    eighth = (expected["eighths"], "eighth", False)
                    self.assertEqual(
                        found,
                        [eighth,
                         (lower, "eighth", False),
                         (upper, "eighth", True),
                         eighth,
                         eighth,
                         (expected["quarter"], "quarter", False)], where)
        if not ran:
            self.skipTest("no native Audiveris installation")


if __name__ == "__main__":
    unittest.main()
