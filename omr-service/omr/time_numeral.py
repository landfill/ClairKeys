"""Orientation-sensitive 6/9 evidence from the engine's existing music fonts.

Pillow and fonts are loaded only on the rare meter retry path. This is not a
general numeral classifier; an inconclusive score must leave recognition alone.
"""
from functools import lru_cache
import io
import zipfile


def _glyph_image(table):
    from PIL import Image

    width, height = int(table.get('width')), int(table.get('height'))
    if not (4 <= width <= 256 and 4 <= height <= 256):
        raise ValueError('Time numeral size is outside the supported range')
    orientation = table.get('orientation')
    if orientation not in ('VERTICAL', 'HORIZONTAL'):
        raise ValueError('Unknown glyph orientation')
    vertical = orientation == 'VERTICAL'
    runs = table.findall('runs')
    if len(runs) != (width if vertical else height):
        raise ValueError('Run-table sequence count differs from dimensions')
    image = Image.new('L', (width, height), 255)
    for index, sequence in enumerate(runs):
        position, ink = 0, True
        for length in map(int, (sequence.text or '').split()):
            if length < 0 or position + length > (height if vertical else width):
                raise ValueError('Run-table exceeds glyph bounds')
            if ink:
                for offset in range(length):
                    point = (index, position + offset) if vertical else (position + offset, index)
                    image.putpixel(point, 0)
            position += length
            ink = not ink
    return image


def _pixels(image):
    from PIL import Image, ImageOps

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


def _bitmask(pixels):
    return sum(1 << (y * 84 + x) for x, y in pixels)


@lru_cache(maxsize=1)
def _templates(jar):
    from PIL import Image, ImageFont, ImageOps

    result = []
    with zipfile.ZipFile(jar) as archive:
        for family in ('Bravura.otf', 'Leland.otf'):
            font = ImageFont.truetype(io.BytesIO(archive.read('res/' + family)), 100)
            for digit in (6, 9):
                mask = font.getmask(chr(0xE080 + digit), mode='L')
                image = ImageOps.invert(Image.frombytes('L', mask.size, bytes(mask)))
                pixels = _pixels(image)
                if not pixels:
                    raise ValueError('Time numeral font glyph is unavailable')
                result.append((digit, _bitmask(pixels), len(pixels)))
    return result


def classify_time_numeral(table, jar):
    pixels = _pixels(_glyph_image(table))
    if not pixels:
        return dict(six=0.0, nine=0.0, margin=0.0)
    original = _bitmask(pixels)
    # At least 6px padding protects ±3px shifts from row wrapping or negative bits.
    shifts = [dy * 84 + dx for dx in range(-3, 4) for dy in range(-3, 4)]
    moved = [original << shift if shift >= 0 else original >> -shift for shift in shifts]
    scores = {6: 0.0, 9: 0.0}
    for digit, target, count in _templates(jar):
        for mask in moved:
            overlap = (mask & target).bit_count()
            scores[digit] = max(scores[digit], overlap / (len(pixels) + count - overlap))
    return dict(six=scores[6], nine=scores[9], margin=scores[9] - scores[6])
