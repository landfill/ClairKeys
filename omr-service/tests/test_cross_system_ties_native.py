"""Native regression for boundary ties competing with a phrase slur."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

from cross_system_ties_fixture import write_pdf
from test_staff_line_hugging_ties_native import ENGINES, _jar, _read_score


class CrossSystemTiesNativeTests(unittest.TestCase):
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
                self.assertEqual(sorted(starts), [('A4', ['start']), ('C5', ['start'])])
                self.assertEqual(sorted(stops), [('A4', ['stop']), ('C5', ['stop'])])


if __name__ == '__main__':
    unittest.main()
