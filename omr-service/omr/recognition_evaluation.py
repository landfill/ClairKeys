"""Offline raw-event comparison, not a production recognition/repair policy.

Only explicitly referenced measures of the first part are evaluated. Ties are
not merged and unreferenced measures are not certified. Mismatches are also
named by kind (for example a lost augmentation dot versus a wrong pitch) so a
candidate's remaining defects can be separated; naming never relaxes `exact`.
Run with:
python -m omr.recognition_evaluation reference.json candidate.mxl
"""
import argparse
from collections import Counter
from fractions import Fraction
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

from omr.converter import MusicXMLToClairKeysConverter
from omr.musicxml_timing import scan_score


def read_musicxml(path: Path) -> ET.Element:
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            container = ET.fromstring(archive.read('META-INF/container.xml'))
            roots = [element.get('full-path') for element in container.iter()
                     if element.tag.rsplit('}', 1)[-1] == 'rootfile'
                     and element.get('media-type') == 'application/vnd.recordare.musicxml+xml']
            if len(roots) != 1:
                raise ValueError('Expected exactly one MusicXML rootfile')
            root = ET.fromstring(archive.read(roots[0]))
    else:
        root = ET.parse(path).getroot()
    for element in root.iter():
        element.tag = element.tag.rsplit('}', 1)[-1]
    if root.tag != 'score-partwise':
        raise ValueError('Only score-partwise MusicXML is supported')
    return root


def _event_key(event):
    return (int(event['midi']), int(event['staff']),
            Fraction(str(event['onset'])), Fraction(str(event['duration'])))


def _events(counter):
    return [dict(midi=midi, staff=staff, onset=float(onset), duration=float(duration))
            for (midi, staff, onset, duration), count in sorted(counter.items())
            for _ in range(count)]


def _rests(counter):
    return [dict(staff=staff, onset=float(onset), duration=float(duration))
            for (staff, onset, duration), count in sorted(counter.items())
            for _ in range(count)]


def _ties(counter):
    return [dict(midi=midi, staff=staff, onset=float(onset))
            for (midi, staff, onset), count in sorted(counter.items())
            for _ in range(count)]


def _plain(duration: Fraction) -> bool:
    """A power-of-two note value such as a half or an eighth, with no dot or tuplet."""
    return (duration.numerator & (duration.numerator - 1)) == 0 and (
        duration.denominator & (duration.denominator - 1)) == 0


def _duration_kind(want, got):
    # Two thirds of the printed value is a lost dot only when the printed value
    # is actually dotted; otherwise the same ratio is an invented tuplet.
    if got[3] * 3 == want[3] * 2 and _plain(got[3]):
        return 'missing-dot'
    if got[3] * 2 == want[3] * 3 and _plain(want[3]):
        return 'extra-dot'
    return 'duration'


# Pairing order matters: an event that kept its pitch and position but lost a
# dot must not be offered to a looser rule that would call it a pitch error.
_PAIRINGS = (
    (lambda e: (e[0], e[1], e[2]), _duration_kind),
    (lambda e: (e[0], e[1], e[3]), lambda want, got: 'onset'),
    (lambda e: (e[1], e[2], e[3]), lambda want, got: 'pitch'),
    (lambda e: (e[0], e[1]), lambda want, got: 'onset-and-duration'),
)


def _categorize(missing: Counter, unexpected: Counter) -> list:
    wanted = sorted(missing.elements())
    actual = sorted(unexpected.elements())
    categories = []
    for signature, kind in _PAIRINGS:
        remaining = []
        for want in wanted:
            match = next((got for got in actual if signature(got) == signature(want)), None)
            if match is None:
                remaining.append(want)
                continue
            actual.remove(match)
            categories.append(dict(kind=kind(want, match), expected=_events(Counter([want]))[0],
                                   actual=_events(Counter([match]))[0]))
        wanted = remaining
    categories += [dict(kind='missing', expected=event) for event in _events(Counter(wanted))]
    categories += [dict(kind='extra', actual=event) for event in _events(Counter(actual))]
    return categories


def _opening_tempo(root: ET.Element, reference: dict):
    contract = reference.get('openingTempo')
    if contract is None:
        return None
    actual = scan_score(root, MusicXMLToClairKeysConverter()._find_tempo).opening_tempo
    expected = contract['quarterBpm']
    return dict(expectedQuarterBpm=expected, actualQuarterBpm=actual,
                matches=actual is not None and Fraction(str(actual)) == Fraction(str(expected)))


