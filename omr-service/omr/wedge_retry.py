"""Fail-closed native retry for an exported measure lost to a null-time wedge.

This module never manufactures MusicXML events or graph interpretations.  It
can protect a rest that Audiveris already classified at SYMBOLS, then validates
a separately generated PAGE candidate against the selected first result.  The
paired ledger constants are isolated candidate inputs under D-054; they are not
normal-pipeline settings and a candidate is accepted only when native graph and
source-image evidence proves the missing-ledger/false-dot chain was removed.
"""

from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
from io import BytesIO
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

from PIL import Image


_RECOVERY_REGIONS_KEY = (
    'org.audiveris.omr.sheet.ledger.LedgersPostAnalysis.recoveryRegions'
)

_MAX_ARCHIVE_ENTRIES = 64
_MAX_ARCHIVE_BYTES = 100_000_000
_MAX_XML_BYTES = 20_000_000
_MAX_MEASURES = 1_000
_INTER_TAGS = frozenset({
    'head', 'head-chord', 'rest', 'rest-chord', 'wedge',
    'augmentation-dot', 'ledger',
})
_MUSIC_LAYOUT_ATTRS = frozenset({
    'default-x', 'default-y', 'relative-x', 'relative-y', 'placement',
    'bezier-x', 'bezier-y', 'bezier-x2', 'bezier-y2', 'color',
    'font-family', 'font-size', 'font-style', 'font-weight',
})


@dataclass(frozen=True)
class WedgeTrigger:
    sheet_number: int
    system_index: int
    stack_index: int
    measure_number: int
    graph_measure_id: str
    missing_chords: tuple[str, ...]
    wedge_ids: tuple[str, ...]


@dataclass(frozen=True)
class RestEvidence:
    sheet_number: int
    system_index: int
    stack_index: int
    measure_number: int
    rest_id: str
    rest_chord_id: str
    shape: str
    staff_id: str
    bounds: tuple[int, int, int, int]


@dataclass(frozen=True)
class WedgeRetryEvidence:
    trigger: WedgeTrigger
    rests: tuple[RestEvidence, ...]
    eligible_measure_numbers: tuple[int, ...]

    @property
    def frozen_rest_ids(self):
        return tuple(item.rest_id for item in self.rests)


@dataclass
class _Graph:
    path: Path
    book: ET.Element
    sheets: list[ET.Element]
    sheet_names: list[str]
    raw_entries: dict[str, bytes]


@dataclass(frozen=True)
class _MeasureRef:
    number: int
    sheet_number: int
    system_index: int
    stack_index: int
    element: ET.Element
    stack: ET.Element
    system: ET.Element


def _integer(text, *, minimum=None, maximum=None):
    if text is None or not text or len(text) > 12 or not text.isascii():
        raise ValueError('invalid integer')
    if text[0] in '+-':
        digits = text[1:]
    else:
        digits = text
    if not digits or not digits.isdecimal():
        raise ValueError('invalid integer')
    value = int(text)
    if minimum is not None and value < minimum:
        raise ValueError('integer below bound')
    if maximum is not None and value > maximum:
        raise ValueError('integer above bound')
    return value


def _fraction(text, *, positive=False):
    if text is None or not re.fullmatch(
            r'[+-]?[0-9]{1,12}(?:/[0-9]{1,12}|\.[0-9]{1,12})?', text):
        raise ValueError('invalid rational')
    try:
        value = Fraction(text)
    except ZeroDivisionError:
        raise ValueError('zero denominator') from None
    if positive and value <= 0:
        raise ValueError('non-positive rational')
    return value


def _xml(data):
    if len(data) > _MAX_XML_BYTES or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('unsafe XML')
    return ET.fromstring(data)


def _read_graph(path: Path, *, required_step='PAGE'):
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if (len(infos) > _MAX_ARCHIVE_ENTRIES or len(names) != len(set(names))
                or sum(info.file_size for info in infos) > _MAX_ARCHIVE_BYTES
                or any(info.flag_bits & 1 for info in infos)
                or 'book.xml' not in names):
            raise ValueError('unsafe graph archive')
        raw = {name: archive.read(name) for name in names if not name.endswith('/')}
    book = _xml(raw['book.xml'])
    if book.get('software-version') != '5.11.0':
        raise ValueError('unsupported engine version')
    book_sheets = book.findall('sheet')
    logical_parts = book.findall('score/logical-part')
    if not 1 <= len(book_sheets) <= 2:
        raise ValueError('unsupported book structure')
    if required_step == 'PAGE':
        if len(logical_parts) != 1 or logical_parts[0].get('staff-count') != '2':
            raise ValueError('unsupported logical part')
    elif logical_parts and (len(logical_parts) != 1
                            or logical_parts[0].get('staff-count') != '2'):
        raise ValueError('ambiguous logical part')
    sheets, sheet_names = [], []
    for number, book_sheet in enumerate(book_sheets, 1):
        if book_sheet.get('number') != str(number):
            raise ValueError('ambiguous sheet numbers')
        steps = (book_sheet.findtext('steps') or '').split()
        if required_step not in steps:
            raise ValueError('incomplete graph')
        if required_step == 'SYMBOLS' and any(step in steps for step in ('LINKS', 'RHYTHMS', 'PAGE')):
            raise ValueError('symbols graph already reduced')
        book_pages = book_sheet.findall('page')
        if len(book_pages) != 1:
            raise ValueError('unsupported internal pages')
        name = f'sheet#{number}/sheet#{number}.xml'
        image = f'sheet#{number}/BINARY.png'
        if name not in raw or image not in raw:
            raise ValueError('missing graph evidence')
        sheet = _xml(raw[name])
        pages = sheet.findall('page')
        if len(pages) != 1:
            raise ValueError('unsupported graph pages')
        systems = pages[0].findall('system')
        if not systems or len(systems) != len(book_pages[0].findall('system')):
            raise ValueError('book/sheet system mismatch')
        relevant_ids = [element.get('id') for element in sheet.iter()
                        if element.tag in _INTER_TAGS and element.get('id')]
        if len(relevant_ids) != len(set(relevant_ids)):
            raise ValueError('duplicate inter IDs')
        sheets.append(sheet)
        sheet_names.append(name)
    return _Graph(Path(path), book, sheets, sheet_names, raw)


def _measure_refs(graph: _Graph):
    refs, number = [], 0
    for sheet_number, (book_sheet, sheet) in enumerate(
            zip(graph.book.findall('sheet'), graph.sheets), 1):
        book_page = book_sheet.find('page')
        if sheet_number == 1:
            if book_page.get('movement-start') != 'true':
                raise ValueError('first page must start movement')
        elif book_page.get('movement-start') is not None:
            raise ValueError('multiple movements unsupported')
        for system_index, system in enumerate(sheet.findall('page/system'), 1):
            parts = system.findall('part')
            stacks = system.findall('stack')
            if len(parts) != 1 or not stacks:
                raise ValueError('unsupported system')
            staves = parts[0].findall('staff')
            measures = parts[0].findall('measure')
            if len(staves) != 2 or len(measures) != len(stacks):
                raise ValueError('stack/measure mismatch')
            for staff in staves:
                if not staff.get('id') or len(staff.findall('lines/line')) != 5:
                    raise ValueError('unsupported staff')
            for stack_index, (stack, measure) in enumerate(zip(stacks, measures), 1):
                number += 1
                if not measure.get('id') or not stack.get('id'):
                    raise ValueError('missing graph identity')
                refs.append(_MeasureRef(number, sheet_number, system_index, stack_index,
                                        measure, stack, system))
    if not refs or len(refs) > _MAX_MEASURES:
        raise ValueError('unsupported measure count')
    return refs


