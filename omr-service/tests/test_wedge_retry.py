import copy
from collections import Counter
from fractions import Fraction
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile

from PIL import Image, ImageDraw

from omr.recognition_evaluation import read_musicxml
from omr.wedge_retry import (
    _ledger_geometry_in_profile,
    _in_scope_context_preserved,
    _note_semantics,
    _ties_preserved,
    accept_wedge_retry,
    detect_wedge_export_loss,
    prepare_wedge_retry,
    recovery_region_constant,
)


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / 'fixtures' / 'recognition' / 'wedge-retry'


def score(*, include_target=False):
    root = ET.Element('score-partwise')
    part_list = ET.SubElement(root, 'part-list')
    score_part = ET.SubElement(part_list, 'score-part', id='P1')
    ET.SubElement(score_part, 'part-name').text = 'Piano'
    part = ET.SubElement(root, 'part', id='P1')
    for number in ([1, 2, 3] if include_target else [1, 3]):
        measure = ET.SubElement(part, 'measure', number=str(number))
        if number == 1:
            attributes = ET.SubElement(measure, 'attributes')
            ET.SubElement(attributes, 'divisions').text = '2'
            time = ET.SubElement(attributes, 'time')
            ET.SubElement(time, 'beats').text = '4'
            ET.SubElement(time, 'beat-type').text = '4'
            ET.SubElement(attributes, 'staves').text = '2'
        if number == 2:
            direction = ET.SubElement(measure, 'direction', placement='below')
            direction_type = ET.SubElement(direction, 'direction-type')
            ET.SubElement(direction_type, 'wedge', type='diminuendo', number='1')
            add_note(measure, 'A', 4, 1, 4, voice='1')
            backup = ET.SubElement(measure, 'backup')
            ET.SubElement(backup, 'duration').text = '8'
            add_note(measure, 'E', 2, 2, 4, voice='5')
            backup = ET.SubElement(measure, 'backup')
            ET.SubElement(backup, 'duration').text = '8'
            rest = ET.SubElement(measure, 'note')
            ET.SubElement(rest, 'rest')
            ET.SubElement(rest, 'duration').text = '1'
            ET.SubElement(rest, 'type').text = 'eighth'
            ET.SubElement(rest, 'voice').text = '1'
            ET.SubElement(rest, 'staff').text = '1'
            forward = ET.SubElement(measure, 'forward')
            ET.SubElement(forward, 'duration').text = '7'
            continue
        note = add_note(measure, 'C' if number == 1 else 'D', 4, 1, 4, voice='1')
        notations = ET.SubElement(note, 'notations')
        ET.SubElement(notations, 'slur', type='start' if number == 1 else 'stop', number='1')
    return root


def add_note(measure, step, octave, staff, quarters, *, voice):
    note = ET.SubElement(measure, 'note')
    pitch = ET.SubElement(note, 'pitch')
    ET.SubElement(pitch, 'step').text = step
    ET.SubElement(pitch, 'octave').text = str(octave)
    ET.SubElement(note, 'duration').text = str(quarters * 2)
    ET.SubElement(note, 'type').text = 'whole'
    ET.SubElement(note, 'voice').text = voice
    ET.SubElement(note, 'staff').text = str(staff)
    return note


def binary_png(*, include_target=True):
    image = Image.new('1', (320, 180), 1)
    draw = ImageDraw.Draw(image)
    # Existing native ledger and the target's source ledger ink. Coordinates
    # live only in this synthetic fixture; production discovers them from graph nodes.
    draw.rectangle((26, 149, 45, 151), fill=0)
    if include_target:
        draw.rectangle((126, 149, 145, 151), fill=0)
    draw.ellipse((30, 145, 43, 155), fill=0)
    if include_target:
        draw.ellipse((130, 145, 143, 155), fill=0)
    draw.rectangle((70, 53, 79, 72), fill=0)
    draw.rectangle((150, 53, 159, 72), fill=0)
    with tempfile.NamedTemporaryFile(suffix='.png') as output:
        image.save(output.name)
        return Path(output.name).read_bytes()


