"""Executable regression: a void head sharing a beamed stem must survive and keep the beat.

Clair de Lune m5 writes a dotted half of a lower voice on the stem of a beamed
eighth. analyzeChords excluded every pair of heads of different intrinsic duration
on a stem, so the void head lost to the eighth and SYMBOLS read its ink as a
triplet. Kept alone, the void head then joined the beamed chord and, being the
bottom note, gave that chord a half note halved by the beam: a quarter, which
pushed every later note of the measure by half a beat.

This fixture reproduces the shape. Each measure must keep the void head's pitch,
and the chord it shares with the eighth must stay an eighth so that the measure
still holds exactly three beats.

The void head comes out as an eighth rather than a dotted half, because it still
shares the beamed chord; giving it a chord of its own is left to a later change.
The test pins what this change guarantees, not that.

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

from shared_stem_durations_fixture import EXPECTED_MEASURES, write_pdf

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


class SharedStemDurationsNativeTests(unittest.TestCase):
    def test_each_engine_keeps_the_shared_stem_void_head_on_the_beat(self):
        ran = False
        for label, configured in ENGINES:
            executable = Path(configured)
            if not _available(executable):
                continue
            ran = True
            with self.subTest(engine=label), tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp)
                pdf = work / "shared-stem-durations.pdf"
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
                divisions = int(root.find("part/measure/attributes/divisions").text)

                for measure, expected in zip(measures, EXPECTED_MEASURES):
                    notes = [n for n in measure.findall("note") if n.find("pitch") is not None]
                    found = [(_pitch(n), n.findtext("type"), n.find("chord") is not None)
                             for n in notes]
                    where = f"measure {measure.get('number')}: {found}"

                    # The void head is kept, chorded with the first eighth and written
                    # first as the lower note; the chord stays an eighth.
                    eighth = expected["eighths"]
                    quarter = (expected["quarters"], "quarter", False)
                    self.assertEqual(
                        found,
                        [(expected["dotted_half"], "eighth", False),
                         (eighth, "eighth", True),
                         (eighth, "eighth", False),
                         quarter,
                         quarter], where)

                    # A chord made a quarter by its void bottom note costs the beat.
                    voiced = [n for n in notes if n.find("chord") is None]
                    self.assertEqual(
                        sum(int(n.findtext("duration")) for n in voiced), 3 * divisions, where)
        if not ran:
            self.skipTest("no native Audiveris installation")


if __name__ == "__main__":
    unittest.main()
