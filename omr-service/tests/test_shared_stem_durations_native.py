"""Real-engine regressions for independently timed voices sharing a beamed stem.

D-067 preserved the long head but emitted it as an eighth. D-068 must keep the
short voice's timing while giving the long voice its printed dotted duration.
Generated Bravura scores exercise both installations; no engine means a skip.
"""
import os
import subprocess
import tempfile
import unittest
import zipfile
import xml.etree.ElementTree as ET
from fractions import Fraction
from pathlib import Path

from shared_stem_durations_fixture import EXPECTED_MEASURES, MEASURES, STEP_PITCHES, write_pdf

ENGINES = (
    ("normal", os.getenv("AUDIVERIS_EXECUTABLE", "/opt/audiveris/bin/Audiveris")),
    ("recovery", os.getenv("AUDIVERIS_RECOVERY_EXECUTABLE",
                           "/opt/clairkeys-audiveris-recovery/bin/Audiveris")),
)


def _jar(executable):
    return executable.parent.parent / "lib/app/audiveris.jar"


def _available(executable):
    if not executable.is_file() or not os.access(executable, os.X_OK) or not _jar(executable).is_file():
        return False
    try:
        import PIL  # noqa: F401
    except ImportError:
        return False
    return True


def _read_score(output):
    (mxl,) = output.glob("*.mxl")
    with zipfile.ZipFile(mxl) as archive:
        (name,) = [n for n in archive.namelist()
                   if n.endswith(".xml") and not n.startswith("META-INF")]
        return ET.fromstring(archive.read(name))


def _events(root):
    """Read actual voice timing, including MusicXML backups and chord members."""
    divisions = Fraction(1)
    measures = []
    for measure in root.findall("part/measure"):
        divisions = Fraction(measure.findtext("attributes/divisions", str(divisions)))
        cursor = previous = Fraction(0)
        events = []
        for item in measure:
            if item.tag in ("backup", "forward"):
                cursor += Fraction(item.findtext("duration")) / divisions * (-1 if item.tag == "backup" else 1)
            elif item.tag == "note":
                duration = Fraction(item.findtext("duration")) / divisions
                onset = previous if item.find("chord") is not None else cursor
                if item.find("pitch") is not None:
                    events.append((item.findtext("pitch/step") + item.findtext("pitch/octave"),
                                   onset, duration, item.findtext("type"),
                                   len(item.findall("dot")), item.findtext("voice")))
                if item.find("chord") is None:
                    previous = onset
                    cursor += duration
        measures.append(events)
    return measures