def _score_measure_numbers(root):
    if root.tag != 'score-partwise' or len(root.findall('part')) != 1:
        raise ValueError('unsupported score')
    measures = root.findall('part/measure')
    if not measures or len(measures) > _MAX_MEASURES:
        raise ValueError('unsupported score length')
    numbers = [_integer(measure.get('number'), minimum=1, maximum=100_000)
               for measure in measures]
    if numbers != sorted(set(numbers)):
        raise ValueError('ambiguous score numbering')
    return numbers


def _uniform_four_four(root):
    if root.tag != 'score-partwise' or len(root.findall('part')) != 1:
        return False
    measures = root.findall('part/measure')
    if not measures or measures[0].find('attributes/time') is None:
        return False
    times = root.findall('.//attributes/time')
    return bool(times) and all(
        time.find('senza-misura') is None
        and len(time.findall('beats')) == 1
        and len(time.findall('beat-type')) == 1
        and time.findtext('beats') == '4'
        and time.findtext('beat-type') == '4'
        for time in times
    )


def _voiced(measure):
    result = set()
    for voice in measure.findall('voice'):
        if voice.get('measure-rest-chord'):
            result.add(voice.get('measure-rest-chord'))
        result.update(value.get('chord') for value in voice.iter('value')
                      if value.get('status') == 'BEGIN' and value.get('chord'))
    return result


def detect_wedge_export_loss(root, graph_path: Path):
    """Return the sole namespaced null-time-wedge export-loss trigger."""
    try:
        if not _uniform_four_four(root):
            return None
        numbers = _score_measure_numbers(root)
        graph = _read_graph(Path(graph_path))
        refs = _measure_refs(graph)
        if numbers[0] != 1 or numbers[-1] != len(refs):
            return None
        missing = sorted(set(range(1, len(refs) + 1)) - set(numbers))
        if len(missing) != 1:
            return None
        ref = refs[missing[0] - 1]
        sheet = graph.sheets[ref.sheet_number - 1]
        inters = {element.get('id'): element for element in sheet.iter()
                  if element.tag in _INTER_TAGS and element.get('id')}
        measure_chords = set((ref.element.findtext('head-chords') or '').split())
        measure_chords.update((ref.element.findtext('rest-chords') or '').split())
        unvoiced = measure_chords - _voiced(ref.element)
        if not unvoiced or ref.element.get('abnormal') != 'true':
            return None
        by_wedge = {}
        for relation in sheet.iter('relation'):
            link = relation.find('chord-wedge')
            if link is None or relation.get('source') not in unvoiced:
                continue
            wedge = relation.get('target')
            if wedge not in inters or inters[wedge].tag != 'wedge':
                return None
            by_wedge.setdefault(wedge, set()).add(link.get('side'))
        wedges = sorted(wedge for wedge, sides in by_wedge.items()
                        if sides == {'LEFT', 'RIGHT'})
        if len(wedges) != 1:
            return None
        wedge_chords = sorted(relation.get('source') for relation in sheet.iter('relation')
                              if relation.get('target') == wedges[0]
                              and relation.find('chord-wedge') is not None)
        if not wedge_chords or any(chord not in unvoiced for chord in wedge_chords):
            return None
        return WedgeTrigger(ref.sheet_number, ref.system_index, ref.stack_index,
                            ref.number, ref.element.get('id'), tuple(wedge_chords),
                            tuple(wedges))
    except (ET.ParseError, OSError, ValueError, KeyError, RecursionError,
            zipfile.BadZipFile):
        return None


def _bounds(element):
    box = element.find('bounds')
    if box is None:
        raise ValueError('missing bounds')
    return tuple(_integer(box.get(key), minimum=0, maximum=1_000_000)
                 for key in ('x', 'y', 'w', 'h'))


def _overlap(left, right):
    ax, ay, aw, ah = left
    bx, by, bw, bh = right
    return max(0, min(ax + aw, bx + bw) - max(ax, bx)) * max(
        0, min(ay + ah, by + bh) - max(ay, by))


def _staff_interlines(system):
    result = {}
    for staff in system.findall('part/staff'):
        ordinates = []
        for line in staff.findall('lines/line'):
            points = line.findall('point')
            if len(points) < 1:
                raise ValueError('missing staff points')
            ordinates.append(sum(float(point.get('y')) for point in points) / len(points))
        gaps = [right - left for left, right in zip(ordinates, ordinates[1:])]
        if len(gaps) != 4 or min(gaps) <= 0:
            raise ValueError('invalid staff geometry')
        result[staff.get('id')] = sum(gaps) / len(gaps)
    return result


def _line_y(staff, *, below, x):
    lines = staff.findall('lines/line')
    line = lines[-1] if below else lines[0]
    points = line.findall('point')
    if not points:
        raise ValueError('missing staff line geometry')
    if len(points) == 1:
        return float(points[0].get('y'))
    left, right = points[0], points[-1]
    x1, x2 = float(left.get('x')), float(right.get('x'))
    y1, y2 = float(left.get('y')), float(right.get('y'))
    return y1 if x1 == x2 else y1 + ((x - x1) * (y2 - y1) / (x2 - x1))


def _rest_profiles(sheet):
    profiles = {}
    systems = sheet.findall('page/system')
    for system in systems:
        interlines = _staff_interlines(system)
        for rest in system.iter('rest'):
            shape, staff = rest.get('shape'), rest.get('staff')
            if not shape or staff not in interlines or rest.get('frozen') == 'true':
                continue
            x, y, width, height = _bounds(rest)
            pitch = float(rest.get('pitch'))
            profiles.setdefault(shape, []).append(
                (width / interlines[staff], height / interlines[staff], pitch))
    return profiles


def _inside_profile(rest, interline, profile):
    if not profile:
        return False
    _, _, width, height = _bounds(rest)
    values = (width / interline, height / interline, float(rest.get('pitch')))
    return all(min(row[index] for row in profile) <= values[index]
               <= max(row[index] for row in profile) for index in range(3))


def _freeze_raw(raw: bytes, entries):
    text = raw.decode('utf-8')
    for tag, identifier in entries:
        pattern = re.compile(r'(<%s\b[^>]*?)( id="%s")'
                             % (re.escape(tag), re.escape(identifier)))
        text, count = pattern.subn(r'\1 frozen="true"\2', text, count=1)
        if count != 1:
            raise ValueError('inter is not uniquely serializable')
    return text.encode('utf-8')


