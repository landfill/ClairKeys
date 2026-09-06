"""Guarded Audiveris 5.11.0 Leland retry for missing whole notes (D-052).

The retry is an alternative recognition result, never an XML repair.  These
helpers deliberately abstain when the score or saved graph is outside the one
validated two-staff 4/4 piano shape.
"""

from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile


_MAX_ARCHIVE_ENTRIES = 64
_MAX_ARCHIVE_BYTES = 100_000_000
_MAX_XML_BYTES = 20_000_000
_MAX_MEASURES = 1_000
_MAX_MEASURE_CHILDREN = 10_000
_PAGE_STEPS = frozenset({'HEADS', 'RHYTHMS', 'PAGE'})
_PITCH_STEPS = frozenset({'C', 'D', 'E', 'F', 'G', 'A', 'B'})


@dataclass(frozen=True)
class _Event:
    measure: int
    kind: str
    pitch: tuple[str, int, int] | None
    staff: int
    onset: Fraction
    duration: Fraction
    note_type: str


@dataclass
class _Score:
    measures: list[int]
    events: Counter
    lengths: dict[int, Fraction]
    metadata: tuple
    ties: dict[str, Counter]
    tie_details: dict[str, Counter]


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
    # Native MusicXML uses small fixed-point values. Never let a short exponent
    # lexeme allocate an unbounded integer inside Fraction before we can abstain.
    if (text is None or not re.fullmatch(
            r'[+-]?[0-9]{1,12}(?:/[0-9]{1,12}|\.[0-9]{1,12})?', text)):
        raise ValueError('invalid rational')
    try:
        value = Fraction(text)
    except ZeroDivisionError:
        raise ValueError('zero rational denominator') from None
    if positive and value <= 0:
        raise ValueError('non-positive rational')
    return value


def _signature(element):
    return (
        element.tag,
        tuple(sorted(element.attrib.items())),
        (element.text or '').strip(),
        tuple(_signature(child) for child in element),
    )


def _uniform_four_four(root):
    if root.tag != 'score-partwise' or len(root.findall('part')) != 1:
        return False
    measures = root.findall('part/measure')
    if not measures or measures[0].find('attributes/time') is None:
        return False
    times = root.findall('.//attributes/time')
    if not times:
        return False
    return all(
        time.find('senza-misura') is None
        and len(time.findall('beats')) == 1
        and len(time.findall('beat-type')) == 1
        and time.findtext('beats') == '4'
        and time.findtext('beat-type') == '4'
        for time in times
    )


def _pitch(note):
    pitch = note.find('pitch')
    if pitch is None:
        return None
    step = pitch.findtext('step')
    if step not in _PITCH_STEPS:
        raise ValueError('invalid pitch step')
    octave = _integer(pitch.findtext('octave'), minimum=-1, maximum=9)
    alter = _integer(pitch.findtext('alter', '0'), minimum=-2, maximum=2)
    return step, alter, octave


def _scan_score(root):
    if root.tag != 'score-partwise':
        raise ValueError('unsupported root')
    parts = root.findall('part')
    if len(parts) != 1:
        raise ValueError('unsupported part count')
    part_measures = parts[0].findall('measure')
    if not part_measures or len(part_measures) > _MAX_MEASURES:
        raise ValueError('unsupported measure count')
    measures = []
    events = Counter()
    lengths = {}
    metadata = [('part-id', parts[0].get('id'))]
    ties = {'tie': Counter(), 'tied': Counter()}
    tie_details = {'tie': Counter(), 'tied': Counter()}
    divisions = Fraction(1)
    for measure in part_measures:
        if len(measure) > _MAX_MEASURE_CHILDREN:
            raise ValueError('oversized measure')
        number = _integer(measure.get('number'), minimum=1, maximum=100_000)
        if measures and number <= measures[-1]:
            raise ValueError('measure numbers must increase uniquely')
        measures.append(number)
        cursor = end = previous_onset = Fraction(0)
        for item in measure:
            if item.tag == 'attributes':
                value = item.findtext('divisions')
                if value is not None:
                    divisions = _fraction(value, positive=True)
                for child in item:
                    if child.tag in ('key', 'time', 'staves', 'clef', 'transpose', 'staff-details'):
                        metadata.append((number, child.tag, _signature(child)))
            elif item.tag == 'sound' and item.get('tempo') is not None:
                metadata.append((number, 'sound-tempo', cursor, divisions, _signature(item)))
            elif item.tag == 'direction':
                if (item.find('.//metronome') is not None
                        or item.find('.//sound[@tempo]') is not None):
                    # Keep cursor and all offset/sound attributes, not just BPM.
                    # A conservative rejection of equivalent formatting is safe.
                    metadata.append((number, 'tempo-direction', cursor, divisions, _signature(item)))
            elif item.tag in ('backup', 'forward'):
                duration = _fraction(item.findtext('duration'), positive=True) / divisions
                cursor += -duration if item.tag == 'backup' else duration
                if cursor < 0:
                    raise ValueError('negative measure cursor')
                end = max(end, cursor)
            elif item.tag == 'note':
                if item.find('grace') is not None or item.find('unpitched') is not None:
                    raise ValueError('unsupported note kind')
                duration = _fraction(item.findtext('duration'), positive=True) / divisions
                chord = item.find('chord') is not None
                onset = previous_onset if chord else cursor
                staff = _integer(item.findtext('staff', '1'), minimum=1, maximum=2)
                pitch = _pitch(item)
                rest = item.find('rest') is not None
                if (pitch is None) == (not rest):
                    raise ValueError('note must be pitched or rest')
                event = _Event(
                    number, 'pitch' if pitch is not None else 'rest', pitch, staff,
                    onset, duration, (item.findtext('type') or '').strip(),
                )
                events[event] += 1
                for marker in item.findall('tie'):
                    ties['tie'][(event, marker.get('type'))] += 1
                    tie_details['tie'][(event, _signature(marker))] += 1
                for marker in item.findall('notations/tied'):
                    ties['tied'][(event, marker.get('type'))] += 1
                    tie_details['tied'][(event, _signature(marker))] += 1
                end = max(end, onset + duration)
                if not chord:
                    previous_onset = onset
                    cursor += duration
        lengths[number] = end
    return _Score(measures, events, lengths, tuple(metadata), ties, tie_details)


