"""The diagnostic must reject plausible-looking but musically wrong output."""
import base64
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

from omr.recognition_evaluation import evaluate_reference, read_musicxml


def score(body, attributes='<divisions>2</divisions><time><beats>9</beats><beat-type>8</beat-type></time>'):
    return ET.fromstring(
        f'<score-partwise><part id="P1"><measure number="1"><attributes>{attributes}'
        f'</attributes>{body}</measure></part></score-partwise>'
    )


def note(step='C', duration=2, staff=1, chord=False):
    return (f'<note>{"<chord/>" if chord else ""}<pitch><step>{step}</step><octave>4</octave>'
            f'</pitch><duration>{duration}</duration><staff>{staff}</staff></note>')


class RecognitionEvaluationTests(unittest.TestCase):
    def reference(self, events, length=1):
        return {'timeSignature': '9/8', 'measures': [
            {'number': '1', 'quarterLength': length, 'pitchedEvents': events}
        ]}

    def event(self, midi=60, staff=1, onset=0, duration=1):
        return dict(midi=midi, staff=staff, onset=onset, duration=duration)

    def test_chords_backup_and_forward_preserve_staff_and_onset(self):
        root = score(note() + note('E', chord=True) + '<backup><duration>2</duration></backup>'
                     '<forward><duration>1</duration></forward>' + note('G', 1, 2))
        result = evaluate_reference(root, self.reference([
            self.event(), self.event(64), self.event(67, 2, .5, .5)]))
        self.assertTrue(result['exact'])
        self.assertEqual(result['matchedEvents'], 3)

    def test_missing_dot_is_mismatch_even_with_correct_pitch_and_meter(self):
        result = evaluate_reference(score(note()), self.reference([self.event(duration=1.5)], 1.5))
        self.assertFalse(result['exact'])
        self.assertEqual(result['matchedEvents'], 0)
        self.assertEqual(len(result['measures'][0]['missing']), 1)
        self.assertEqual(len(result['measures'][0]['unexpected']), 1)
        self.assertFalse(result['measures'][0]['lengthMatches'])

    def test_duplicate_notes_cannot_inflate_matches(self):
        result = evaluate_reference(score(note() + note(chord=True)), self.reference([self.event()]))
        self.assertEqual(result['matchedEvents'], 1)
        self.assertFalse(result['exact'])

    def test_wrong_meter_cannot_pass_on_events_alone(self):
        root = score(note(), '<divisions>2</divisions><time><beats>6</beats><beat-type>8</beat-type></time>')
        result = evaluate_reference(root, self.reference([self.event()]))
        self.assertEqual(result['matchedEvents'], 1)
        self.assertFalse(result['exact'])

    def test_rest_and_fractional_divisions_contribute_to_measure_length(self):
        root = score('<note><rest/><duration>0.5</duration></note>' + note(duration=.5),
                     '<divisions>0.5</divisions><time><beats>9</beats><beat-type>8</beat-type></time>')
        self.assertTrue(evaluate_reference(root, self.reference([self.event(onset=1)], 2))['exact'])

    def test_missing_reference_measure_fails_closed(self):
        reference = self.reference([self.event()])
        reference['measures'][0]['number'] = '2'
        result = evaluate_reference(score(note()), reference)
        self.assertFalse(result['exact'])
        self.assertEqual(result['matchedEvents'], 0)

    def test_tied_events_are_not_merged_by_evaluator(self):
        root = score(note().replace('</note>', '<tie type="start"/></note>') +
                     note().replace('</note>', '<tie type="stop"/></note>'))
        self.assertTrue(evaluate_reference(root, self.reference([
            self.event(), self.event(onset=1)], 2))['exact'])

    def test_actual_candidate_remains_rejected_despite_correct_meter_and_bar_length(self):
        fixtures = Path(__file__).resolve().parents[2] / 'fixtures' / 'recognition'
        reference = json.loads((fixtures / 'clair-de-lune-reference.json').read_text())
        candidate = json.loads((fixtures / 'clair-de-lune-gap04-experiment.json').read_text())
        mxl = base64.b64decode(candidate['mxlBase64'], validate=True)
        self.assertEqual(hashlib.sha256(mxl).hexdigest(), candidate['mxlSha256'])
        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / 'candidate.mxl'
            path.write_bytes(mxl)
            result = evaluate_reference(read_musicxml(path), reference)
        self.assertFalse(result['exact'])
        self.assertEqual(result['matchedEvents'], candidate['expectedMatchedRawEvents'])
        self.assertEqual(result['expectedEvents'], candidate['expectedRawEvents'])
        self.assertTrue(result['measures'][0]['meterMatches'])
        self.assertTrue(result['measures'][0]['lengthMatches'])
        self.assertEqual([event['midi'] for event in result['measures'][0]['missing']], [72, 76])


if __name__ == '__main__':
    unittest.main()