def _copy_graph(source: Path, target: Path, changed_name: str, changed: bytes):
    _copy_graph_entries(source, target, {changed_name: changed})


def _copy_graph_entries(source: Path, target: Path, changes):
    with zipfile.ZipFile(source) as archive, zipfile.ZipFile(target, 'x') as output:
        for info in archive.infolist():
            data = b'' if info.filename.endswith('/') else archive.read(info.filename)
            if info.filename in changes:
                data = changes[info.filename]
            clone = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            clone.compress_type = info.compress_type
            clone.external_attr = info.external_attr
            clone.flag_bits = info.flag_bits & ~1
            output.writestr(clone, data)


def _defect_pair(graph, ref):
    sheet = graph.sheets[ref.sheet_number - 1]
    inters = {element.get('id'): element for element in sheet.iter()
              if element.tag in _INTER_TAGS and element.get('id')}
    heads = _graph_measure_heads(ref, sheet)
    pairs = []
    for relation in sheet.iter('relation'):
        if relation.find('augmentation') is None:
            continue
        dot, head = inters.get(relation.get('source')), inters.get(relation.get('target'))
        if head in heads and dot is not None and dot.tag == 'augmentation-dot':
            pairs.append((head, dot))
    if len(pairs) != 1 or not _source_ledger_signature(graph, ref, *pairs[0]):
        raise ValueError('measure lacks one source-backed ledger defect')
    return pairs[0]


def prepare_wedge_retry(symbols_graph: Path, selected_graph: Path, target_graph: Path,
                        trigger: WedgeTrigger | None):
    """Protect the sole source-profiled SYMBOLS rest in the trigger stack."""
    try:
        if trigger is None:
            return None
        symbols = _read_graph(Path(symbols_graph), required_step='SYMBOLS')
        selected = _read_graph(Path(selected_graph))
        symbol_refs, selected_refs = _measure_refs(symbols), _measure_refs(selected)
        if len(symbol_refs) != len(selected_refs):
            return None
        eligible_refs = _baseline_ledger_defects(selected, trigger)
        eligible_numbers = tuple(ref.number for ref in eligible_refs)
        if trigger.measure_number not in eligible_numbers:
            return None
        symbol_sheet = symbols.sheets[trigger.sheet_number - 1]
        selected_sheet = selected.sheets[trigger.sheet_number - 1]
        profiles = _rest_profiles(selected_sheet)
        symbol_rests = list(symbol_sheet.iter('rest'))
        selected_rests = list(selected_sheet.iter('rest'))
        candidates = []
        for eligible_ref in eligible_refs:
            symbol_ref = symbol_refs[eligible_ref.number - 1]
            interlines = _staff_interlines(symbol_ref.system)
            left = _integer(symbol_ref.stack.get('left'), minimum=0)
            right = _integer(symbol_ref.stack.get('right'), minimum=left + 1)
            local = []
            for rest in symbol_ref.system.iter('rest'):
                box = _bounds(rest)
                x, _, width, _ = box
                staff, shape = rest.get('staff'), rest.get('shape')
                if (x + width <= left or x >= right or staff not in interlines
                        or not shape or rest.get('frozen') == 'true'
                        or not _inside_profile(rest, interlines[staff], profiles.get(shape, []))):
                    continue
                if any(other is not rest and _overlap(box, _bounds(other))
                       for other in symbol_rests):
                    continue
                if any(other.get('shape') == shape and other.get('staff') == staff
                       and _overlap(box, _bounds(other)) for other in selected_rests):
                    continue
                owners = [relation.get('source') for relation in symbol_sheet.iter('relation')
                          if relation.get('target') == rest.get('id')
                          and relation.find('containment') is not None]
                owner_nodes = [element for element in symbol_sheet.iter('rest-chord')
                               if element.get('id') in owners]
                if (len(owners) != 1 or len(owner_nodes) != 1
                        or owner_nodes[0].get('frozen') == 'true'):
                    continue
                local.append((rest, owner_nodes[0], symbol_ref))
            if len(local) != 1:
                return None
            candidates.extend(local)
        entry_name = symbols.sheet_names[trigger.sheet_number - 1]
        entries = tuple(item for rest, owner, _ in candidates
                        for item in (('rest', rest.get('id')), ('rest-chord', owner.get('id'))))
        if len({identifier for _, identifier in entries}) != len(entries):
            return None
        changed = _freeze_raw(symbols.raw_entries[entry_name], entries)
        _copy_graph(Path(symbols_graph), Path(target_graph), entry_name, changed)
        rest_evidence = tuple(RestEvidence(
            ref.sheet_number, ref.system_index, ref.stack_index, ref.number,
            rest.get('id'), owner.get('id'), rest.get('shape'),
            rest.get('staff'), _bounds(rest)) for rest, owner, ref in candidates)
        return WedgeRetryEvidence(trigger, rest_evidence, eligible_numbers)
    except (ET.ParseError, OSError, ValueError, KeyError, RecursionError,
            zipfile.BadZipFile):
        return None


def _normal_signature(element):
    attributes = tuple(sorted((key, value) for key, value in element.attrib.items()
                              if not (element.tag == 'slur' and key == 'number')))
    return (element.tag, attributes, (element.text or '').strip(),
            tuple(_normal_signature(child) for child in element if child.tag != 'slur'))


def _music_signature(element, divisions=None):
    attributes = tuple(sorted((key, value) for key, value in element.attrib.items()
                              if key not in _MUSIC_LAYOUT_ATTRS
                              and not (element.tag == 'slur' and key == 'number')))
    transient_text = (element.tag in ('source', 'encoding-date')
                      or (element.tag == 'miscellaneous-field'
                          and element.get('name') == 'source-file'))
    text = '' if transient_text else (element.text or '').strip()
    if element.tag in ('duration', 'offset') and divisions is not None and text:
        text = str(_fraction(text) / divisions)
    return (element.tag, attributes, text,
            tuple(_music_signature(child, divisions) for child in element
                  if child.tag != 'slur'))