def archive(directory, name, sheet_xml, *, symbols=False, image_bytes=None):
    path = Path(directory) / name
    book = ET.parse(FIXTURES / 'book.xml').getroot()
    if symbols:
        book.find('sheet/steps').text = (
            'LOAD BINARY SCALE GRID HEADERS STEM_SEEDS BEAMS LEDGERS HEADS STEMS '
            'REDUCTION CUE_BEAMS TEXTS MEASURES CHORDS CURVES SYMBOLS')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as output:
        output.writestr('book.xml', ET.tostring(book))
        output.writestr('sheet#1/sheet#1.xml', ET.tostring(sheet_xml))
        output.writestr('sheet#1/BINARY.png', image_bytes or binary_png())
    return path


def fixture_sheet(name):
    return ET.parse(FIXTURES / name).getroot()


def candidate_sheet():
    sheet = fixture_sheet('selected-sheet.xml')
    sig = sheet.find('page/system/sig')
    inters = sig.find('inters')
    staff = sheet.find("page/system/part/staff[@id='2']")
    staff.find("ledgers/ledgers-entry[@index='1']").text += ' ledger-target'
    head = sheet.find(".//head[@id='head-bad']")
    head.set('pitch', '6')
    head.set('grade', '0.70')
    head.set('glyph', 'glyph-head-corrected')
    head.attrib.pop('abnormal')
    head.find('bounds').set('y', '145')
    dot = sheet.find(".//augmentation-dot[@id='false-dot']")
    inters.remove(dot)
    relations = sig.find('relations')
    for relation in list(relations):
        if relation.get('source') == 'false-dot':
            relations.remove(relation)
    ledger = ET.fromstring(
        '<ledger thickness="3" shape="LEDGER" glyph="glyph-ledger-target" grade="0.72" '
        'staff="2" id="ledger-target"><bounds x="126" y="149" w="20" h="3"/>'
        '<median><p1 x="126" y="150"/><p2 x="146" y="150"/></median></ledger>')
    inters.insert(0, ledger)
    glyph = ET.fromstring(
        '<glyph left="126" top="149" id="glyph-ledger-target"><run-table orientation="HORIZONTAL" width="20" height="3">'
        '<runs>20</runs><runs>20</runs><runs>20</runs></run-table></glyph>')
    sheet.find('glyph-index').append(glyph)
    sheet.find('glyph-index').append(ET.fromstring(
        '<glyph left="130" top="145" id="glyph-head-corrected"><run-table orientation="VERTICAL" width="12" height="11">'
        '<runs>3 5 3</runs><runs>2 7 2</runs><runs>1 9 1</runs><runs>1 9 1</runs>'
        '<runs>1 9 1</runs><runs>1 9 1</runs><runs>1 9 1</runs><runs>2 7 2</runs>'
        '<runs>3 5 3</runs><runs>11</runs><runs>11</runs><runs>11</runs></run-table></glyph>'))
    rest = ET.fromstring(
        '<rest pitch="-0.5" shape="EIGHTH_REST" glyph="glyph-rest-target" grade="0.36" '
        'staff="1" frozen="true" id="rest-target"><bounds x="150" y="53" w="10" h="20"/></rest>')
    rest_chord = ET.fromstring(
        '<rest-chord grade="0.36" staff="1" frozen="true" id="rest-chord-target">'
        '<bounds x="150" y="53" w="10" h="20"/></rest-chord>')
    inters.append(rest)
    inters.append(rest_chord)
    sheet.find('glyph-index').append(ET.fromstring(
        '<glyph left="150" top="53" id="glyph-rest-target"><run-table orientation="VERTICAL" width="10" height="20">'
        '<runs>20</runs><runs>20</runs><runs>20</runs><runs>20</runs><runs>20</runs>'
        '<runs>20</runs><runs>20</runs><runs>20</runs><runs>20</runs><runs>20</runs>'
        '</run-table></glyph>'))
    relations.append(ET.fromstring(
        '<relation source="rest-chord-target" target="rest-target"><containment/></relation>'))
    measure = sheet.find("page/system/part/measure[@id='2']")
    measure.attrib.pop('abnormal')
    sheet.find("page/system/stack[@id='2']").set('duration', '1')
    voices = {voice.get('id'): voice for voice in measure.findall('voice')}
    bass_slots = ET.SubElement(voices['5'], 'slots')
    bass_slots.append(ET.fromstring(
        '<entry><key>1</key><value status="BEGIN" chord="chord-target"/></entry>'))
    treble_slots = ET.SubElement(voices['1'], 'slots')
    treble_slots.append(ET.fromstring(
        '<entry><key>1</key><value status="BEGIN" chord="chord-target-2"/></entry>'))
    ET.SubElement(measure, 'rest-chords').text = 'rest-chord-target'
    return sheet


class WedgeRetryContractTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.selected = archive(
            self.directory, 'selected.omr', fixture_sheet('selected-sheet.xml'))

    def test_trigger_requires_one_missing_measure_and_null_time_wedge(self):
        trigger = detect_wedge_export_loss(score(), self.selected)
        self.assertIsNotNone(trigger)
        self.assertEqual((trigger.sheet_number, trigger.system_index, trigger.stack_index), (1, 1, 2))
        self.assertEqual(trigger.measure_number, 2)

    def test_missing_measure_without_null_time_wedge_abstains(self):
        sheet = fixture_sheet('selected-sheet.xml')
        relations = sheet.find('page/system/sig/relations')
        for relation in list(relations):
            if relation.find('chord-wedge') is not None:
                relations.remove(relation)
        graph = archive(self.directory, 'no-wedge.omr', sheet)
        self.assertIsNone(detect_wedge_export_loss(score(), graph))

    def test_multiple_export_gaps_abstain_even_with_one_wedge(self):
        original = score()
        part = original.find('part')
        part.remove(part.find("measure[@number='3']"))
        self.assertIsNone(detect_wedge_export_loss(original, self.selected))

    def test_non_four_four_export_gap_abstains(self):
        original = score()
        original.find('part/measure/attributes/time/beats').text = '3'
        self.assertIsNone(detect_wedge_export_loss(original, self.selected))

    def test_duplicate_graph_ids_fail_closed(self):
        sheet = fixture_sheet('selected-sheet.xml')
        duplicate = copy.deepcopy(sheet.find(".//head[@id='head-bad']"))
        sheet.find('page/system/sig').append(duplicate)
        graph = archive(self.directory, 'duplicate.omr', sheet)
        self.assertIsNone(detect_wedge_export_loss(score(), graph))

    def test_prepare_freezes_only_engine_rest_in_target_stack(self):
        symbols = archive(
            self.directory, 'symbols.omr', fixture_sheet('symbols-sheet.xml'), symbols=True)
        prepared = self.directory / 'prepared.omr'
        trigger = detect_wedge_export_loss(score(), self.selected)
        evidence = prepare_wedge_retry(symbols, self.selected, prepared, trigger)
        self.assertIsNotNone(evidence)
        self.assertEqual(evidence.frozen_rest_ids, ('rest-target',))
        with zipfile.ZipFile(prepared) as result:
            sheet = ET.fromstring(result.read('sheet#1/sheet#1.xml'))
        self.assertEqual(sheet.find(".//rest[@id='rest-target']").get('frozen'), 'true')
        self.assertEqual(sheet.find(".//rest-chord[@id='rest-chord-target']").get('frozen'), 'true')
        self.assertIsNone(sheet.find(".//rest[@id='rest-other']").get('frozen'))

    def test_candidate_requires_native_source_backed_ledger_and_false_dot_removal(self):
        symbols = archive(
            self.directory, 'symbols.omr', fixture_sheet('symbols-sheet.xml'), symbols=True)
        prepared = self.directory / 'prepared.omr'
        trigger = detect_wedge_export_loss(score(), self.selected)
        evidence = prepare_wedge_retry(symbols, self.selected, prepared, trigger)
        candidate = archive(self.directory, 'candidate.omr', candidate_sheet())
        self.assertTrue(accept_wedge_retry(
            score(), score(include_target=True), self.selected, candidate, evidence))

        cache_group = candidate_sheet()
        cache_group.find(".//glyph[@id='glyph-head-ledger-ok']").attrib.pop('groups')
        cache_group_graph = archive(self.directory, 'candidate-cache-group.omr', cache_group)
        self.assertTrue(accept_wedge_retry(
            score(), score(include_target=True), self.selected, cache_group_graph, evidence))

        no_ledger = candidate_sheet()
        ledger = no_ledger.find(".//ledger[@id='ledger-target']")
        no_ledger.find('page/system/sig/inters').remove(ledger)
        missing = archive(self.directory, 'candidate-no-ledger.omr', no_ledger)
        self.assertFalse(accept_wedge_retry(
            score(), score(include_target=True), self.selected, missing, evidence))

        changed_head = candidate_sheet()
        changed_head.find(".//head[@id='head-target-2']").set('pitch', '2')
        changed_graph = archive(self.directory, 'candidate-other-head.omr', changed_head)
        changed_score = score(include_target=True)
        changed_score.find(
            "part/measure[@number='2']/note[staff='1']/pitch/step").text = 'G'
        self.assertFalse(accept_wedge_retry(
            score(), changed_score, self.selected, changed_graph, evidence))

    def test_out_of_scope_direction_change_is_rejected(self):
        symbols = archive(
            self.directory, 'symbols.omr', fixture_sheet('symbols-sheet.xml'), symbols=True)
        trigger = detect_wedge_export_loss(score(), self.selected)
        evidence = prepare_wedge_retry(
            symbols, self.selected, self.directory / 'prepared.omr', trigger)
        candidate_root = score(include_target=True)
        direction = ET.SubElement(candidate_root.find("part/measure[@number='1']"), 'direction')
        ET.SubElement(ET.SubElement(direction, 'direction-type'), 'words').text = 'changed'
        candidate = archive(self.directory, 'candidate.omr', candidate_sheet())
        self.assertFalse(accept_wedge_retry(
            score(), candidate_root, self.selected, candidate, evidence))

        candidate_root = score(include_target=True)
        candidate_root.find('part-list/score-part/part-name').text = 'Changed'
        self.assertFalse(accept_wedge_retry(
            score(), candidate_root, self.selected, candidate, evidence))

        original_with_articulation = score()
        notations = original_with_articulation.find(
            "part/measure[@number='1']/note/notations")
        articulations = ET.SubElement(notations, 'articulations')
        ET.SubElement(articulations, 'tenuto', placement='above')
        self.assertFalse(accept_wedge_retry(
            original_with_articulation, score(include_target=True),
            self.selected, candidate, evidence))

    def test_target_musicxml_must_match_native_graph_pitch_staff_onset_and_duration(self):
        symbols = archive(
            self.directory, 'symbols.omr', fixture_sheet('symbols-sheet.xml'), symbols=True)
        trigger = detect_wedge_export_loss(score(), self.selected)
        evidence = prepare_wedge_retry(
            symbols, self.selected, self.directory / 'prepared.omr', trigger)
        candidate_graph = archive(self.directory, 'candidate.omr', candidate_sheet())
        mutations = {
            'pitch': lambda root: setattr(
                root.find("part/measure[@number='2']/note[staff='2']/pitch/step"), 'text', 'F'),
            'staff': lambda root: setattr(
                root.find("part/measure[@number='2']/note[staff='2']/staff"), 'text', '1'),
            'duration': lambda root: setattr(
                root.find("part/measure[@number='2']/note[staff='2']/duration"), 'text', '6'),
            'onset': lambda root: root.find("part/measure[@number='2']").insert(
                1, ET.fromstring('<forward><duration>1</duration></forward>')),
        }
        for name, mutate in mutations.items():
            candidate = score(include_target=True)
            mutate(candidate)
            with self.subTest(name=name):
                self.assertFalse(accept_wedge_retry(
                    score(), candidate, self.selected, candidate_graph, evidence))

    def test_bogus_glyph_absent_source_ink_and_unrelated_graph_change_are_rejected(self):
        symbols = archive(
            self.directory, 'symbols.omr', fixture_sheet('symbols-sheet.xml'), symbols=True)
        trigger = detect_wedge_export_loss(score(), self.selected)
        evidence = prepare_wedge_retry(
            symbols, self.selected, self.directory / 'prepared.omr', trigger)
        bogus = candidate_sheet()
        table = bogus.find(".//glyph[@id='glyph-ledger-target']/run-table")
        table.set('width', '1')
        table.set('height', '1')
        for child in list(table):
            table.remove(child)
        ET.SubElement(table, 'runs').text = '1'
        bogus_graph = archive(self.directory, 'bogus.omr', bogus)
        self.assertFalse(accept_wedge_retry(
            score(), score(include_target=True), self.selected, bogus_graph, evidence))

        no_ink_graph = archive(
            self.directory, 'no-ink.omr', candidate_sheet(),
            image_bytes=binary_png(include_target=False))
        self.assertFalse(accept_wedge_retry(
            score(), score(include_target=True), self.selected, no_ink_graph, evidence))

        unrelated = candidate_sheet()
        unrelated.find('page/system/sig/inters').append(ET.fromstring(
            '<rest pitch="0" shape="QUARTER_REST" grade="0.8" staff="1" id="unrelated">'
            '<bounds x="230" y="50" w="10" h="20"/></rest>'))
        unrelated_graph = archive(self.directory, 'unrelated.omr', unrelated)
        self.assertFalse(accept_wedge_retry(
            score(), score(include_target=True), self.selected, unrelated_graph, evidence))

        outside_pitch = candidate_sheet()
        outside_pitch.find(".//head[@id='head-ledger-ok']").set('pitch', '7')
        outside_pitch_graph = archive(self.directory, 'outside-pitch.omr', outside_pitch)
        self.assertFalse(accept_wedge_retry(
            score(), score(include_target=True), self.selected, outside_pitch_graph, evidence))

        outside_ink = candidate_sheet()
        outside_ink.find(
            ".//glyph[@id='glyph-head-ledger-ok']/run-table/runs").text = '11'
        outside_ink_graph = archive(self.directory, 'outside-ink.omr', outside_ink)
        self.assertFalse(accept_wedge_retry(
            score(), score(include_target=True), self.selected, outside_ink_graph, evidence))

        free_ink = candidate_sheet()
        free_ink.find(".//glyph[@id='glyph-free']/run-table/runs").text = '5 5'
        free_ink_graph = archive(self.directory, 'free-ink.omr', free_ink)
        self.assertFalse(accept_wedge_retry(
            score(), score(include_target=True), self.selected, free_ink_graph, evidence))

        free_group = candidate_sheet()
        free_group.find(".//glyph[@id='glyph-free']").attrib.pop('groups')
        free_group_graph = archive(self.directory, 'free-group.omr', free_group)
        self.assertFalse(accept_wedge_retry(
            score(), score(include_target=True), self.selected, free_group_graph, evidence))

        outside_relation = candidate_sheet()
        relation = next(item for item in outside_relation.findall('.//relation')
                        if item.get('source') == 'chord-ledger-ok')
        relation.set('target', 'head-target-2')
        outside_relation_graph = archive(
            self.directory, 'outside-relation.omr', outside_relation)
        self.assertFalse(accept_wedge_retry(
            score(), score(include_target=True), self.selected, outside_relation_graph, evidence))

    def test_slur_number_regeneration_is_allowed_but_endpoint_change_is_not(self):
        symbols = archive(
            self.directory, 'symbols.omr', fixture_sheet('symbols-sheet.xml'), symbols=True)
        trigger = detect_wedge_export_loss(score(), self.selected)
        evidence = prepare_wedge_retry(
            symbols, self.selected, self.directory / 'prepared.omr', trigger)
        candidate_graph = archive(self.directory, 'candidate.omr', candidate_sheet())
        renumbered = score(include_target=True)
        for slur in renumbered.findall('.//slur'):
            slur.set('number', '9')
        self.assertTrue(accept_wedge_retry(
            score(), renumbered, self.selected, candidate_graph, evidence))
        renumbered.find("part/measure[@number='3']/note/notations/slur").set('type', 'start')
        self.assertFalse(accept_wedge_retry(
            score(), renumbered, self.selected, candidate_graph, evidence))

    def test_recovery_region_is_graph_derived_and_post_boundary_is_exact(self):
        trigger = detect_wedge_export_loss(score(), self.selected)
        constant = recovery_region_constant(self.selected, trigger)
        self.assertTrue(constant.startswith(
            'org.audiveris.omr.sheet.ledger.LedgersPostAnalysis.recoveryRegions='))
        self.assertIn('1,1,', constant)
        patch_text = (ROOT / 'omr-service/audiveris-patches/'
                      '0001-region-scoped-ledger-recovery.patch').read_text()
        self.assertIn('dD.isBlank()', patch_text)
        self.assertIn('"HEIGHT".equals(hH)', patch_text)
        self.assertIn('Math.floor(info.height) == maxHeight + 1', patch_text)
        self.assertIn('info.ledger.getGlyph() != null', patch_text)
        self.assertNotIn('minLedgerLengthLow=', constant)

    def test_recovery_region_missing_or_non_finite_numbers_fail_closed(self):
        trigger = detect_wedge_export_loss(score(), self.selected)
        mutations = {
            'missing-grade': lambda sheet: sheet.find(
                ".//head[@id='head-bad']").attrib.pop('grade'),
            'missing-pitch': lambda sheet: sheet.find(
                ".//head[@id='head-bad']").attrib.pop('pitch'),
            'missing-staff-y': lambda sheet: sheet.find(
                "page/system/part/staff/lines/line/point").attrib.pop('y'),
            'non-finite-grade': lambda sheet: sheet.find(
                ".//head[@id='head-bad']").set('grade', 'nan'),
            'non-finite-pitch': lambda sheet: sheet.find(
                ".//head[@id='head-bad']").set('pitch', 'inf'),
            'non-finite-staff-y': lambda sheet: sheet.find(
                "page/system/part/staff/lines/line/point").set('y', '-inf'),
        }
        for name, mutate in mutations.items():
            sheet = fixture_sheet('selected-sheet.xml')
            mutate(sheet)
            graph = archive(self.directory, f'{name}.omr', sheet)
            with self.subTest(name=name):
                self.assertIsNone(recovery_region_constant(graph, trigger))

    def test_ledger_profile_uses_engine_pixel_quantization_without_fuzzy_tolerance(self):
        profile = [(38 / 21.4375, 7 / 21.4375)]
        self.assertTrue(_ledger_geometry_in_profile(38, 7, 21.5, profile))
        self.assertFalse(_ledger_geometry_in_profile(37, 7, 21.5, profile))
        self.assertFalse(_ledger_geometry_in_profile(40, 7, 21.5, profile))
        self.assertFalse(_ledger_geometry_in_profile(38, 9, 21.5, profile))

    def test_tie_pair_endpoints_survive_corrected_onset_and_voice(self):
        old_anchor = (20, ('A', 0, 4), 1, '2', Fraction(11, 4), Fraction(1, 2), 0)
        new_anchor = (20, ('A', 0, 4), 1, '1', Fraction(5, 2), Fraction(1, 2), 0)
        original = Counter({('tie', 'start', old_anchor, ()): 1})
        candidate = Counter({('tie', 'start', new_anchor, ()): 1})
        self.assertTrue(_ties_preserved(original, candidate, {20, 21}))
        changed_pitch = (20, ('B', 0, 4), 1, '1', Fraction(5, 2), Fraction(1, 2), 0)
        self.assertFalse(_ties_preserved(
            original, Counter({('tie', 'start', changed_pitch, ()): 1}), {20, 21}))

    def test_direction_cursor_may_only_follow_the_same_native_chord(self):
        def timeline(first_duration, *, gap_after_direction=False):
            root = score()
            measure = root.find("part/measure[@number='1']")
            attributes = measure.find('attributes')
            for child in list(measure):
                if child is not attributes:
                    measure.remove(child)
            add_note(measure, 'C', 4, 1, first_duration / 2, voice='1')
            direction = ET.SubElement(measure, 'direction')
            direction_type = ET.SubElement(direction, 'direction-type')
            ET.SubElement(direction_type, 'wedge', type='diminuendo', spread='15')
            ET.SubElement(direction, 'staff').text = '1'
            if gap_after_direction:
                forward = ET.SubElement(measure, 'forward')
                ET.SubElement(forward, 'duration').text = '1'
            remaining = 8 - first_duration - (1 if gap_after_direction else 0)
            add_note(measure, 'D', 4, 1, remaining / 2, voice='1')
            return root

        original = timeline(2)
        corrected = timeline(1)
        self.assertTrue(_in_scope_context_preserved(original, corrected, 1))
        self.assertFalse(_in_scope_context_preserved(
            original, timeline(1, gap_after_direction=True), 1))

    def test_ordered_note_metadata_cannot_move_between_repeated_notes(self):
        original = score()
        measure = original.find("part/measure[@number='1']")
        first = measure.find('note')
        second = copy.deepcopy(first)
        measure.append(second)
        articulations = ET.SubElement(first.find('notations'), 'articulations')
        ET.SubElement(articulations, 'tenuto')
        candidate = copy.deepcopy(original)
        candidate_notes = candidate.findall("part/measure[@number='1']/note")
        candidate_notes[0].find('notations').remove(
            candidate_notes[0].find('notations/articulations'))
        moved = ET.SubElement(candidate_notes[1].find('notations'), 'articulations')
        ET.SubElement(moved, 'tenuto')
        self.assertNotEqual(_note_semantics(original, 1), _note_semantics(candidate, 1))

    def test_retained_native_love_triggers_and_controls_abstain(self):
        retained = ROOT / 'local-test-data' / 'results' / 'whole-note-integrity'
        cases = {
            'love': retained / 'wrapper-final-love/whole-note-retry-gsmt1hik/solo.mxl',
            'satie': retained / 'wrapper-satie/satie-gymnopedie-1.mxl',
            'goodsatie': retained / 'wrapper-satie-good/Premiere_Gymnopedie_300dpi.mxl',
            'always': retained / 'wrapper-always/Always_With_Me_2pages_300dpi.mxl',
        }
        if not all(path.is_file() and path.with_suffix('.omr').is_file()
                   for path in cases.values()):
            self.skipTest('retained native selected-result pairs are not present')
        self.assertEqual(
            detect_wedge_export_loss(
                read_musicxml(cases['love']), cases['love'].with_suffix('.omr')).measure_number,
            21,
        )
        love_trigger = detect_wedge_export_loss(
            read_musicxml(cases['love']), cases['love'].with_suffix('.omr'))
        region = recovery_region_constant(cases['love'].with_suffix('.omr'), love_trigger)
        encoded = region.split('=', 1)[1].split(';')
        self.assertEqual(len(encoded), 2)
        self.assertTrue(all(item.startswith('2,2,') for item in encoded))
        for name in ('satie', 'goodsatie', 'always'):
            with self.subTest(name=name):
                self.assertIsNone(detect_wedge_export_loss(
                    read_musicxml(cases[name]), cases[name].with_suffix('.omr')))

    def test_retained_native_symbols_select_both_source_defect_rests(self):
        selected = (ROOT / 'local-test-data/results/whole-note-integrity/'
                    'wrapper-final-love/whole-note-retry-gsmt1hik/solo.mxl')
        symbols = (ROOT / 'local-test-data/results/wedge-integrity/stage-probe-2026-09-06/'
                   'wedge-stage-331NZG/stage-SYMBOLS/solo.omr')
        if not selected.is_file() or not selected.with_suffix('.omr').is_file() or not symbols.is_file():
            self.skipTest('retained native SYMBOLS lineage is not present')
        trigger = detect_wedge_export_loss(read_musicxml(selected), selected.with_suffix('.omr'))
        evidence = prepare_wedge_retry(
            symbols, selected.with_suffix('.omr'), self.directory / 'native-prepared.omr', trigger)
        self.assertEqual(evidence.eligible_measure_numbers, (20, 21))
        self.assertEqual(len(evidence.rests), 2)

    def test_retained_post_boundary_native_candidate_is_accepted(self):
        directory = (ROOT / 'local-test-data/results/wedge-implementation-sol/native-postfix/'
                     'wedge-postfix-case-7PgBRB')
        paths = [directory / name for name in (
            'selected-love.mxl', 'selected-love.omr', 'symbols.omr',
            'love-page/love.mxl', 'love-page/love.omr')]
        if not all(path.is_file() for path in paths):
            self.skipTest('retained final post-boundary native candidate is not present')
        original_xml, original_graph, symbols, candidate_xml, candidate_graph = paths
        original = read_musicxml(original_xml)
        trigger = detect_wedge_export_loss(original, original_graph)
        evidence = prepare_wedge_retry(
            symbols, original_graph, self.directory / 'post-native-prepared.omr', trigger)
        self.assertTrue(accept_wedge_retry(
            original, read_musicxml(candidate_xml), original_graph, candidate_graph, evidence))


if __name__ == '__main__':
    unittest.main()
