"""Offline experiment against labeled Audiveris samples; never edits an OMR graph.

Requires Pillow, official samples.zip and installed audiveris.jar. These are not
downloaded automatically. Thresholds below are hypotheses, not runtime policy.
"""
import argparse
from collections import Counter
import hashlib
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

from PIL import Image, ImageFont, ImageOps


def glyph_image(table):
    width, height = int(table.get('width')), int(table.get('height'))
    image = Image.new('L', (width, height), 255)
    vertical = table.get('orientation') == 'VERTICAL'
    if table.get('orientation') not in ('VERTICAL', 'HORIZONTAL'):
        raise ValueError('Unknown run-table orientation')
    for index, sequence in enumerate(table.findall('runs')):
        position, ink = 0, True
        for length in map(int, (sequence.text or '').split()):
            for offset in range(length):
                if ink:
                    point = (index, position + offset) if vertical else (position + offset, index)
                    image.putpixel(point, 0)
            position += length
            ink = not ink
    return image


def normalized_pixels(image):
    box = ImageOps.invert(image).getbbox()
    if box is None:
        return set()
    image = image.crop(box)
    scale = 64 / max(image.size)
    image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                         Image.Resampling.BICUBIC)
    left, top = (76 - image.width) // 2, (76 - image.height) // 2
    return {(x + left, y + top) for y in range(image.height) for x in range(image.width)
            if image.getpixel((x, y)) < 128}


def bitmask(pixels):
    return sum(1 << (y * 84 + x) for x, y in pixels)


def make_templates(jar):
    templates = []
    with zipfile.ZipFile(jar) as archive:
        for family in ('Bravura.otf', 'Leland.otf'):
            font = ImageFont.truetype(io.BytesIO(archive.read('res/' + family)), 100)
            for digit in (6, 9):
                mask = font.getmask(chr(0xE080 + digit), mode='L')
                image = ImageOps.invert(Image.frombytes('L', mask.size, bytes(mask)))
                pixels = normalized_pixels(image)
                templates.append((family, digit, bitmask(pixels), len(pixels)))
    return templates


def compare(image, templates):
    pixels = normalized_pixels(image)
    # Padding remains >=6px, so ±3 translations cannot wrap rows or become negative.
    original = bitmask(pixels)
    shifts = [dy * 84 + dx for dx in range(-3, 4) for dy in range(-3, 4)]
    moved = [original << shift if shift >= 0 else original >> -shift for shift in shifts]
    scores = {}
    for family, digit, target, target_count in templates:
        best = 0.0
        for mask in moved:
            overlap = (mask & target).bit_count()
            best = max(best, overlap / (len(pixels) + target_count - overlap))
        scores[f'{family}:{digit}'] = best
    six = max(score for key, score in scores.items() if key.endswith(':6'))
    nine = max(score for key, score in scores.items() if key.endswith(':9'))
    return dict(six=round(six, 6), nine=round(nine, 6), margin=round(nine - six, 6),
                proposesNine=nine >= .65 and nine - six >= .08)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('samples', type=Path)
    parser.add_argument('jar', type=Path)
    parser.add_argument('--omr', type=Path)
    parser.add_argument('--all-digits', action='store_true')
    parser.add_argument('--report', type=Path, help='Optional full JSON report; stdout then contains only summary')
    parser.add_argument('--runtime', action='store_true', help='Exercise omr.time_numeral from PYTHONPATH instead of the prototype')
    args = parser.parse_args()
    templates = make_templates(args.jar)
    def score_table(table):
        if args.runtime:
            from omr.time_numeral import classify_time_numeral
            result = classify_time_numeral(table, args.jar)
            result['proposesNine'] = result['nine'] >= .65 and result['margin'] >= .08
            return result
        return compare(glyph_image(table), templates)
    rows = []
    shapes = {'TIME_SIX', 'TIME_NINE'}
    if args.all_digits:
        shapes.update('TIME_' + digit for digit in ('ZERO', 'ONE', 'TWO', 'THREE', 'FOUR',
                      'FIVE', 'SEVEN', 'EIGHT', 'TEN', 'TWELVE', 'SIXTEEN'))
    with zipfile.ZipFile(args.samples) as archive:
        for name in archive.namelist():
            if not name.endswith('samples.xml'):
                continue
            root = ET.fromstring(archive.read(name))
            for sample in root.findall('sample'):
                if sample.get('shape') not in shapes:
                    continue
                rows.append(dict(source=name, id=sample.get('id'), label=sample.get('shape'),
                                 **score_table(sample.find('run-table'))))
    actual = []
    if args.omr:
        with zipfile.ZipFile(args.omr) as archive:
            root = ET.fromstring(archive.read('sheet#1/sheet#1.xml'))
            for number in root.iter('time-number'):
                if number.get('side') != 'TOP':
                    continue
                glyph = root.find(f'.//glyph[@id="{number.get("glyph")}"]/run-table')
                if glyph is not None:
                    actual.append(dict(id=number.get('glyph'), staff=number.get('staff'),
                                       engineValue=number.get('value'), **score_table(glyph)))
    result = dict(samplesSha256=hashlib.sha256(args.samples.read_bytes()).hexdigest(),
                          thresholdHypothesis=dict(minNineIoU=.65, minMargin=.08),
                          counts=dict(Counter(row['label'] for row in rows)),
                          proposedCounts=dict(Counter(row['label'] for row in rows if row['proposesNine'])),
                          actual=actual, samples=rows)
    if args.report:
        args.report.write_text(json.dumps(result, indent=2) + '\n')
        result.pop('samples')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
