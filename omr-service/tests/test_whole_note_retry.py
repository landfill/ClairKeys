import tempfile
import unittest
from unittest.mock import patch
from fractions import Fraction
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

from omr.recognition_evaluation import read_musicxml
from omr.whole_note_retry import accept_whole_note_retry, retry_is_eligible, _fraction


def score(meter='4', include_final=False):
    root = ET.Element('score-partwise')
    part_list = ET.SubElement(root, 'part-list')
    score_part = ET.SubElement(part_list, 'score-part', id='P1')
    ET.SubElement(score_part, 'part-name').text = 'Piano'
    part = ET.SubElement(root, 'part', id='P1')
    numbers = [str(number) for number in range(1, 21)] + [str(number) for number in range(22, 31)]
    if include_final:
        numbers.append('31')
    for number in numbers:
        measure = ET.SubElement(part, 'measure', number=number)
        if number == '1':
            attributes = ET.SubElement(measure, 'attributes')
            ET.SubElement(attributes, 'divisions').text = '4'
            key = ET.SubElement(attributes, 'key')
            ET.SubElement(key, 'fifths').text = '4'
            time = ET.SubElement(attributes, 'time')
            ET.SubElement(time, 'beats').text = meter
            ET.SubElement(time, 'beat-type').text = '8' if meter == '6' else '4'
            ET.SubElement(attributes, 'staves').text = '2'
            ET.SubElement(measure, 'sound', tempo='60')
        if number == '31':
            for index, (step, alter, octave, staff) in enumerate(
                    [('F', '1', '4', '1'), ('G', '1', '4', '1'), ('G', '1', '3', '2')]):
                if index == 2:
                    backup = ET.SubElement(measure, 'backup')
                    ET.SubElement(backup, 'duration').text = '16'
                note = ET.SubElement(measure, 'note')
                if index == 1:
                    ET.SubElement(note, 'chord')
                pitch = ET.SubElement(note, 'pitch')
                ET.SubElement(pitch, 'step').text = step
                ET.SubElement(pitch, 'alter').text = alter
                ET.SubElement(pitch, 'octave').text = octave
                ET.SubElement(note, 'duration').text = '16'
                ET.SubElement(note, 'type').text = 'whole'
                ET.SubElement(note, 'staff').text = staff
            continue
        note = ET.SubElement(measure, 'note')
        if number == '30':
            measure.remove(note)
            forward = ET.SubElement(measure, 'forward')
            ET.SubElement(forward, 'duration').text = '8'
            note = ET.SubElement(measure, 'note')
            pitch = ET.SubElement(note, 'pitch')
            ET.SubElement(pitch, 'step').text = 'G'
            ET.SubElement(pitch, 'alter').text = '1'
            ET.SubElement(pitch, 'octave').text = '3'
            ET.SubElement(note, 'duration').text = '8'
            ET.SubElement(note, 'type').text = 'half'
            ET.SubElement(note, 'staff').text = '2'
        else:
            ET.SubElement(note, 'rest')
            ET.SubElement(note, 'duration').text = '16'
            ET.SubElement(note, 'type').text = 'whole'
            ET.SubElement(note, 'staff').text = '1'
    return root


def add_whole(measure, step, alter, octave, staff):
    note = ET.SubElement(measure, 'note')
    pitch = ET.SubElement(note, 'pitch')
    ET.SubElement(pitch, 'step').text = step
    ET.SubElement(pitch, 'alter').text = str(alter)
    ET.SubElement(pitch, 'octave').text = str(octave)
    ET.SubElement(note, 'duration').text = '16'
    ET.SubElement(note, 'type').text = 'whole'
    ET.SubElement(note, 'staff').text = str(staff)
    return note


def valid_candidate():
    root = score(include_final=True)
    part = root.find('part')
    additions = {
        '6': [('D', 1, 4, 1), ('G', 1, 4, 1)],
        '18': [('B', 0, 1, 2)],
        '22': [('D', 1, 4, 1), ('G', 1, 4, 1)],
    }
    for number, pitches in additions.items():
        measure = next(item for item in part.findall('measure') if item.get('number') == number)
        inserted = []
        for index, pitch in enumerate(pitches):
            note = add_whole(measure, *pitch)
            if index:
                note.insert(0, ET.Element('chord'))
            inserted.append(note)
        for note in inserted:
            measure.remove(note)
        for index, note in enumerate(inserted):
            measure.insert(index, note)
        backup = ET.Element('backup')
        ET.SubElement(backup, 'duration').text = '16'
        measure.insert(len(inserted), backup)
    old_note = next(item for item in part.findall("measure[@number='30']/note")
                    if item.findtext('pitch/step') == 'G')
    ET.SubElement(old_note, 'tie', type='start')
    notations = ET.SubElement(old_note, 'notations')
    ET.SubElement(notations, 'tied', type='start')
    final_bass = part.find("measure[@number='31']/note[staff='2']")
    ET.SubElement(final_bass, 'tie', type='stop')
    notations = ET.SubElement(final_bass, 'notations')
    ET.SubElement(notations, 'tied', type='stop')
    return root