class SharedStemDurationsNativeTests(unittest.TestCase):
    def _run(self, executable, work, source, output):
        completed = subprocess.run(
            [str(executable), "-batch", "-save", "-export", "-output", str(output), "--", str(source)],
            cwd=work, capture_output=True, text=True, timeout=300)
        self.assertEqual(completed.returncode, 0, completed.stdout[-4000:] + completed.stderr[-1000:])
        return _read_score(output)

    def _check_split(self, black_seconds):
        ran = False
        for label, configured in ENGINES:
            executable = Path(configured)
            if not _available(executable):
                continue
            ran = True
            with self.subTest(engine=label), tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp)
                pdf = work / "shared-stem.pdf"
                write_pdf(_jar(executable), pdf, black_seconds=black_seconds)
                output = work / "first"
                root = self._run(executable, work, pdf, output)
                self.assertEqual([(t.findtext("beats"), t.findtext("beat-type"))
                                  for t in root.iter("time")], [("3", "4")])
                measures = _events(root)
                self.assertEqual(len(measures), len(MEASURES))
                for index, (notes, expected) in enumerate(zip(measures, EXPECTED_MEASURES)):
                    with self.subTest(measure=index + 1):
                        long_pitch = STEP_PITCHES[MEASURES[index][0] + 1] if black_seconds else expected["dotted_half"]
                        long_notes = [n for n in notes if n[0] == long_pitch]
                        self.assertEqual(len(long_notes), 1, notes)
                        long_note = long_notes[0]
                        duration = Fraction(3, 2) if black_seconds else Fraction(3)
                        kind = "quarter" if black_seconds else "half"
                        self.assertEqual(long_note[1:5], (0, duration, kind, 1), notes)
                        short = [n for n in notes if n[0] == expected["eighths"]]
                        self.assertEqual([(n[1], n[2], n[3], n[4]) for n in short],
                                         [(0, Fraction(1, 2), "eighth", 0),
                                          (Fraction(1, 2), Fraction(1, 2), "eighth", 0)], notes)
                        self.assertTrue(all(n[5] != long_note[5] for n in short), notes)
                        quarters = [n for n in notes if n[0] == expected["quarters"]]
                        self.assertEqual([(n[1], n[2]) for n in quarters], [(1, 1), (2, 1)], notes)
                        self.assertEqual(len(notes), 5, notes)
                # The per-chord beam ownership must survive the OMR save/load path.
                (saved,) = output.glob("*.omr")
                # Audiveris persists the export path in the book. Remove that
                # export first so the assertion cannot accidentally read stale XML.
                (previous_export,) = output.glob("*.mxl")
                previous_export.unlink()
                reloaded = self._run(executable, work, saved, output)
                self.assertEqual(_events(reloaded), measures)
        if not ran:
            self.skipTest("no native Audiveris installation")

    def test_cross_staff_beam_groups_are_not_split(self):
        ran = False
        fixture = Path(os.getenv("SHARED_STEM_FIXTURE_CLASSES", "/opt/clairkeys-test-classes"))
        for label, configured in ENGINES:
            executable = Path(configured)
            if not _available(executable):
                continue
            ran = True
            with self.subTest(engine=label):
                self.assertTrue((fixture / "SharedStemBeamGroupFixture.class").is_file(),
                                "native graph fixture must be compiled by the image build")
                home = executable.parent.parent
                completed = subprocess.run(
                    [str(home / "lib/runtime/bin/java"), "--enable-native-access=ALL-UNNAMED",
                     "-Djava.awt.headless=true", "-cp", f"{home}/lib/app/*:{fixture}",
                     "SharedStemBeamGroupFixture"], capture_output=True, text=True, timeout=30)
                self.assertEqual(completed.returncode, 0, completed.stdout[-2000:] + completed.stderr[-2000:])
                self.assertIn("cross-staff abstention and same-staff control OK", completed.stdout)
        if not ran:
            self.skipTest("no native Audiveris installation")

    def test_each_engine_separates_the_dotted_half_from_the_beamed_voice(self):
        self._check_split(False)

    def test_each_engine_separates_a_dotted_shifted_second(self):
        self._check_split(True)

    def test_undotted_seconds_keep_their_shared_eighth_chord(self):
        ran = False
        for label, configured in ENGINES:
            executable = Path(configured)
            if not _available(executable):
                continue
            ran = True
            with self.subTest(engine=label), tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp)
                pdf = work / "undotted-seconds.pdf"
                write_pdf(_jar(executable), pdf, black_seconds=True, dots="none")
                root = self._run(executable, work, pdf, work / "output")
                measures = _events(root)
                self.assertEqual(len(measures), len(MEASURES))
                for notes, (beamed, _, _) in zip(measures, MEASURES):
                    lower = [n for n in notes if n[0] == STEP_PITCHES[beamed + 1]]
                    self.assertEqual(len(lower), 1, notes)
                    self.assertEqual(lower[0][1:5], (0, Fraction(1, 2), "eighth", 0), notes)
                    upper = [n for n in notes if n[0] == STEP_PITCHES[beamed] and n[1] == 0]
                    self.assertEqual(len(upper), 1, notes)
                    self.assertEqual(lower[0][5], upper[0][5], notes)
                    self.assertEqual(len(notes), 5, notes)
        if not ran:
            self.skipTest("no native Audiveris installation")


if __name__ == "__main__":
    unittest.main()
