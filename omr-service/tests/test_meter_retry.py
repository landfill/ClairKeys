import tempfile
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

from omr.meter_retry import prepare_meter_retry, retry_is_eligible, accept_meter_retry


def mxl_root(meter='6', durations=(4, 4, 3), pitch='C'):
    return ET.fromstring('<score-partwise><part id="P1">' + ''.join(
        f'<measure number="{index}"><attributes><divisions>1</divisions><time><beats>{meter}</beats>'
        f'<beat-type>8</beat-type></time></attributes><note><pitch><step>{pitch}</step><octave>4</octave>'
        f'</pitch><duration>{duration}</duration><staff>1</staff></note></measure>'
        for index, duration in enumerate(durations, 1)) + '</part></score-partwise>')


def graph():
    root = ET.Element('sheet')
    page = ET.SubElement(root, 'page', id='1')
    system = ET.SubElement(page, 'system', id='1')
    part = ET.SubElement(system, 'part', id='1')
    for staff_id in ('1', '2'):
        staff = ET.SubElement(part, 'staff', id=staff_id)
        lines = ET.SubElement(staff, 'lines')
        for _ in range(5):
            ET.SubElement(lines, 'line')
        ET.SubElement(ET.SubElement(staff, 'header'), 'time').text = f'pair{staff_id}'
        ET.SubElement(root, 'time-pair', {'id': f'pair{staff_id}', 'time-rational': '6/8',
                                        'frozen': 'true', 'staff': staff_id})
        for side, value in [('TOP', '6'), ('BOTTOM', '8')]:
            ET.SubElement(root, 'time-number', {'id': f'{side}{staff_id}', 'side': side,
                          'value': value, 'shape': 'TIME_SIX' if value == '6' else 'TIME_EIGHT',
                          'glyph': f'g{side}{staff_id}', 'staff': staff_id, 'frozen': 'true'})
            ET.SubElement(ET.SubElement(root, 'glyph', id=f'g{side}{staff_id}'), 'run-table')
    return root


def book():
    root = ET.Element('book', {'software-version': '5.11.0'})
    sheet = ET.SubElement(root, 'sheet', number='1')
    ET.SubElement(sheet, 'steps').text = 'LOAD BINARY SCALE GRID HEADERS RHYTHMS PAGE'
    return root


