"""Native regression for boundary ties competing with a phrase slur."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

from cross_system_ties_fixture import write_pdf
from test_staff_line_hugging_ties_native import ENGINES, _jar, _read_score


class CrossSystemTiesNativeTests(unittest.TestCase):
    def test_pairing_prefers_same_note_over_phrase_slur(self):
        engines = [(label, Path(path)) for label, path in ENGINES]
        if not any(exe.is_file() for _, exe in engines):
            self.skipTest('no native Audiveris installation')
        classes = Path(os.getenv('CROSS_SYSTEM_FIXTURE_CLASSES', '/opt/clairkeys-test-classes'))
        for label, exe in engines:
            self.assertTrue(exe.is_file() and os.access(exe, os.X_OK) and _jar(exe).is_file(),
                            f'both native engines are required: {label}')
        self.assertTrue((classes / 'CrossSystemTieFixture.class').is_file())
        for label, exe in engines:
            with self.subTest(engine=label):
                home = exe.parent.parent
                run = subprocess.run(
                    [str(home / 'lib/runtime/bin/java'), '--enable-native-access=ALL-UNNAMED',
                     '-Djava.awt.headless=true', '-Xmx3G', '-cp',
                     f'{home}/lib/app/*:{classes}', 'CrossSystemTieFixture'],
                    capture_output=True, text=True, timeout=60)
                self.assertEqual(run.returncode, 0, run.stdout[-2000:] + run.stderr[-2000:])
                self.assertIn('cross-system tie pairing OK', run.stdout)

    def test_standard_boundary_ties_control(self):
        self._check_score('control')

    def test_staff_hugging_boundary_ties(self):
        self._check_score('staff_hugging')

    def test_small_arrival_boundary_tie(self):
        self._check_score('small_arrival')

    def _check_score(self, scenario):
        engines = [(label, Path(path)) for label, path in ENGINES]
        if not any(exe.is_file() for _, exe in engines):
            self.skipTest('no native Audiveris installation')
        for label, exe in engines:
            self.assertTrue(exe.is_file() and os.access(exe, os.X_OK) and _jar(exe).is_file(),
                            f'both native engines are required: {label}')
        for label, exe in engines:
            with self.subTest(engine=label), tempfile.TemporaryDirectory() as tmp:
                work = Path(tmp)
                pdf = work / 'boundary-ties.pdf'
                write_pdf(_jar(exe), pdf, scenario)
                run = subprocess.run([str(exe), '-batch', '-export', '-output', str(work), '--', str(pdf)],
                                     cwd=work, capture_output=True, text=True, timeout=300)
                self.assertEqual(run.returncode, 0, run.stdout[-2000:])
                root = _read_score(work)
                measures = root.findall('part/measure')
                self.assertEqual(len(measures), 4)
                starts = [(n.findtext('pitch/step') + n.findtext('pitch/octave'),
                           sorted(t.get('type') for t in n.findall('tie')))
                          for n in measures[1].findall('note') if n.find('pitch') is not None][-2:]
                stops = [(n.findtext('pitch/step') + n.findtext('pitch/octave'),
                          sorted(t.get('type') for t in n.findall('tie')))
                         for n in measures[2].findall('note') if n.find('pitch') is not None][:2]
                pitches = ('B4', 'D5') if scenario == 'staff_hugging' else ('A4', 'C5')
                def expected_ties(kind):
                    return [(pitch, [kind]) for pitch in pitches]
                self.assertEqual(sorted(starts), expected_ties('start'))
                self.assertEqual(sorted(stops), expected_ties('stop'))
                self.assertEqual([(t.findtext('beats'), t.findtext('beat-type'))
                                  for t in root.iter('time')], [('3', '4')])
                for index, measure in enumerate(measures):
                    pitched = [n for n in measure.findall('note') if n.find('pitch') is not None]
                    expected_count = 3 if index in (0, 3) else 4
                    if scenario == 'staff_hugging' and index == 1:
                        expected_count = 3
                    self.assertEqual(len(pitched), expected_count)
                    for offset, note in enumerate(pitched):
                        boundary = ((index == 1 and offset >= len(pitched)-2)
                                    or (index == 2 and offset < 2))
                        if not boundary:
                            self.assertFalse(note.findall('tie'), 'unexpected non-boundary tie')


if __name__ == '__main__':
    unittest.main()
