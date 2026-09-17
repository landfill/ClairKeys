"""Executable regression: a slur crossing a group's stems must not become a beam.

Deborah's Theme m24 showed a slur that runs across the stems of a beamed group
being pulled back to those stems and kept as a second beam group, which emitted
every note of the group twice and made the measure a beat short. This fixture
reproduces that geometry.

The engine does not read this group's beam either way, so the test does not claim
the eighths are recognised. It pins the part the trim rule must not break: the
curve must not add a beam level, and the measure must keep its three beats.

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

from slur_across_stems_fixture import EXPECTED_MEASURES, write_pdf

SHORTER_THAN_EIGHTH = ("16th", "32nd", "64th")

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


class SlurAcrossStemsNativeTests(unittest.TestCase):
    def test_no_engine_turns_the_slur_into_a_beam(self):
        ran = False
        for label, configured in ENGINES:
            executable = Path(configured)
            if not _available(executable):
                continue
            ran = True
            with self.subTest(engine=label), tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp)
                pdf = work / "slur-across-stems.pdf"
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
                for measure in measures:
                    notes = [n for n in measure.findall("note") if n.find("pitch") is not None]
                    found = [
                        (n.findtext("pitch/step") + n.findtext("pitch/octave"),
                         n.findtext("type"), int(n.findtext("duration")))
                        for n in notes]
                    where = f"measure {measure.get('number')}: {found}"

                    # A second beam over the group halves every duration in it.
                    self.assertEqual(
                        [f for f in found if f[1] in SHORTER_THAN_EIGHTH], [], where)

                    # Duplicating the group also costs the measure a beat.
                    voiced = [n for n in notes if n.find("chord") is None]
                    self.assertEqual(
                        sum(int(n.findtext("duration")) for n in voiced), 3 * divisions, where)
        if not ran:
            self.skipTest("no native Audiveris installation")


if __name__ == "__main__":
    unittest.main()