def graph_book(sheet_count=2, version='5.11.0'):
    root = ET.Element('book', {'software-version': version})
    for number in range(1, sheet_count + 1):
        sheet = ET.SubElement(root, 'sheet', number=str(number))
        ET.SubElement(sheet, 'steps').text = (
            'LOAD BINARY SCALE GRID HEADERS STEM_SEEDS BEAMS LEDGERS HEADS STEMS '
            'REDUCTION CUE_BEAMS TEXTS MEASURES CHORDS CURVES SYMBOLS LINKS RHYTHMS PAGE')
        page = ET.SubElement(sheet, 'page', id='1')
        system = ET.SubElement(page, 'system')
        part = ET.SubElement(system, 'part', {'logical-id': '1'})
        ET.SubElement(part, 'staff-configuration', {'line-count': '5'})
        ET.SubElement(part, 'staff-configuration', {'line-count': '5'})
    score_node = ET.SubElement(root, 'score')
    ET.SubElement(score_node, 'logical-part', id='1', **{'staff-count': '2'})
    return root


def sheet(cautionary=False, whole_count=0):
    root = ET.Element('sheet')
    page = ET.SubElement(root, 'page', id='1')
    system = ET.SubElement(page, 'system', id='1')
    stack = ET.SubElement(system, 'stack', id='30', duration='0' if cautionary else '1')
    if cautionary:
        stack.set('special', 'CAUTIONARY')
    part = ET.SubElement(system, 'part', id='1')
    for staff_id in ('1', '2'):
        staff = ET.SubElement(part, 'staff', id=staff_id)
        lines = ET.SubElement(staff, 'lines')
        for _ in range(5):
            ET.SubElement(lines, 'line')
    measure = ET.SubElement(part, 'measure', id='30C' if cautionary else '30')
    ET.SubElement(measure, 'right-barline')
    sig = ET.SubElement(system, 'sig')
    for index in range(whole_count):
        glyph_id = f'g{index}'
        ET.SubElement(sig, 'head', id=f'h{index}', shape='WHOLE_NOTE', glyph=glyph_id,
                      staff='1' if index != whole_count - 1 else '2')
        glyph = ET.SubElement(root, 'glyph', id=glyph_id)
        table = ET.SubElement(glyph, 'run-table', orientation='VERTICAL', width='2', height='2')
        ET.SubElement(table, 'runs').text = '2'
        ET.SubElement(table, 'runs').text = '2'
    return root


def archive(directory, name, *, cautionary=False, whole_count=0, version='5.11.0',
            sheet_count=2):
    target = Path(directory) / name
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as output:
        output.writestr('book.xml', ET.tostring(graph_book(sheet_count, version)))
        for number in range(1, sheet_count + 1):
            output.writestr(f'sheet#{number}/sheet#{number}.xml', ET.tostring(
                sheet(cautionary=cautionary and number == sheet_count,
                      whole_count=whole_count if number == sheet_count else 0)))
            output.writestr(f'sheet#{number}/BINARY.png', b'image')
    return target


class WholeNoteRetryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.original_graph = archive(self.temporary.name, 'original.omr', cautionary=True)
        self.candidate_graph = archive(self.temporary.name, 'candidate.omr', whole_count=8)

    def test_love_shape_is_eligible_and_exact_additions_are_accepted(self):
        original = score()
        candidate = valid_candidate()
        self.assertTrue(retry_is_eligible(original, self.original_graph))
        self.assertTrue(accept_whole_note_retry(original, candidate, self.candidate_graph))
        self.assertEqual(
            [measure.get('number') for measure in original.findall('part/measure')],
            [str(number) for number in range(1, 21)] + [str(number) for number in range(22, 31)],
        )

    def test_actual_retained_love_pair_is_accepted(self):
        root = Path(__file__).resolve().parents[2]
        original_mxl = root / 'local-test-data/results/love-affair-2026-09-06/diagnostic-solo/solo.mxl'
        original_omr = original_mxl.with_suffix('.omr')
        candidate_mxl = root / 'local-test-data/results/whole-note-integrity/page-leland-300/solo.mxl'
        candidate_omr = candidate_mxl.with_suffix('.omr')
        if not all(path.is_file() for path in (original_mxl, original_omr, candidate_mxl, candidate_omr)):
            self.skipTest('retained local Love diagnostics are not present')
        original, candidate = read_musicxml(original_mxl), read_musicxml(candidate_mxl)
        self.assertTrue(retry_is_eligible(original, original_omr))
        self.assertTrue(accept_whole_note_retry(original, candidate, candidate_omr))

    def test_actual_satie_and_always_controls_abstain(self):
        root = Path(__file__).resolve().parents[2] / 'local-test-data/results'
        cases = [
            (
                root / 'satie-2026-09-06/original-diagnostic.mxl',
                root / 'whole-note-integrity/satie-leland-300/satie-gymnopedie-1.mxl',
                root / 'whole-note-integrity/satie-leland-300/satie-gymnopedie-1.omr',
            ),
            (
                root / 'always-with-me-2026-09-06/diagnostic.mxl',
                root / 'whole-note-integrity/always-leland-300/Always_With_Me_2pages_300dpi.mxl',
                root / 'whole-note-integrity/always-leland-300/Always_With_Me_2pages_300dpi.omr',
            ),
        ]
        for original_path, candidate_path, candidate_graph in cases:
            if not all(path.is_file() for path in (original_path, candidate_path, candidate_graph)):
                self.skipTest('retained local control diagnostics are not present')
            original, candidate = read_musicxml(original_path), read_musicxml(candidate_path)
            with self.subTest(score=original_path.parent.name):
                self.assertFalse(retry_is_eligible(
                    original, Path(self.temporary.name) / 'must-not-open.omr'))
                self.assertFalse(accept_whole_note_retry(original, candidate, candidate_graph))

    def test_non_four_four_scores_abstain_without_opening_graph(self):
        missing = Path(self.temporary.name) / 'missing.omr'
        for meter in ('3', '6'):
            with self.subTest(meter=meter):
                self.assertFalse(retry_is_eligible(score(meter), missing))

    def test_unsupported_or_malformed_graphs_abstain(self):
        variants = [
            archive(self.temporary.name, 'wrong-version.omr', cautionary=True, version='5.12.0'),
            archive(self.temporary.name, 'three-pages.omr', cautionary=True, sheet_count=3),
            archive(self.temporary.name, 'has-whole.omr', cautionary=True, whole_count=1),
        ]
        for graph in variants:
            with self.subTest(graph=graph.name):
                self.assertFalse(retry_is_eligible(score(), graph))
        malformed = Path(self.temporary.name) / 'malformed.omr'
        malformed.write_bytes(b'not a zip')
        self.assertFalse(retry_is_eligible(score(), malformed))
        crowded = Path(self.temporary.name) / 'crowded.omr'
        with zipfile.ZipFile(crowded, 'w') as output:
            output.writestr('book.xml', ET.tostring(graph_book()))
            for index in range(64):
                output.writestr(f'extra-{index}', b'x')
        self.assertFalse(retry_is_eligible(score(), crowded))
        declared = Path(self.temporary.name) / 'declared.omr'
        with zipfile.ZipFile(declared, 'w') as output:
            output.writestr('book.xml', b'<!DOCTYPE book><book software-version="5.11.0"/>')
        self.assertFalse(retry_is_eligible(score(), declared))

    def test_candidate_must_preserve_events_measures_and_metadata(self):
        changes = []
        changes.append(lambda root: root.find("part/measure[@number='2']/note/duration").__setattr__('text', '8'))
        changes.append(lambda root: root.find("part/measure[@number='1']/attributes/key/fifths").__setattr__('text', '3'))
        changes.append(lambda root: root.find("part/measure[@number='1']/sound").set('tempo', '61'))
        changes.append(lambda root: root.find('part').insert(20, ET.Element('measure', number='21')))
        changes.append(lambda root: ET.SubElement(
            root.find("part/measure[@number='2']"), 'forward').append(
                ET.fromstring('<duration>4</duration>')))
        for change in changes:
            candidate = valid_candidate()
            change(candidate)
            with self.subTest(change=change):
                self.assertFalse(accept_whole_note_retry(score(), candidate, self.candidate_graph))

    def test_only_whole_onset_zero_duration_four_additions_are_allowed(self):
        for variant in ('type', 'duration', 'onset'):
            candidate = valid_candidate()
            added = candidate.find("part/measure[@number='6']/note[pitch]")
            if variant == 'type':
                added.find('type').text = 'half'
            elif variant == 'duration':
                added.find('duration').text = '8'
            else:
                candidate.find("part/measure[@number='6']").insert(1, ET.fromstring('<forward><duration>4</duration></forward>'))
            with self.subTest(variant=variant):
                self.assertFalse(accept_whole_note_retry(score(), candidate, self.candidate_graph))

    def test_new_ties_must_be_one_contiguous_pair_touching_an_added_whole(self):
        candidate = valid_candidate()
        candidate.find("part/measure[@number='31']/note[staff='2']/tie").set('type', 'start')
        self.assertFalse(accept_whole_note_retry(score(), candidate, self.candidate_graph))

    def test_existing_voice_cannot_change_even_with_identical_pitch_and_tie_markers(self):
        candidate = valid_candidate()
        note = candidate.find("part/measure[@number='30']/note[staff='2']")
        ET.SubElement(note, 'voice').text = '99'
        self.assertFalse(accept_whole_note_retry(score(), candidate, self.candidate_graph))

    def test_new_tie_pair_must_share_the_converter_voice_identity(self):
        candidate = valid_candidate()
        note = candidate.find("part/measure[@number='31']/note[staff='2']")
        ET.SubElement(note, 'voice').text = '99'
        self.assertFalse(accept_whole_note_retry(score(), candidate, self.candidate_graph))

    def test_tempo_cannot_move_within_a_preserved_measure(self):
        candidate = valid_candidate()
        measure = candidate.find("part/measure[@number='1']")
        sound = measure.find('sound')
        measure.remove(sound)
        measure.append(sound)
        self.assertFalse(accept_whole_note_retry(score(), candidate, self.candidate_graph))

    def test_first_measure_must_declare_the_guarded_meter(self):
        original = score()
        attributes = original.find('part/measure/attributes')
        time = attributes.find('time')
        attributes.remove(time)
        later = ET.SubElement(original.find("part/measure[@number='2']"), 'attributes')
        later.append(time)
        self.assertFalse(retry_is_eligible(original, self.original_graph))

    def test_structural_staff_metadata_cannot_disappear(self):
        candidate = valid_candidate()
        attributes = candidate.find('part/measure/attributes')
        attributes.remove(attributes.find('staves'))
        self.assertFalse(accept_whole_note_retry(score(), candidate, self.candidate_graph))

    def test_tempo_sound_and_direction_offsets_must_be_preserved(self):
        for offset_xml in ('<sound tempo="60"><offset>1</offset></sound>',
                           '<direction><direction-type><metronome><beat-unit>quarter</beat-unit>'
                           '<per-minute>60</per-minute></metronome></direction-type>'
                           '<offset sound="yes">1</offset></direction>'):
            original, candidate = score(), valid_candidate()
            original.find("part/measure[@number='1']").append(ET.fromstring(offset_xml))
            changed = ET.fromstring(offset_xml)
            changed.find('offset').text = '2'
            candidate.find("part/measure[@number='1']").append(changed)
            with self.subTest(offset_xml=offset_xml):
                self.assertFalse(accept_whole_note_retry(original, candidate, self.candidate_graph))

    def test_rational_lexemes_are_bounded_before_fraction_construction(self):
        for value in ('1e3', '1/0', '9' * 65):
            with self.subTest(value=value), self.assertRaises(ValueError):
                _fraction(value)
        # The deliberately huge exponent must never reach the real allocator,
        # even if the lexical guard regresses in a future implementation.
        with patch('omr.whole_note_retry.Fraction', side_effect=AssertionError('allocator reached')):
            with self.assertRaises(ValueError):
                _fraction('1E999999999')

    def test_blank_or_malformed_glyph_run_tables_are_rejected(self):
        for variant in ('blank', 'dimension', 'orientation', 'sequence-count', 'overflow'):
            graph = sheet(whole_count=8)
            table = graph.find('.//glyph/run-table')
            if variant == 'blank':
                for run in table:
                    run.text = '0 2'
            elif variant == 'dimension':
                table.set('width', '0')
            elif variant == 'orientation':
                table.set('orientation', 'UNKNOWN')
            elif variant == 'sequence-count':
                table.remove(table[0])
            else:
                table[0].text = '3'
            path = Path(self.temporary.name) / (variant + '.omr')
            with zipfile.ZipFile(path, 'w') as output:
                output.writestr('book.xml', ET.tostring(graph_book()))
                output.writestr('sheet#1/sheet#1.xml', ET.tostring(sheet()))
                output.writestr('sheet#2/sheet#2.xml', ET.tostring(graph))
            with self.subTest(variant=variant):
                self.assertFalse(accept_whole_note_retry(score(), valid_candidate(), path))

    def test_graph_wholes_must_have_unique_image_glyphs_and_match_additions(self):
        too_few = archive(self.temporary.name, 'too-few.omr', whole_count=7)
        self.assertFalse(accept_whole_note_retry(score(), valid_candidate(), too_few))
        graph = sheet(whole_count=8)
        graph.find('.//head').set('glyph', 'missing')
        broken = Path(self.temporary.name) / 'broken.omr'
        with zipfile.ZipFile(broken, 'w') as output:
            output.writestr('book.xml', ET.tostring(graph_book()))
            output.writestr('sheet#1/sheet#1.xml', ET.tostring(sheet()))
            output.writestr('sheet#2/sheet#2.xml', ET.tostring(graph))
        self.assertFalse(accept_whole_note_retry(score(), valid_candidate(), broken))


if __name__ == '__main__':
    unittest.main()