class MeterRetryTests(unittest.TestCase):
    def archive(self, directory, sheet=None, metadata=None):
        source = Path(directory) / 'source.omr'
        with zipfile.ZipFile(source, 'w') as archive:
            archive.writestr('book.xml', ET.tostring(metadata if metadata is not None else book()))
            archive.writestr('sheet#1/sheet#1.xml', ET.tostring(sheet if sheet is not None else graph()))
            archive.writestr('sheet#1/BINARY.png', b'unchanged-image-placeholder')
        return source

    def test_only_two_selected_numerators_and_pairs_change_in_copy(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.archive(directory)
            original = source.read_bytes()
            target = Path(directory) / 'retry.omr'
            result = prepare_meter_retry(source, target, lambda _: {'nine': .72, 'margin': .10})
            self.assertEqual(len(result), 2)
            self.assertEqual(source.read_bytes(), original)
            with zipfile.ZipFile(target) as archive:
                root = ET.fromstring(archive.read('sheet#1/sheet#1.xml'))
                self.assertEqual([n.get('value') for n in root.iter('time-number')], ['9', '8', '9', '8'])
                self.assertEqual([n.get('time-rational') for n in root.iter('time-pair')], ['9/8', '9/8'])
                self.assertEqual(archive.read('sheet#1/BINARY.png'), b'unchanged-image-placeholder')
                steps = ET.fromstring(archive.read('book.xml')).findtext('sheet/steps').split()
                self.assertNotIn('RHYTHMS', steps)
                self.assertNotIn('PAGE', steps)
                self.assertIn('HEADERS', steps)

    def test_one_weak_or_disagreeing_staff_abstains_without_output(self):
        for weak in ({'nine': .64, 'margin': .12}, {'nine': .72, 'margin': .079}):
            with self.subTest(weak=weak), tempfile.TemporaryDirectory() as directory:
                source = self.archive(directory)
                target = Path(directory) / 'retry.omr'
                scores = iter([{'nine': .72, 'margin': .10}, weak])
                self.assertIsNone(prepare_meter_retry(source, target, lambda _: next(scores)))
                self.assertFalse(target.exists())

    def test_unsupported_graphs_abstain_before_classification(self):
        def add_meter(root):
            ET.SubElement(root, 'time-whole', shape='COMMON_TIME')
        def wrong_header(root):
            root.find('.//header/time').text = 'not-selected'
        def one_staff(root):
            root.find('.//part').remove(root.findall('.//staff')[1])
        def missing_glyph(root):
            root.remove(root.find('glyph'))
        for change in (add_meter, wrong_header, one_staff, missing_glyph):
            with self.subTest(change=change.__name__), tempfile.TemporaryDirectory() as directory:
                sheet = graph()
                change(sheet)
                source = self.archive(directory, sheet)
                target = Path(directory) / 'retry.omr'
                self.assertIsNone(prepare_meter_retry(source, target, lambda _: self.fail('must not classify')))
                self.assertFalse(target.exists())

    def test_wrong_version_or_multiple_pages_abstains(self):
        for variant in ('version', 'pages'):
            with self.subTest(variant=variant), tempfile.TemporaryDirectory() as directory:
                metadata = book()
                if variant == 'version':
                    metadata.set('software-version', '5.12.0')
                else:
                    ET.SubElement(metadata, 'sheet', number='2')
                source = self.archive(directory, metadata=metadata)
                self.assertIsNone(prepare_meter_retry(source, Path(directory) / 'retry.omr',
                                                      lambda _: self.fail('must not classify')))

    def test_only_widespread_overflow_in_uniform_six_eight_is_eligible(self):
        self.assertTrue(retry_is_eligible(mxl_root()))
        for root in (mxl_root('9'), mxl_root(durations=(3, 3, 3)),
                     mxl_root(durations=(4, 3, 3)), mxl_root(durations=(4, 4, 3, 3, 3))):
            self.assertFalse(retry_is_eligible(root))

    def test_changes_of_meter_and_multiple_parts_are_ineligible(self):
        root = mxl_root()
        root.findall('.//beats')[1].text = '9'
        self.assertFalse(retry_is_eligible(root))
        root = mxl_root()
        ET.SubElement(root, 'part', id='P2')
        self.assertFalse(retry_is_eligible(root))

    def test_accepts_only_improved_nine_eight_with_pitch_and_structure_preserved(self):
        original = mxl_root()
        self.assertTrue(accept_meter_retry(original, mxl_root('9')))
        for candidate in (mxl_root(), mxl_root('9', pitch='D'), mxl_root('9', durations=(4, 4)),
                          mxl_root('9', durations=(5, 5, 3))):
            self.assertFalse(accept_meter_retry(original, candidate))

    def test_pitch_multiplicity_and_staff_changes_are_not_hidden(self):
        original = mxl_root()
        measure = original.find('.//measure')
        measure.append(ET.fromstring(ET.tostring(measure.find('note'))))
        self.assertFalse(accept_meter_retry(original, mxl_root('9')))
        candidate = mxl_root('9')
        candidate.find('.//staff').text = '2'
        self.assertFalse(accept_meter_retry(mxl_root(), candidate))

    def test_retry_cannot_drop_or_change_source_tempo(self):
        original, candidate = mxl_root(), mxl_root('9')
        ET.SubElement(original.find('.//measure'), 'sound', tempo='69')
        self.assertFalse(accept_meter_retry(original, candidate))
        sound = ET.SubElement(candidate.find('.//measure'), 'sound', tempo='46')
        self.assertFalse(accept_meter_retry(original, candidate))
        sound.set('tempo', '69.0')
        self.assertTrue(accept_meter_retry(original, candidate))


if __name__ == '__main__':
    unittest.main()