def _score_state(root):
    numbers = _score_measure_numbers(root)
    measures = {}
    divisions = Fraction(1)
    slur_markers = []
    ties = Counter()
    for measure in root.findall('part/measure'):
        number = _integer(measure.get('number'), minimum=1)
        cursor = previous = Fraction(0)
        pitched = Counter()
        rests = Counter()
        length = Fraction(0)
        occurrence = Counter()
        pitched_staff_occurrence = Counter()
        for item in measure:
            if item.tag == 'attributes' and item.findtext('divisions') is not None:
                divisions = _fraction(item.findtext('divisions'), positive=True)
            elif item.tag in ('backup', 'forward'):
                duration = _fraction(item.findtext('duration'), positive=True) / divisions
                cursor += -duration if item.tag == 'backup' else duration
                if cursor < 0:
                    raise ValueError('negative cursor')
                length = max(length, cursor)
            elif item.tag == 'note':
                if item.find('grace') is not None:
                    raise ValueError('unsupported grace')
                duration = _fraction(item.findtext('duration'), positive=True) / divisions
                onset = previous if item.find('chord') is not None else cursor
                pitch = item.find('pitch')
                rest = item.find('rest') is not None
                if (pitch is None) == (not rest):
                    raise ValueError('invalid note kind')
                if pitch is None:
                    pitch_key = ('rest',)
                else:
                    pitch_key = (pitch.findtext('step'),
                                 _integer(pitch.findtext('alter', '0'), minimum=-2, maximum=2),
                                 _integer(pitch.findtext('octave'), minimum=-1, maximum=9))
                staff = _integer(item.findtext('staff', '1'), minimum=1, maximum=2)
                voice = item.findtext('voice')
                anchor_base = (number, pitch_key, staff, voice, onset, duration)
                ordinal = occurrence[anchor_base]
                occurrence[anchor_base] += 1
                pitched_index = pitched_staff_occurrence[staff] if pitch is not None else -1
                if pitch is not None:
                    pitched_staff_occurrence[staff] += 1
                anchor = anchor_base + (ordinal, pitched_index)
                if pitch is not None:
                    pitched[(pitch_key, staff, onset, duration, voice)] += 1
                else:
                    rests[(staff, onset, duration, voice,
                           (item.findtext('type') or '').strip())] += 1
                for slur in item.findall('notations/slur'):
                    if slur.get('type') not in ('start', 'stop', 'continue') or not slur.get('number'):
                        raise ValueError('unsupported slur')
                    slur_markers.append((slur.get('number'), slur.get('type'), anchor))
                for kind, marker in (
                        [('tie', item_marker) for item_marker in item.findall('tie')]
                        + [('tied', item_marker) for item_marker in item.findall('notations/tied')]):
                    if marker.get('type') not in ('start', 'stop'):
                        raise ValueError('unsupported tie')
                    details = tuple(sorted((key, value) for key, value in marker.attrib.items()
                                           if key != 'type'))
                    ties[(kind, marker.get('type'), anchor, details)] += 1
                length = max(length, onset + duration)
                if item.find('chord') is None:
                    previous = onset
                    cursor += duration
        measures[number] = (_music_signature(measure), pitched, length, rests)
    open_slurs, pairs = {}, Counter()
    for identifier, kind, anchor in slur_markers:
        if kind == 'start':
            if identifier in open_slurs:
                pairs[(open_slurs.pop(identifier), None)] += 1
            open_slurs[identifier] = anchor
        elif kind == 'continue':
            # Audiveris emits paired continuation markers at system boundaries.
            # They carry geometry, not a new musical endpoint.
            continue
        else:
            if identifier not in open_slurs:
                pairs[(None, anchor)] += 1
            else:
                start = open_slurs.pop(identifier)
                pairs[(start, anchor)] += 1
    for start in open_slurs.values():
        pairs[(start, None)] += 1
    return numbers, measures, pairs, ties


def _slurs_preserved(original, candidate, scope):
    def endpoint(anchor):
        if anchor is None or anchor[0] not in scope:
            return anchor
        return anchor[0], anchor[2], anchor[-1]

    def project(pairs):
        result = Counter()
        for (start, stop), count in pairs.items():
            result[(endpoint(start), endpoint(stop))] += count
        return result

    original, candidate = project(original), project(candidate)
    remaining = candidate.copy()
    unresolved = []
    for pair, count in original.items():
        matched = min(count, remaining[pair])
        remaining[pair] -= matched
        unresolved.extend([pair] * (count - matched))
    for start, stop in unresolved:
        endpoint = start if start is not None else stop
        if endpoint is None:
            return False
        replacements = [pair for pair, count in remaining.items() if count
                        and endpoint in pair
                        and any(item is not None and item[0] in scope for item in pair)]
        if len(replacements) != 1:
            return False
        remaining[replacements[0]] -= 1
    return all(not count or any(item is not None and item[0] in scope for item in pair)
               for pair, count in remaining.items())


def _ties_preserved(original, candidate, scope):
    def project(markers):
        result = Counter()
        for (kind, marker_type, anchor, details), count in markers.items():
            endpoint = ((anchor[0], anchor[1], anchor[2], anchor[-1])
                        if anchor[0] in scope else anchor)
            result[(kind, marker_type, endpoint, details)] += count
        return result

    original_projected, candidate_projected = project(original), project(candidate)
    if original_projected - candidate_projected:
        return False
    return all(not count or marker[2][0] in scope
               for marker, count in (candidate_projected - original_projected).items())


def _graph_measure_heads(ref, sheet):
    chord_ids = set((ref.element.findtext('head-chords') or '').split())
    head_ids = {relation.get('target') for relation in sheet.iter('relation')
                if relation.get('source') in chord_ids
                and relation.find('containment') is not None}
    return [element for element in sheet.iter('head') if element.get('id') in head_ids]


def _key_alters(root, target):
    fifths = 0
    for measure in root.findall('part/measure'):
        number = _integer(measure.get('number'), minimum=1)
        if number > target:
            break
        value = measure.findtext('attributes/key/fifths')
        if value is not None:
            fifths = _integer(value, minimum=-7, maximum=7)
    result = {step: 0 for step in 'CDEFGAB'}
    order = 'FCGDAEB' if fifths >= 0 else 'BEADGCF'
    for step in order[:abs(fifths)]:
        result[step] = 1 if fifths >= 0 else -1
    return result


def _head_pitch(head, clef_shape):
    value = float(head.get('pitch'))
    pitch = round(value)
    if abs(value - pitch) > 0.01:
        raise ValueError('non-integral head pitch')
    if clef_shape == 'G_CLEF':
        ordinal = 4 * 7 + 6  # B4 on the middle line.
    elif clef_shape == 'F_CLEF':
        ordinal = 3 * 7 + 1  # D3 on the middle line.
    else:
        raise ValueError('unsupported clef')
    ordinal -= pitch
    octave, index = divmod(ordinal, 7)
    return 'CDEFGAB'[index], octave


