"""Evaluate wedge measure integrity contracts for OMR-Q3."""
import json
from pathlib import Path
import unittest

from omr.recognition_evaluation import evaluate_reference, read_musicxml


class WedgeReferenceTests(unittest.TestCase):
    def setUp(self):
        self.fixtures = Path(__file__).resolve().parents[2] / 'fixtures' / 'recognition'
        self.reference = json.loads((self.fixtures / 'wedge-reference.json').read_text())
        self.existing_reference = json.loads(
            (self.fixtures / 'wedge-existing-ledger-reference.json').read_text())

    def test_baseline_failure_contract(self):
        # The baseline candidate lacks measure 21 but has measure 22.
        # This confirms that our evaluation script catches the missing measure.
        result = evaluate_reference(
            read_musicxml(self.fixtures / 'wedge-baseline-candidate.xml'),
            self.reference
        )
        self.assertFalse(result['exact'])
        # Measure 21 should be completely missing, so its match count is 0
        m21_result = next(r for r in result['measures'] if r['number'] == '21')
        self.assertEqual(m21_result['matchedEvents'], 0)
        self.assertEqual(len(m21_result['missing']), 13) # All 13 raw events missing

        # Measure 22 should be perfectly matched; this synthetic m22 agreement validates the comparator/reference, NOT deployed PR144 preservation.
        m22_result = next(r for r in result['measures'] if r['number'] == '22')
        self.assertTrue(m22_result['exact'])
        self.assertEqual(m22_result['matchedEvents'], 10) # 2 whole notes + 8 eighth notes

    def test_positive_control_contract(self):
        # A perfectly constructed candidate should pass exact match.
        result = evaluate_reference(
            read_musicxml(self.fixtures / 'wedge-positive-control.xml'),
            self.reference
        )
        self.assertTrue(result['exact'])
        self.assertEqual(result['expectedEvents'], 23) # 13 for m21 + 10 for m22
        self.assertEqual(result['matchedEvents'], 23)

    def test_metadata_regression(self):
        # Verify that the fixture specifies the correct PDF hash for Love Affair
        self.assertEqual(
            self.reference['sourcePdfSha256'],
            'acdd4ee03f8da75493491f677519dbce4fecf0275b106caf268fa6899ea34253',
            'Reference must be explicitly linked to Love Affair PDF'
        )

    def test_existing_measure_reference_is_source_linked_and_complete(self):
        self.assertEqual(self.existing_reference['sourcePdfSha256'],
                         self.reference['sourcePdfSha256'])
        measure = self.existing_reference['measures'][0]
        self.assertEqual(measure['number'], 20)
        self.assertEqual(measure['quarterLength'], 4)
        self.assertEqual(len(measure['pitchedEvents']), 15)
        self.assertEqual(measure['restEvents'], [
            {'staff': 1, 'onset': 2, 'duration': 0.5},
        ])

    def _mutate_positive_control_and_evaluate(self, mutate_fn):
        import copy
        root = read_musicxml(self.fixtures / 'wedge-positive-control.xml')
        mutate_fn(root)
        return evaluate_reference(root, self.reference)

    def test_negative_mutation_pitch(self):
        def mutate(root):
            # Find the first note in m21 and change its pitch step from A to B
            note = root.find('.//measure[@number="21"]/note/pitch/step')
            note.text = 'B'
        result = self._mutate_positive_control_and_evaluate(mutate)
        self.assertFalse(result['exact'])
        m21 = next(r for r in result['measures'] if r['number'] == '21')
        self.assertEqual(m21['matchedEvents'], 12) # 1 of 13 events mismatched

    def test_negative_mutation_onset(self):
        def mutate(root):
            # Insert a forward element to shift onset of all following notes
            import xml.etree.ElementTree as ET
            measure = root.find('.//measure[@number="21"]')
            forward = ET.Element('forward')
            dur = ET.SubElement(forward, 'duration')
            dur.text = '1' # Shift by 0.5 beats
            measure.insert(1, forward) # Insert after attributes
        result = self._mutate_positive_control_and_evaluate(mutate)
        self.assertFalse(result['exact'])

    def test_negative_mutation_duration(self):
        def mutate(root):
            # Change duration of first note from 4 to 2
            dur = root.find('.//measure[@number="21"]/note/duration')
            dur.text = '2'
        result = self._mutate_positive_control_and_evaluate(mutate)
        self.assertFalse(result['exact'])

    def test_negative_mutation_staff(self):
        def mutate(root):
            # Move first note from staff 1 to staff 2
            staff = root.find('.//measure[@number="21"]/note/staff')
            staff.text = '2'
        result = self._mutate_positive_control_and_evaluate(mutate)
        self.assertFalse(result['exact'])

    def test_negative_mutation_extra_note(self):
        def mutate(root):
            import xml.etree.ElementTree as ET
            # Add an extra invented note to measure 21
            measure = root.find('.//measure[@number="21"]')
            note = ET.Element('note')
            pitch = ET.SubElement(note, 'pitch')
            step = ET.SubElement(pitch, 'step')
            step.text = 'C'
            octave = ET.SubElement(pitch, 'octave')
            octave.text = '4'
            duration = ET.SubElement(note, 'duration')
            duration.text = '2'
            staff = ET.SubElement(note, 'staff')
            staff.text = '1'
            measure.append(note)
        result = self._mutate_positive_control_and_evaluate(mutate)
        self.assertFalse(result['exact'])
        m21 = next(r for r in result['measures'] if r['number'] == '21')
        self.assertEqual(len(m21['unexpected']), 1)

if __name__ == '__main__':
    unittest.main()