def _archive_xml(archive, info):
    data = archive.read(info)
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('declarations are not supported in graph XML')
    return ET.fromstring(data)


def _safe_graph(path):
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        names = [info.filename for info in infos]
        if (len(infos) > _MAX_ARCHIVE_ENTRIES
                or len(names) != len(set(names))
                or sum(info.file_size for info in infos) > _MAX_ARCHIVE_BYTES
                or any(info.flag_bits & 1 for info in infos)):
            raise ValueError('unsafe graph archive')
        if 'book.xml' not in names:
            raise ValueError('missing book metadata')
        book_info = archive.getinfo('book.xml')
        if book_info.file_size > _MAX_XML_BYTES:
            raise ValueError('oversized book metadata')
        book = _archive_xml(archive, book_info)
        book_sheets = book.findall('sheet')
        if book.get('software-version') != '5.11.0' or not 1 <= len(book_sheets) <= 2:
            raise ValueError('unsupported graph version or page count')
        logical_parts = book.findall('score/logical-part')
        if len(logical_parts) != 1 or logical_parts[0].get('staff-count') != '2':
            raise ValueError('unsupported logical part')
        sheets = []
        for index, book_sheet in enumerate(book_sheets, 1):
            if book_sheet.get('number') != str(index):
                raise ValueError('ambiguous sheet numbering')
            steps = (book_sheet.findtext('steps') or '').split()
            if not _PAGE_STEPS.issubset(steps):
                raise ValueError('incomplete graph')
            pages = book_sheet.findall('page')
            if len(pages) != 1:
                raise ValueError('unsupported internal page count')
            book_systems = pages[0].findall('system')
            if not book_systems:
                raise ValueError('sheet has no systems')
            for system in book_systems:
                parts = system.findall('part')
                if len(parts) != 1:
                    raise ValueError('unsupported system parts')
                configurations = parts[0].findall('staff-configuration')
                if (len(configurations) != 2
                        or any(item.get('line-count') != '5' for item in configurations)):
                    raise ValueError('unsupported staff configuration')
            name = f'sheet#{index}/sheet#{index}.xml'
            if name not in names or archive.getinfo(name).file_size > _MAX_XML_BYTES:
                raise ValueError('missing or oversized sheet graph')
            sheet = _archive_xml(archive, archive.getinfo(name))
            graph_pages = sheet.findall('page')
            if len(graph_pages) != 1:
                raise ValueError('unsupported sheet graph pages')
            graph_systems = graph_pages[0].findall('system')
            if len(graph_systems) != len(book_systems):
                raise ValueError('book and sheet systems disagree')
            for system in graph_systems:
                parts = system.findall('part')
                if len(parts) != 1:
                    raise ValueError('unsupported graph system parts')
                staves = parts[0].findall('staff')
                if (len(staves) != 2
                        or any(len(staff.findall('lines/line')) != 5 for staff in staves)):
                    raise ValueError('unsupported graph staves')
            sheets.append(sheet)
        return sheets


def _has_foreground(table):
    width = _integer(table.get('width'), minimum=1, maximum=1024)
    height = _integer(table.get('height'), minimum=1, maximum=1024)
    orientation = table.get('orientation')
    if orientation not in ('VERTICAL', 'HORIZONTAL'):
        return False
    vertical = orientation == 'VERTICAL'
    runs = table.findall('runs')
    if len(runs) != (width if vertical else height):
        return False
    limit, foreground = (height if vertical else width), 0
    for sequence in runs:
        text = sequence.text or ''
        if len(text) > 32768:
            return False
        values = text.split()
        if len(values) > 2 * limit + 1:
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


