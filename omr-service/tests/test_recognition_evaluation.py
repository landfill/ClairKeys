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


def tied(xml, kind='start'):
    return xml.replace('</note>', f'<tie type="{kind}"/></note>')


class MismatchCategoryTests(unittest.TestCase):
    """Separating error kinds must not loosen the exact raw-event verdict."""

    def reference(self, events, length=1, **measure):
        return {'timeSignature': '9/8', 'measures': [
            {'number': '1', 'quarterLength': length, 'pitchedEvents': events, **measure}
        ]}

    def event(self, midi=60, staff=1, onset=0, duration=1):
        return dict(midi=midi, staff=staff, onset=onset, duration=duration)

    def kinds(self, result):
        return sorted(item['kind'] for item in result['measures'][0]['categories'])

    def test_missing_and_misplaced_dots_are_named_as_duration_errors(self):
        missing = evaluate_reference(score(note()), self.reference([self.event(duration=1.5)], 1.5))
        extra = evaluate_reference(score(note(duration=3)), self.reference([self.event()], 1))
        self.assertEqual(self.kinds(missing), ['missing-dot'])
        self.assertEqual(self.kinds(extra), ['extra-dot'])
        self.assertEqual(missing['categories'], {'missing-dot': 1})
        self.assertFalse(missing['exact'])

    def test_a_false_triplet_is_not_mistaken_for_a_lost_dot(self):
        # 1/3 is two thirds of an eighth, but an eighth has no dot to lose.
        root = score(note(duration=2), '<divisions>6</divisions><time><beats>9</beats><beat-type>8</beat-type></time>')
        result = evaluate_reference(root, self.reference([self.event(duration=.5)], .5))
        self.assertEqual(self.kinds(result), ['duration'])

    def test_onset_pitch_and_unpaired_events_are_kept_apart(self):
        root = score('<forward><duration>1</duration></forward>' + note() + note('E', chord=True)
                     + note('A', 2, 2))
        result = evaluate_reference(root, self.reference([
            self.event(), self.event(65, onset=.5), self.event(71, 2, 1, 1)], 1.5))
        self.assertEqual(self.kinds(result), ['extra', 'missing', 'onset', 'pitch'])

    def test_a_shifted_note_that_also_lost_its_dot_is_not_called_a_pitch_error(self):
        root = score('<forward><duration>1</duration></forward>' + note('C', 2))
        result = evaluate_reference(root, self.reference([self.event(duration=1.5)], 1.5))
        self.assertEqual(self.kinds(result), ['onset-and-duration'])

    def test_tie_contract_reports_missing_and_invented_tie_starts(self):
        root = score(tied(note()) + note('E', chord=True) + tied(note(), 'stop') + note('E', chord=True))
        result = evaluate_reference(root, self.reference(
            [self.event(), self.event(64), self.event(onset=1), self.event(64, onset=1)], 2,
            tieStarts=[dict(midi=64, staff=1, onset=0)]))
        measure = result['measures'][0]
        self.assertEqual(measure['matchedTieStarts'], 0)
        self.assertEqual(measure['missingTieStarts'], [dict(midi=64, staff=1, onset=0.0)])
        self.assertEqual(measure['unexpectedTieStarts'], [dict(midi=60, staff=1, onset=0.0)])
        self.assertEqual(result['matchedEvents'], 4)
        self.assertFalse(measure['exact'])
        self.assertFalse(result['exact'])

    def test_measures_without_a_tie_contract_do_not_judge_ties(self):
        result = evaluate_reference(score(tied(note())), self.reference([self.event()]))
        self.assertIsNone(result['measures'][0]['matchedTieStarts'])
        self.assertTrue(result['exact'])

    def test_opening_tempo_contract_uses_the_converter_interpretation(self):
        reference = self.reference([self.event()])
        reference['openingTempo'] = {'quarterBpm': 69}
        marked = score('<direction><sound tempo="69"/></direction>' + note())
        unmarked = score(note())
        self.assertEqual(evaluate_reference(marked, reference)['openingTempo'],
                         {'expectedQuarterBpm': 69, 'actualQuarterBpm': 69.0, 'matches': True})
        result = evaluate_reference(unmarked, reference)
        self.assertFalse(result['openingTempo']['matches'])
        self.assertFalse(result['exact'])



class ProductionRecognitionBaselineTests(unittest.TestCase):
    """Characterizes the deployed #134 result against every printed bar.

    The candidate is the automatic-retry MXL whose events equal the production
    smoke output of 2026-09-06 (`retry.mxl` 878039a1…). It is known to be wrong;
    these numbers pin which defects remain so an engine change is measured
    against the source rather than against warning counts.
    """

    def setUp(self):
        fixtures = Path(__file__).resolve().parents[2] / 'fixtures' / 'recognition'
        self.reference = json.loads((fixtures / 'clair-de-lune-full-reference.json').read_text())
        retry = json.loads((fixtures / 'clair-de-lune-automatic-retry.json').read_text())['after']
        mxl = base64.b64decode(retry['mxlBase64'], validate=True)
        self.assertEqual(hashlib.sha256(mxl).hexdigest(), retry['mxlSha256'])
        with tempfile.TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / 'retry.mxl'
            path.write_bytes(mxl)
            self.result = evaluate_reference(read_musicxml(path), self.reference)

    def test_reference_covers_every_bar_with_full_length_staves(self):
        self.assertEqual([m['number'] for m in self.reference['measures']],
                         [str(number) for number in range(1, 18)])
        for measure in self.reference['measures']:
            for staff in (1, 2):
                ends = [event['onset'] + event['duration']
                        for event in measure['pitchedEvents'] + measure['restEvents']
                        if event['staff'] == staff]
                self.assertEqual(max(ends), measure['quarterLength'], (measure['number'], staff))

    def test_remaining_defects_are_rhythm_and_ties_not_pitch(self):
        result = self.result
        self.assertFalse(result['exact'])
        self.assertEqual((result['matchedEvents'], result['expectedEvents']), (143, 191))
        self.assertEqual(result['categories'], {
            'duration': 4, 'extra-dot': 1, 'missing': 3, 'missing-dot': 12,
            'onset': 18, 'onset-and-duration': 10})
        self.assertEqual([m['number'] for m in result['measures'] if m['exact']],
                         ['8', '15', '16', '17'])
        ties = [(m['matchedTieStarts'], len(m['missingTieStarts'])) for m in result['measures']]
        self.assertEqual((sum(t[0] for t in ties), sum(sum(t) for t in ties)), (23, 43))
        self.assertTrue(all(m['meterMatches'] for m in result['measures']))

    def test_opening_largo_mark_is_read_as_the_opening_tempo(self):
        # Audiveris anchors "Largo (dotted quarter = 46)" after the first rest;
        # nothing sounds before it, so it is the printed opening tempo.
        self.assertEqual(self.result['openingTempo'],
                         {'expectedQuarterBpm': 69, 'actualQuarterBpm': 69.0, 'matches': True})



if __name__ == '__main__':
    unittest.main()