def _graph_pitched_events(ref, sheet, key_alters):
    stack_slots = {slot.get('id'): _fraction(slot.get('time-offset')) * 4
                   for slot in ref.stack.findall('slot')}
    stack_duration = _fraction(ref.stack.get('duration'), positive=True) * 4
    if not stack_slots or min(stack_slots.values()) != 0:
        raise ValueError('unsupported stack slots')
    system_inters = {element.get('id'): element for element in ref.system.iter()
                     if element.tag in _INTER_TAGS.union({'clef'}) and element.get('id')}
    chord_heads = {}
    for relation in ref.system.iter('relation'):
        if relation.find('containment') is None:
            continue
        chord, head = system_inters.get(relation.get('source')), system_inters.get(relation.get('target'))
        if chord is not None and chord.tag == 'head-chord' and head is not None and head.tag == 'head':
            chord_heads.setdefault(chord.get('id'), []).append(head)
    staff_numbers, clefs = {}, {}
    for number, staff in enumerate(ref.system.findall('part/staff'), 1):
        staff_id = staff.get('id')
        clef_id = staff.findtext('header/clef')
        clef = system_inters.get(clef_id)
        if clef is None or clef.tag != 'clef':
            raise ValueError('missing staff clef')
        staff_numbers[staff_id] = number
        clefs[staff_id] = clef.get('shape')
    events = Counter()
    for voice in ref.element.findall('voice'):
        beginnings = []
        for entry in voice.findall('slots/entry'):
            value = entry.find('value')
            if value is None or value.get('status') != 'BEGIN':
                continue
            slot = entry.findtext('key')
            chord = value.get('chord')
            if slot not in stack_slots or not chord:
                raise ValueError('invalid voice slot')
            beginnings.append((stack_slots[slot], chord))
        beginnings.sort()
        for onset, chord in beginnings:
            for head in chord_heads.get(chord, []):
                staff_id = head.get('staff')
                step, octave = _head_pitch(head, clefs.get(staff_id))
                pitch = (step, key_alters[step], octave)
                events[(pitch, staff_numbers[staff_id], onset, voice.get('id'))] += 1
    return events, frozenset(stack_slots.values()) | {stack_duration}


def _xml_matches_graph(measure_state, root, number, ref, sheet):
    graph_events, graph_boundaries = _graph_pitched_events(
        ref, sheet, _key_alters(root, number))
    xml_events = Counter()
    for (pitch, staff, onset, duration, voice), count in measure_state[1].items():
        if onset + duration not in graph_boundaries:
            return False
        xml_events[(pitch, staff, onset, voice)] += count
    return xml_events == graph_events


def _measure_context(root, number):
    divisions = Fraction(1)
    for measure in root.findall('part/measure'):
        current = _integer(measure.get('number'), minimum=1)
        contexts = []
        cursor = Fraction(0)
        for child in measure:
            if child.tag == 'attributes':
                value = child.findtext('divisions')
                if value is not None:
                    divisions = _fraction(value, positive=True)
                contexts.append((
                    'attributes',
                    tuple(_music_signature(item, divisions) for item in child
                          if item.tag != 'divisions'),
                ))
            elif child.tag in ('backup', 'forward'):
                duration = _fraction(child.findtext('duration'), positive=True) / divisions
                cursor += -duration if child.tag == 'backup' else duration
            elif child.tag == 'note':
                if child.find('chord') is None:
                    cursor += _fraction(child.findtext('duration'), positive=True) / divisions
            else:
                contexts.append((child.tag, cursor, _music_signature(child, divisions)))
        if current == number:
            return tuple(contexts)
    raise ValueError('missing measure context')


def _note_semantics(root, number):
    divisions = Fraction(1)
    for measure in root.findall('part/measure'):
        current = _integer(measure.get('number'), minimum=1)
        notes = []
        for child in measure:
            if child.tag == 'attributes' and child.findtext('divisions') is not None:
                divisions = _fraction(child.findtext('divisions'), positive=True)
            elif child.tag == 'note':
                notes.append(_music_signature(child, divisions))
        if current == number:
            return tuple(notes)
    raise ValueError('missing note semantics')


def _score_header(root):
    return tuple(_music_signature(child) for child in root if child.tag != 'part')


def _pitched_onsets(root, number):
    divisions = Fraction(1)
    for measure in root.findall('part/measure'):
        current = _integer(measure.get('number'), minimum=1)
        cursor = previous = Fraction(0)
        staff_ordinals = Counter()
        result = {}
        for child in measure:
            if child.tag == 'attributes' and child.findtext('divisions') is not None:
                divisions = _fraction(child.findtext('divisions'), positive=True)
            elif child.tag in ('backup', 'forward'):
                duration = _fraction(child.findtext('duration'), positive=True) / divisions
                cursor += -duration if child.tag == 'backup' else duration
            elif child.tag == 'note':
                duration = _fraction(child.findtext('duration'), positive=True) / divisions
                onset = previous if child.find('chord') is not None else cursor
                pitch = child.find('pitch')
                staff = _integer(child.findtext('staff', '1'), minimum=1, maximum=2)
                if pitch is not None:
                    pitch_key = (pitch.findtext('step'),
                                 _integer(pitch.findtext('alter', '0'), minimum=-2, maximum=2),
                                 _integer(pitch.findtext('octave'), minimum=-1, maximum=9))
                    ordinal = staff_ordinals[staff]
                    staff_ordinals[staff] += 1
                    result.setdefault((staff, onset), set()).add((ordinal, pitch_key))
                if child.find('chord') is None:
                    previous = onset
                    cursor += duration
        if current == number:
            return result
    raise ValueError('missing pitched timeline')


def _direction_staff(signature):
    for child in signature[3]:
        if child[0] == 'staff':
            return _integer(child[2], minimum=1, maximum=2)
    return 1


def _in_scope_context_preserved(original_root, candidate_root, number):
    original = _measure_context(original_root, number)
    candidate = _measure_context(candidate_root, number)
    original_other = tuple(item for item in original if item[0] != 'direction')
    candidate_other = tuple(item for item in candidate if item[0] != 'direction')
    if original_other != candidate_other:
        return False
    original_directions = [item for item in original if item[0] == 'direction']
    candidate_directions = [item for item in candidate if item[0] == 'direction']
    if len(original_directions) != len(candidate_directions):
        return False
    original_onsets = _pitched_onsets(original_root, number)
    candidate_onsets = _pitched_onsets(candidate_root, number)
    for old, new in zip(original_directions, candidate_directions):
        if old[2] != new[2]:
            return False
        if old[1] == new[1]:
            continue
        staff = _direction_staff(old[2])
        old_anchor = original_onsets.get((staff, old[1]))
        new_anchor = candidate_onsets.get((staff, new[1]))
        if not old_anchor or old_anchor != new_anchor:
            return False
    return True


def _glyph_has_ink(sheet, glyph_id, expected_bounds):
    matches = [glyph for glyph in sheet.iter('glyph') if glyph.get('id') == glyph_id]
    if len(matches) != 1:
        return False
    glyph = matches[0]
    x, y, width, height = expected_bounds
    if (glyph.get('left') != str(x) or glyph.get('top') != str(y)):
        return False
    table = glyph.find('run-table')
    if table is None or table.get('orientation') not in ('VERTICAL', 'HORIZONTAL'):
        return False
    if (_integer(table.get('width'), minimum=1, maximum=4096) != width
            or _integer(table.get('height'), minimum=1, maximum=4096) != height):
        return False
    vertical = table.get('orientation') == 'VERTICAL'
    sequences = table.findall('runs')
    if len(sequences) != (width if vertical else height):
        return False
    limit, foreground = (height if vertical else width), 0
    for sequence in sequences:
        values = (sequence.text or '').split()
        if not values:
            return False
        position = 0
        for index, value in enumerate(values):
            length = _integer(value, minimum=0, maximum=limit)
            position += length
            if position > limit:
                return False
            if index % 2 == 0:
                foreground += length
    return foreground > 0