def _whole_glyph_count(sheets):
    count = 0
    for sheet in sheets:
        glyphs = {}
        for glyph in sheet.iter('glyph'):
            glyphs.setdefault(glyph.get('id'), []).append(glyph)
        used = set()
        for head in sheet.iter('head'):
            if head.get('shape') != 'WHOLE_NOTE':
                continue
            glyph_id = head.get('glyph')
            matches = glyphs.get(glyph_id, [])
            if (not glyph_id or glyph_id in used or len(matches) != 1
                    or matches[0].find('run-table') is None
                    or not _has_foreground(matches[0].find('run-table'))):
                raise ValueError('whole note lacks unique image glyph')
            used.add(glyph_id)
            count += 1
    return count


def _has_final_empty_cautionary(sheets):
    last_sheet = sheets[-1]
    systems = last_sheet.findall('page/system')
    if not systems:
        return False
    system = systems[-1]
    stacks = system.findall('stack')
    parts = system.findall('part')
    if not stacks or len(parts) != 1:
        return False
    stack = stacks[-1]
    measures = parts[0].findall('measure')
    if (stack.get('special') != 'CAUTIONARY' or stack.get('duration') != '0'
            or list(stack) or not measures):
        return False
    final_measure = measures[-1]
    return final_measure.get('id', '').endswith('C') and all(
        child.tag in ('left-barline', 'right-barline') for child in final_measure
    )


def retry_is_eligible(root, source_graph: Path):
    """Return whether the first result has the exact guarded retry shape."""
    try:
        if not _uniform_four_four(root):
            return False
        score = _scan_score(root)
        if any(event.kind == 'pitch' and event.note_type == 'whole' for event in score.events):
            return False
        sheets = _safe_graph(source_graph)
        return _whole_glyph_count(sheets) == 0 and _has_final_empty_cautionary(sheets)
    except (ET.ParseError, OSError, ValueError, ZeroDivisionError, RecursionError,
            zipfile.BadZipFile, KeyError):
        return False


def _validate_new_ties(original, candidate, additions):
    differences = {}
    for kind in ('tie', 'tied'):
        if original.tie_details[kind] - candidate.tie_details[kind]:
            return False
        if original.ties[kind] - candidate.ties[kind]:
            return False
        differences[kind] = candidate.ties[kind] - original.ties[kind]
    if not differences['tie'] and not differences['tied']:
        return True
    if differences['tie'] != differences['tied'] or sum(differences['tie'].values()) != 2:
        return False
    markers = list(differences['tie'].elements())
    starts = [event for event, marker_type in markers if marker_type == 'start']
    stops = [event for event, marker_type in markers if marker_type == 'stop']
    if len(starts) != 1 or len(stops) != 1:
        return False
    start, stop = starts[0], stops[0]
    return (
        start.kind == stop.kind == 'pitch'
        and start.pitch == stop.pitch
        and start.staff == stop.staff
        and stop.measure == start.measure + 1
        and start.onset + start.duration == candidate.lengths[start.measure]
        and stop.onset == 0
        and (additions[start] or additions[stop])
    )


def accept_whole_note_retry(original_root, candidate_root, candidate_graph: Path):
    """Accept only an append-only, graph-backed whole-note recovery."""
    try:
        if not _uniform_four_four(original_root) or not _uniform_four_four(candidate_root):
            return False
        original = _scan_score(original_root)
        candidate = _scan_score(candidate_root)
        if candidate.measures != original.measures + [original.measures[-1] + 1]:
            return False
        if candidate.metadata != original.metadata:
            return False
        if any(candidate.lengths[number] != original.lengths[number]
               for number in original.measures):
            return False
        if original.events - candidate.events:
            return False
        additions = candidate.events - original.events
        if not additions:
            return False
        for event, count in additions.items():
            if (count < 1 or event.kind != 'pitch' or event.onset != 0
                    or event.duration != 4 or event.note_type != 'whole'):
                return False
        new_measure = candidate.measures[-1]
        final_events = Counter({event: count for event, count in additions.items()
                                if event.measure == new_measure})
        if (not final_events or candidate.lengths[new_measure] != 4
                or {event.staff for event in final_events} != {1, 2}
                or any(event.measure == new_measure for event in original.events)):
            return False
        if not _validate_new_ties(original, candidate, additions):
            return False
        sheets = _safe_graph(candidate_graph)
        return _whole_glyph_count(sheets) == sum(additions.values())
    except (ET.ParseError, OSError, ValueError, ZeroDivisionError, RecursionError,
            zipfile.BadZipFile, KeyError):
        return False
