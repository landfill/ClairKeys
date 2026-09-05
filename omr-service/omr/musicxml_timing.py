"""Read musical positions before mapping them to the audio time domain."""

from bisect import bisect_right
from dataclasses import dataclass, field
from fractions import Fraction
import math
from typing import Callable, Optional
import xml.etree.ElementTree as ET


def fraction(text: Optional[str], default: Fraction = Fraction(0)) -> Fraction:
    try:
        return Fraction(text) if text is not None else default
    except (ValueError, ZeroDivisionError):
        return default


def meter_length(time: ET.Element) -> Optional[Fraction]:
    if time.find('senza-misura') is not None:
        return None
    beats = time.findall('beats')
    units = time.findall('beat-type')
    if not beats or len(beats) != len(units):
        return None
    total = Fraction(0)
    for count, unit in zip(beats, units):
        numerator = sum((fraction(n) for n in (count.text or '').split('+')), Fraction(0))
        denominator = fraction(unit.text)
        if numerator <= 0 or denominator <= 0:
            return None
        total += numerator * 4 / denominator
    return total


@dataclass
class Measure:
    notes: list = field(default_factory=list)  # (XML note, local quarter onset, duration)
    tempos: list = field(default_factory=list)  # (local quarter position, BPM)
    length: Fraction = Fraction(0)
    non_controlling: bool = False


@dataclass
class ScoreTimeline:
    parts: list
    starts: list
    tempos: dict
    warnings: list

    @property
    def opening_tempo(self) -> Optional[float]:
        return self.tempos.get(Fraction(0))


def scan_score(root: ET.Element, read_tempo: Callable) -> ScoreTimeline:
    parts = []
    warnings = []
    for part_index, part in enumerate(root.findall('.//part')):
        divisions = Fraction(1)
        expected = None
        measures = []
        for index, element in enumerate(part.findall('measure')):
            measure = Measure(non_controlling=element.get('non-controlling') == 'yes')
            cursor = last_onset = Fraction(0)
            check_meter = element.get('implicit') != 'yes' and element.get('non-controlling') != 'yes'
            for child in element:
                if child.tag == 'attributes':
                    changed = fraction(child.findtext('divisions'), divisions)
                    divisions = changed if changed > 0 else Fraction(1)
                    times = child.findall('time')
                    if times:
                        lengths = [meter_length(time) for time in times]
                        expected = lengths[0] if all(value == lengths[0] for value in lengths) else None
                        if cursor != 0:
                            check_meter = False
                    continue
                if child.tag in ('direction', 'sound'):
                    bpm = read_tempo(child)
                    if bpm is not None and math.isfinite(bpm) and bpm > 0:
                        sound = child if child.tag == 'sound' else child.find('sound')
                        offset = sound.find('offset') if sound is not None else None
                        if offset is None and child.tag == 'direction':
                            direction_offset = child.find('offset')
                            if direction_offset is not None and direction_offset.get('sound') == 'yes':
                                offset = direction_offset
                        position = cursor + (fraction(offset.text) / divisions if offset is not None else 0)
                        measure.tempos.append((max(Fraction(0), position), bpm))
                    continue
                duration = max(Fraction(0), fraction(child.findtext('duration')) / divisions)
                if child.tag == 'backup':
                    cursor = max(Fraction(0), cursor - duration)
                elif child.tag == 'forward':
                    cursor += duration
                    measure.length = max(measure.length, cursor)
                elif child.tag == 'note':
                    chord = child.find('chord') is not None
                    onset = last_onset if chord else cursor
                    measure.notes.append((child, onset, duration))
                    if not chord:
                        last_onset = onset
                        cursor = onset + duration
                    measure.length = max(measure.length, onset + duration)
            location = {'part': part.get('id', str(part_index + 1)), 'measure': element.get('number', str(index + 1))}
            if check_meter and expected is not None and measure.length > expected:
                warnings.append({'code': 'measure-overflow', **location,
                                 'expectedQuarters': float(expected), 'actualQuarters': float(measure.length)})
            navigation = element.find('.//repeat') is not None or element.find('.//ending') is not None
            navigation = navigation or any(
                any(sound.get(key) is not None for key in ('dacapo', 'dalsegno', 'tocoda', 'fine'))
                for sound in element.findall('.//sound'))
            if navigation:
                warnings.append({'code': 'unexpanded-navigation', **location})
            measures.append(measure)
        parts.append(measures)

    independent = [any(measure.non_controlling for measure in part) for part in parts]
    shared_starts = []
    position = Fraction(0)
    for index in range(max((len(part) for part in parts), default=0)):
        shared_starts.append(position)
        # A short/omitted voice must not move its next bar ahead of other parts.
        # Actual content sets the boundary; never repair OCR by stretching notes.
        position += max((part[index].length for part_index, part in enumerate(parts)
                         if not independent[part_index] and index < len(part)), default=Fraction(0))
    starts = []
    for part_index, part in enumerate(parts):
        if not independent[part_index]:
            starts.append(shared_starts)
            continue
        local_starts = []
        position = Fraction(0)
        for measure in part:
            local_starts.append(position)
            position += measure.length
        starts.append(local_starts)
    tempos = {}
    owners = {}
    for part_index, part in enumerate(parts):
        for index, measure in enumerate(part):
            for offset, bpm in measure.tempos:
                position = starts[part_index][index] + offset
                if position not in owners or owners[position] == part_index:
                    tempos[position] = bpm
                    owners[position] = part_index
    return ScoreTimeline(parts, starts, tempos, warnings)


class QuarterClock:
    """Piecewise tempo integral, with logarithmic timestamp lookup."""

    def __init__(self, initial_bpm: float, tempos: dict):
        marks = {Fraction(0): initial_bpm, **tempos}
        self.positions = sorted(marks)
        self.bpms = [marks[position] for position in self.positions]
        self.seconds = [0.0]
        for index in range(1, len(self.positions)):
            elapsed = float(self.positions[index] - self.positions[index - 1]) * 60 / self.bpms[index - 1]
            self.seconds.append(self.seconds[-1] + elapsed)

    def at(self, position: Fraction) -> float:
        index = bisect_right(self.positions, position) - 1
        return self.seconds[index] + float(position - self.positions[index]) * 60 / self.bpms[index]

    def duration(self, start: Fraction, end: Fraction) -> float:
        first = bisect_right(self.positions, start) - 1
        last = bisect_right(self.positions, end) - 1
        if first == last:
            return float(end - start) * 60 / self.bpms[first]
        return self.at(end) - self.at(start)