def _source_has_ledger(image_bytes, ledger_box):
    x, y, width, height = ledger_box
    if width <= 0 or height <= 0:
        return False
    with Image.open(BytesIO(image_bytes)) as image:
        gray = image.convert('L')
        if x + width > gray.width or y + height > gray.height:
            return False
        best = 0
        for row in range(y, y + height):
            foreground = sum(1 for column in range(x, x + width)
                             if gray.getpixel((column, row)) < 128)
            best = max(best, foreground)
    return best * 4 >= width * 3


def _ledger_contexts(sheet):
    contexts = {}
    for system in sheet.findall('page/system'):
        interlines = _staff_interlines(system)
        for staff in system.findall('part/staff'):
            staff_id = staff.get('id')
            for entry in staff.findall('ledgers/ledgers-entry'):
                index = _integer(entry.get('index'), minimum=-100, maximum=100)
                if index == 0:
                    raise ValueError('invalid ledger index')
                for identifier in (entry.text or '').split():
                    if identifier in contexts:
                        raise ValueError('ledger appears in multiple staff indexes')
                    contexts[identifier] = (index, interlines[staff_id])
    return contexts


def _ledger_profiles(sheet):
    contexts = _ledger_contexts(sheet)
    ledgers = {ledger.get('id'): ledger for ledger in sheet.iter('ledger')}
    profiles = {}
    for identifier, (index, interline) in contexts.items():
        ledger = ledgers.get(identifier)
        if ledger is None:
            continue
        _, _, width, height = _bounds(ledger)
        profiles.setdefault(index, []).append((width / interline, height / interline))
    return profiles


def _ledger_geometry_in_profile(width, height, interline, profile):
    """Compare at the same integer-pixel quantization Audiveris uses."""
    if not profile:
        return False
    return (int(min(row[0] for row in profile) * interline) <= width
            <= math.ceil(max(row[0] for row in profile) * interline)
            and int(min(row[1] for row in profile) * interline) <= height
            <= math.ceil(max(row[1] for row in profile) * interline))


def _row_runs(gray, y, left, right):
    runs, start = [], None
    for x in range(left, right):
        foreground = gray.getpixel((x, y)) < 128
        if foreground and start is None:
            start = x
        elif not foreground and start is not None:
            runs.append((start, x))
            start = None
    if start is not None:
        runs.append((start, right))
    return runs


