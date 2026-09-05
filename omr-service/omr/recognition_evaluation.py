"""Offline raw-event comparison, not a production recognition/repair policy.

Only explicitly referenced measures of the first part are evaluated. Ties are
not merged and unreferenced measures are not certified. Run with:
python -m omr.recognition_evaluation reference.json candidate.mxl
"""
import argparse
from collections import Counter
from fractions import Fraction
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile


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


def evaluate_reference(root: ET.Element, reference: dict) -> dict:
    part = root.find('part')
    if part is None:
        raise ValueError('MusicXML has no part')
    measures = {}
    divisions = Fraction(1)
    meter = None
    for measure in part.findall('measure'):
        cursor = end = previous_onset = Fraction(0)
        events = Counter()
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
                    events[(midi + int(alter), int(item.findtext('staff', '1')), onset, duration)] += 1
                end = max(end, onset + duration)
                if not chord:
                    previous_onset = onset
                    cursor += duration
        number = measure.get('number')
        if number in measures:
            raise ValueError(f'Ambiguous repeated measure number: {number}')
        measures[number] = (events, end, meter)

    results = []
    matched = expected_count = 0
    for expected in reference['measures']:
        wanted = Counter(_event_key(event) for event in expected['pitchedEvents'])
        actual, length, actual_meter = measures.get(str(expected['number']), (Counter(), None, None))
        count = sum((wanted & actual).values())
        matched += count
        expected_count += sum(wanted.values())
        missing, unexpected = _events(wanted - actual), _events(actual - wanted)
        meter_matches = actual_meter == expected.get('timeSignature', reference['timeSignature'])
        length_matches = length == Fraction(str(expected['quarterLength']))
        results.append(dict(number=str(expected['number']), matchedEvents=count,
                            missing=missing, unexpected=unexpected,
                            actualTimeSignature=actual_meter, meterMatches=meter_matches,
                            actualQuarterLength=float(length) if length is not None else None,
                            lengthMatches=length_matches,
                            exact=not missing and not unexpected and meter_matches and length_matches))
    return dict(scope='Referenced measures of the first part; raw events before tie merging only',
                matchedEvents=matched, expectedEvents=expected_count, measures=results,
                exact=bool(results) and all(result['exact'] for result in results))


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