def evaluate_reference(root: ET.Element, reference: dict) -> dict:
    part = root.find('part')
    if part is None:
        raise ValueError('MusicXML has no part')
    measures = {}
    divisions = Fraction(1)
    meter = None
    for measure in part.findall('measure'):
        cursor = end = previous_onset = Fraction(0)
        events, rests, tie_starts = Counter(), Counter(), Counter()
        for item in measure:
            if item.tag == 'attributes':
                value = item.findtext('divisions')
                if value is not None:
                    divisions = Fraction(value)
                    if divisions <= 0:
                        raise ValueError('Divisions must be positive')
                time = item.find('time')
                if time is not None:
                    meter = f"{time.findtext('beats')}/{time.findtext('beat-type')}"
            elif item.tag in ('backup', 'forward'):
                duration = Fraction(item.findtext('duration', '0')) / divisions
                cursor += duration * (-1 if item.tag == 'backup' else 1)
                end = max(end, cursor)
            elif item.tag == 'note':
                if item.find('grace') is not None:
                    raise ValueError('Grace notes need an explicit reference contract')
                duration = Fraction(item.findtext('duration', '0')) / divisions
                chord = item.find('chord') is not None
                onset = previous_onset if chord else cursor
                pitch = item.find('pitch')
                if pitch is not None:
                    alter = Fraction(pitch.findtext('alter', '0'))
                    if alter.denominator != 1:
                        raise ValueError('Microtonal pitches are outside this reference contract')
                    midi = (int(pitch.findtext('octave')) + 1) * 12
                    midi += {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[pitch.findtext('step')]
                    staff = int(item.findtext('staff', '1'))
                    events[(midi + int(alter), staff, onset, duration)] += 1
                    if any(tie.get('type') == 'start' for tie in item.findall('tie')):
                        tie_starts[(midi + int(alter), staff, onset)] += 1
                elif item.find('rest') is not None:
                    rests[(int(item.findtext('staff', '1')), onset, duration)] += 1
                end = max(end, onset + duration)
                if not chord:
                    previous_onset = onset
                    cursor += duration
        number = measure.get('number')
        if number in measures:
            raise ValueError(f'Ambiguous repeated measure number: {number}')
        measures[number] = (events, rests, tie_starts, end, meter)

    results = []
    matched = expected_count = 0
    for expected in reference['measures']:
        wanted = Counter(_event_key(event) for event in expected['pitchedEvents'])
        actual, actual_rests, actual_ties, length, actual_meter = measures.get(
            str(expected['number']), (Counter(), Counter(), Counter(), None, None))
        count = sum((wanted & actual).values())
        matched += count
        expected_count += sum(wanted.values())
        missing, unexpected = _events(wanted - actual), _events(actual - wanted)
        categories = _categorize(wanted - actual, actual - wanted)
        meter_matches = actual_meter == expected.get('timeSignature', reference['timeSignature'])
        length_matches = length == Fraction(str(expected['quarterLength']))
        rest_contract = expected.get('restEvents')
        wanted_rests = Counter(
            (int(event['staff']), Fraction(str(event['onset'])), Fraction(str(event['duration'])))
            for event in (rest_contract or []))
        matched_rests = sum((wanted_rests & actual_rests).values()) if rest_contract is not None else None
        missing_rests = _rests(wanted_rests - actual_rests) if rest_contract is not None else []
        unexpected_rests = _rests(actual_rests - wanted_rests) if rest_contract is not None else []
        tie_contract = expected.get('tieStarts')
        wanted_ties = Counter(
            (int(event['midi']), int(event['staff']), Fraction(str(event['onset'])))
            for event in (tie_contract or []))
        matched_ties = sum((wanted_ties & actual_ties).values()) if tie_contract is not None else None
        missing_ties = _ties(wanted_ties - actual_ties) if tie_contract is not None else []
        unexpected_ties = _ties(actual_ties - wanted_ties) if tie_contract is not None else []
        results.append(dict(number=str(expected['number']), matchedEvents=count,
                            missing=missing, unexpected=unexpected,
                            matchedRests=matched_rests, missingRests=missing_rests,
                            unexpectedRests=unexpected_rests,
                            matchedTieStarts=matched_ties, missingTieStarts=missing_ties,
                            unexpectedTieStarts=unexpected_ties, categories=categories,
                            actualTimeSignature=actual_meter, meterMatches=meter_matches,
                            actualQuarterLength=float(length) if length is not None else None,
                            lengthMatches=length_matches,
                            exact=(not missing and not unexpected and not missing_rests
                                   and not unexpected_rests and not missing_ties
                                   and not unexpected_ties and meter_matches and length_matches)))
    opening = _opening_tempo(root, reference)
    totals = Counter(item['kind'] for result in results for item in result['categories'])
    return dict(scope='Referenced measures of the first part; raw events before tie merging only',
                matchedEvents=matched, expectedEvents=expected_count, measures=results,
                categories=dict(sorted(totals.items())), openingTempo=opening,
                exact=(bool(results) and all(result['exact'] for result in results)
                       and (opening is None or opening['matches'])))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=Path)
    parser.add_argument('candidate', type=Path)
    args = parser.parse_args()
    result = evaluate_reference(read_musicxml(args.candidate), json.loads(args.reference.read_text()))
    print(json.dumps(result, indent=2))
    return 0 if result['exact'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