def _source_ledger_signature(graph, ref, head, dot):
    if ref.element.get('abnormal') != 'true':
        return False
    pitch_value = float(head.get('pitch'))
    pitch = round(pitch_value)
    if abs(pitch_value - pitch) > 0.01 or abs(pitch) < 5 or abs(pitch) % 2 != 1:
        return False
    normal_heads = set()
    sheet = graph.sheets[ref.sheet_number - 1]
    for other_ref in _measure_refs(graph):
        if other_ref.sheet_number == ref.sheet_number and other_ref.element.get('abnormal') != 'true':
            normal_heads.update(_graph_measure_heads(other_ref, sheet))
    other_grades = [float(item.get('grade')) for item in normal_heads
                    if item.get('grade') is not None]
    if not other_grades or float(head.get('grade')) >= min(other_grades):
        return False
    staff = next((staff for staff in ref.system.findall('part/staff')
                  if staff.get('id') == head.get('staff')), None)
    if staff is None:
        return False
    interline = _staff_interlines(ref.system)[staff.get('id')]
    index = (1 if pitch > 0 else -1) * ((abs(pitch) + 1 - 4) // 2)
    profiles = _ledger_profiles(graph.sheets[ref.sheet_number - 1]).get(index, [])
    if not profiles:
        return False
    defect_left = min(_bounds(head)[0], _bounds(dot)[0])
    defect_right = max(_bounds(head)[0] + _bounds(head)[2], _bounds(dot)[0] + _bounds(dot)[2])
    center_x = (defect_left + defect_right) / 2
    target_y = _line_y(staff, below=index > 0, x=center_x) + index * interline
    min_width = max(1, int(min(row[0] for row in profiles) * interline))
    max_width = math.ceil(max(row[0] for row in profiles) * interline)
    min_height = max(1, int(min(row[1] for row in profiles) * interline))
    max_height = math.ceil(max(row[1] for row in profiles) * interline)
    data = graph.raw_entries[f'sheet#{ref.sheet_number}/BINARY.png']
    with Image.open(BytesIO(data)) as image:
        gray = image.convert('L')
        margin = int(max_width)
        left = max(0, int(defect_left - margin))
        right = min(gray.width, int(defect_right + margin))
        top = max(0, int(target_y - max_height * 2))
        bottom = min(gray.height, int(target_y + max_height * 2) + 1)
        rows = []
        for y in range(top, bottom):
            matching = [run for run in _row_runs(gray, y, left, right)
                        if run[1] > defect_left and run[0] < defect_right
                        and min_width <= run[1] - run[0] <= max_width]
            if matching:
                rows.append((y, max(matching, key=lambda run: run[1] - run[0])))
        groups, current = [], []
        for row in rows:
            if current and row[0] != current[-1][0] + 1:
                groups.append(current)
                current = []
            current.append(row)
        if current:
            groups.append(current)
    matches = [group for group in groups if min_height <= len(group) <= max_height
               and group[0][0] - 1 <= target_y <= group[-1][0] + 1]
    if len(matches) != 1:
        return None
    group = matches[0]
    run_left = min(run[0] for _, run in group)
    run_right = max(run[1] for _, run in group)
    return run_left, group[0][0], run_right - run_left, len(group)


def _baseline_ledger_defects(graph, trigger):
    refs = _measure_refs(graph)
    sheet = graph.sheets[trigger.sheet_number - 1]
    inters = {element.get('id'): element for element in sheet.iter()
              if element.tag in _INTER_TAGS and element.get('id')}
    result = []
    for ref in refs:
        if (ref.sheet_number, ref.system_index) != (trigger.sheet_number, trigger.system_index):
            continue
        heads = _graph_measure_heads(ref, sheet)
        augmented = []
        for relation in sheet.iter('relation'):
            if relation.find('augmentation') is None:
                continue
            dot, head = inters.get(relation.get('source')), inters.get(relation.get('target'))
            if head in heads and dot is not None and dot.tag == 'augmentation-dot':
                augmented.append((head, dot))
        if len(augmented) == 1 and _source_ledger_signature(graph, ref, *augmented[0]):
            result.append(ref)
    return result


def recovery_region_constant(graph_path: Path, trigger: WedgeTrigger | None):
    """Encode graph/BINARY-derived regions for the patched native candidate."""
    try:
        if trigger is None:
            return None
        graph = _read_graph(Path(graph_path))
        regions = []
        defects = _baseline_ledger_defects(graph, trigger)
        for ref in defects:
            head, dot = _defect_pair(graph, ref)
            source_bounds = _source_ledger_signature(graph, ref, head, dot)
            if source_bounds is None:
                return None
            regions.append((ref.sheet_number, _integer(ref.system.get('id'), minimum=1),
                            *source_bounds))
        if trigger.measure_number not in {ref.number for ref in defects}:
            return None
        if not regions or len(regions) > 8:
            return None
        specification = ';'.join(','.join(str(value) for value in region)
                                 for region in sorted(regions))
        return f'{_RECOVERY_REGIONS_KEY}={specification}'
    except (ET.ParseError, OSError, ValueError, KeyError, RecursionError,
            zipfile.BadZipFile, StopIteration):
        return None


def _stable_graph_signature(element):
    attributes = tuple(sorted((key, value) for key, value in element.attrib.items()
                              if key not in ('id', 'glyph', 'grade', 'ctx-grade',
                                             'left-extension', 'right-extension')
                              and not (element.tag == 'relation'
                                       and key in ('source', 'target'))))
    return (element.tag, attributes, (element.text or '').strip(),
            tuple(_stable_graph_signature(child) for child in element
                  if child.tag != 'bounds'))


def _stable_glyph_signature(glyph, *, keep_position=False):
    attributes = tuple(sorted((key, value) for key, value in glyph.attrib.items()
                              if key != 'id'
                              and not (key == 'groups' and not keep_position)
                              and (keep_position or key not in ('left', 'top'))))
    return (glyph.tag, attributes, tuple(_stable_graph_signature(child) for child in glyph))


def _relation_signature(relation):
    return tuple((child.tag,
                  tuple(sorted((key, value) for key, value in child.attrib.items()
                               if key in ('side', 'cause', 'type'))),
                  (child.text or '').strip()) for child in relation)


def _stack_snapshot(ref, sheet):
    left = _integer(ref.stack.get('left'), minimum=0)
    right = _integer(ref.stack.get('right'), minimum=left + 1)
    items, vertices, local_ids = [], {}, set()
    glyphs = {glyph.get('id'): glyph for glyph in sheet.iter('glyph') if glyph.get('id')}
    inters = ref.system.find('sig/inters')
    if inters is None:
        raise ValueError('missing SIG inters')
    for element in inters:
        glyph = glyphs.get(element.get('glyph'))
        glyph_signature = _stable_glyph_signature(glyph) if glyph is not None else None
        descriptor = (_stable_graph_signature(element), glyph_signature)
        vertices[element.get('id')] = descriptor
        try:
            box = _bounds(element)
            if left <= box[0] + box[2] / 2 < right:
                local_ids.add(element.get('id'))
                items.append(('inter', descriptor))
        except ValueError:
            pass
    for relation in ref.system.iter('relation'):
        source, target = relation.get('source'), relation.get('target')
        if source not in local_ids and target not in local_ids:
            continue
        if source not in vertices or target not in vertices:
            raise ValueError('relation endpoint missing from live graph')
        items.append(('relation', vertices[source], vertices[target],
                      _relation_signature(relation)))
    free_ids = {identifier for group in ref.system.findall('free-glyphs')
                for identifier in (group.text or '').split()}
    interlines = _staff_interlines(ref.system)
    max_interline = max(interlines.values())
    staff_points = [float(point.get('y')) for staff in ref.system.findall('part/staff')
                    for point in staff.findall('lines/line/point')]
    if not staff_points:
        raise ValueError('system lacks vertical geometry')
    system_top = min(staff_points) - 4 * max_interline
    system_bottom = max(staff_points) + 4 * max_interline
    for identifier in free_ids:
        glyph = glyphs.get(identifier)
        if glyph is None:
            # Completed books can retain weak free IDs after their cache entry
            # is purged; stock repeat proves these are not live payloads.
            continue
        table = glyph.find('run-table')
        if table is None:
            raise ValueError('free glyph lacks ink')
        glyph_left = _integer(glyph.get('left'), minimum=0)
        glyph_top = _integer(glyph.get('top'), minimum=0)
        glyph_width = _integer(table.get('width'), minimum=1)
        glyph_height = _integer(table.get('height'), minimum=1)
        if (left <= glyph_left + glyph_width / 2 < right
                and system_top <= glyph_top + glyph_height / 2 < system_bottom):
            items.append(('free-glyph', _stable_glyph_signature(
                glyph, keep_position=True)))
    return Counter(items)


def _outside_graph_preserved(original, candidate, scope):
    original_refs, candidate_refs = _measure_refs(original), _measure_refs(candidate)
    if len(original_refs) != len(candidate_refs):
        return False
    for number in range(1, len(original.sheets) + 1):
        name = f'sheet#{number}/BINARY.png'
        if original.raw_entries[name] != candidate.raw_entries[name]:
            return False
    return all(_stack_snapshot(old, original.sheets[old.sheet_number - 1])
               == _stack_snapshot(new, candidate.sheets[new.sheet_number - 1])
               for old, new in zip(original_refs, candidate_refs)
               if old.number not in scope)


def _ledger_repair_proven(original: _Graph, candidate: _Graph,
                          old_ref: _MeasureRef, new_ref: _MeasureRef):
    if ((old_ref.sheet_number, old_ref.system_index, old_ref.stack_index)
            != (new_ref.sheet_number, new_ref.system_index, new_ref.stack_index)):
        return False
    old_sheet = original.sheets[old_ref.sheet_number - 1]
    new_sheet = candidate.sheets[new_ref.sheet_number - 1]
    old_heads = _graph_measure_heads(old_ref, old_sheet)
    new_heads = _graph_measure_heads(new_ref, new_sheet)
    if not old_heads or len(old_heads) != len(new_heads):
        return False
    old_inters = {element.get('id'): element for element in old_sheet.iter()
                  if element.tag in _INTER_TAGS and element.get('id')}
    augmented = []
    for relation in old_sheet.iter('relation'):
        if relation.find('augmentation') is None:
            continue
        dot, head = old_inters.get(relation.get('source')), old_inters.get(relation.get('target'))
        if head in old_heads and dot is not None and dot.tag == 'augmentation-dot':
            augmented.append((head, dot))
    if len(augmented) != 1:
        return False
    old_head, old_dot = augmented[0]
    staff_id = old_head.get('staff')
    old_contexts = _ledger_contexts(old_sheet)
    new_contexts = _ledger_contexts(new_sheet)
    old_ledgers = {ledger.get('id'): ledger for ledger in old_sheet.iter('ledger')}
    new_ledgers = [ledger for ledger in new_sheet.iter('ledger')
                   if ledger.get('staff') == staff_id and ledger.get('id') in new_contexts]
    candidates = []
    defect_box = _bounds(old_head)
    dot_box = _bounds(old_dot)
    for ledger in new_ledgers:
        box = _bounds(ledger)
        _, _, width, height = box
        index, new_interline = new_contexts[ledger.get('id')]
        profiles = []
        for identifier, (old_index, old_interline) in old_contexts.items():
            if old_index != index or identifier not in old_ledgers:
                continue
            _, _, old_width, old_height = _bounds(old_ledgers[identifier])
            profiles.append((old_width / old_interline, old_height / old_interline))
        if not profiles:
            continue
        if not _ledger_geometry_in_profile(width, height, new_interline, profiles):
            continue
        horizontal = max(0, min(box[0] + box[2], max(defect_box[0] + defect_box[2],
                                                     dot_box[0] + dot_box[2]))
                         - max(box[0], min(defect_box[0], dot_box[0])))
        if horizontal <= 0 or not _glyph_has_ink(new_sheet, ledger.get('glyph'), box):
            continue
        if not _source_has_ledger(original.raw_entries[
                f'sheet#{old_ref.sheet_number}/BINARY.png'], box):
            continue
        candidates.append(ledger)
    if len(candidates) != 1:
        return False
    ledger = candidates[0]
    matching_heads = [head for head in new_heads if head.get('staff') == staff_id
                      and _overlap(_bounds(head), _bounds(ledger))]
    if len(matching_heads) != 1:
        return False
    new_head = matching_heads[0]
    head_pairs, used = {}, set()
    for prior in old_heads:
        matches = [head for head in new_heads if head.get('staff') == prior.get('staff')
                   and _overlap(_bounds(prior), _bounds(head))]
        if len(matches) != 1 or matches[0].get('id') in used:
            return False
        used.add(matches[0].get('id'))
        head_pairs[prior.get('id')] = matches[0]
    if len(used) != len(new_heads) or head_pairs.get(old_head.get('id')) is not new_head:
        return False
    for prior in old_heads:
        current = head_pairs[prior.get('id')]
        if prior is old_head:
            if current.get('shape') != prior.get('shape'):
                return False
            continue
        prior_glyph = next((glyph for glyph in old_sheet.iter('glyph')
                            if glyph.get('id') == prior.get('glyph')), None)
        current_glyph = next((glyph for glyph in new_sheet.iter('glyph')
                              if glyph.get('id') == current.get('glyph')), None)
        if (current.get('shape') != prior.get('shape')
                or current.get('pitch') != prior.get('pitch')
                or _bounds(current) != _bounds(prior)
                or prior_glyph is None or current_glyph is None
                or _stable_glyph_signature(prior_glyph)
                != _stable_glyph_signature(current_glyph)):
            return False
    if (not _glyph_has_ink(new_sheet, new_head.get('glyph'), _bounds(new_head))
            or abs(_integer(new_head.get('pitch')) - _integer(old_head.get('pitch'))) != 1
            or new_head.get('abnormal') == 'true'):
        return False
    for relation in new_sheet.iter('relation'):
        if relation.find('augmentation') is not None:
            target = next((head for head in new_heads if head.get('id') == relation.get('target')), None)
            if target is not None and _overlap(_bounds(target), _bounds(ledger)):
                return False
    return True


def _rest_retained(candidate: _Graph, evidence: WedgeRetryEvidence):
    for item in evidence.rests:
        sheet = candidate.sheets[item.sheet_number - 1]
        rests = [rest for rest in sheet.iter('rest') if rest.get('shape') == item.shape
                 and rest.get('staff') == item.staff_id
                 and _overlap(_bounds(rest), item.bounds)]
        if (len(rests) != 1 or rests[0].get('frozen') != 'true'
                or not _glyph_has_ink(sheet, rests[0].get('glyph'), _bounds(rests[0]))):
            return False
        relations = [relation for relation in sheet.iter('relation')
                     if relation.get('target') == rests[0].get('id')
                     and relation.find('containment') is not None]
        if len(relations) != 1:
            return False
        owners = [node for node in sheet.iter('rest-chord')
                  if node.get('id') == relations[0].get('source')]
        if len(owners) != 1 or owners[0].get('frozen') != 'true':
            return False
        ref = _measure_refs(candidate)[item.measure_number - 1]
        if owners[0].get('id') not in (ref.element.findtext('rest-chords') or '').split():
            return False
    return True


def accept_wedge_retry(original_root, candidate_root, original_graph: Path,
                       candidate_graph: Path, evidence: WedgeRetryEvidence | None):
    """Accept only native, image-backed repair with strict untouched measures."""
    try:
        if evidence is None:
            return False
        if not _uniform_four_four(original_root) or not _uniform_four_four(candidate_root):
            return False
        original = _read_graph(Path(original_graph))
        candidate = _read_graph(Path(candidate_graph))
        old_numbers, old_measures, old_slurs, old_ties = _score_state(original_root)
        new_numbers, new_measures, new_slurs, new_ties = _score_state(candidate_root)
        if _score_header(original_root) != _score_header(candidate_root):
            return False
        target = evidence.trigger.measure_number
        old_refs, new_refs = _measure_refs(original), _measure_refs(candidate)
        if new_numbers != list(range(1, len(old_refs) + 1)):
            return False
        if old_numbers != [number for number in new_numbers if number != target]:
            return False
        eligible = set(evidence.eligible_measure_numbers)
        if target not in eligible:
            return False
        expected_rests = Counter(item.measure_number for item in evidence.rests)
        if set(expected_rests) != eligible:
            return False
        proven = {number for number in eligible if _ledger_repair_proven(
            original, candidate, old_refs[number - 1], new_refs[number - 1])}
        if (proven != eligible or not _slurs_preserved(old_slurs, new_slurs, proven)
                or not _ties_preserved(old_ties, new_ties, proven)):
            return False
        for number in old_numbers:
            if number not in proven:
                if (old_measures[number][1:] != new_measures[number][1:]
                        or _note_semantics(original_root, number)
                        != _note_semantics(candidate_root, number)
                        or _measure_context(original_root, number)
                        != _measure_context(candidate_root, number)):
                    return False
                continue
            if (not _in_scope_context_preserved(original_root, candidate_root, number)
                    or sum(old_measures[number][1].values()) != sum(new_measures[number][1].values())
                    or old_measures[number][3] - new_measures[number][3]
                    or sum((new_measures[number][3] - old_measures[number][3]).values())
                    != expected_rests[number]
                    or abs(new_measures[number][2] - 4) >= abs(old_measures[number][2] - 4)):
                return False
            ref = new_refs[number - 1]
            if not _xml_matches_graph(
                    new_measures[number], candidate_root, number, ref,
                    candidate.sheets[ref.sheet_number - 1]):
                return False
        if new_measures[target][2] != 4:
            return False
        if sum(new_measures[target][3].values()) != expected_rests[target]:
            return False
        target_ref = new_refs[target - 1]
        target_sheet = candidate.sheets[target_ref.sheet_number - 1]
        if target_ref.element.get('abnormal') == 'true':
            return False
        if not _xml_matches_graph(
                new_measures[target], candidate_root, target, target_ref, target_sheet):
            return False
        if detect_wedge_export_loss(candidate_root, candidate_graph) is not None:
            return False
        return (_outside_graph_preserved(original, candidate, proven)
                and _rest_retained(candidate, evidence)
                and target in proven)
    except (ET.ParseError, OSError, ValueError, KeyError, RecursionError,
            zipfile.BadZipFile):
        return False
