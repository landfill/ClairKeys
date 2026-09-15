"""Synthetic single-staff score of flat lens-shaped ties along staff lines (#134, D-063).

Every 3/4 measure holds a half-note chord of two heads in adjacent spaces, tied to
the same chord as a quarter. The upper tie bows up and the lower tie bows down,
and both run flat along the staff line just outside their head at each end, like
the left hand of the Clair de Lune easy arrangement. Inside the staff such a flat tie
merges with a staff line in the Audiveris skeleton, so its curve ends where it
leaves the line, farther from the heads than the standard link coverage.

Glyphs come from the Bravura (SIL OFL) font bundled in the Audiveris jar and the
ties are drawn curves, so the fixture is copyright-free and needs no committed
image or PDF.
"""
import math
import zipfile
from io import BytesIO
from pathlib import Path

INTERLINE = 20  # pixels; about 300 dpi engraving
STAFF_LEFT, STAFF_TOP = 200, 400
MEASURE_WIDTH = 460

# (upper head step, lower head step, stem up); step 0 is the top line (F5) and
# each step is half an interline downward, so odd steps are spaces. Both heads of
# every chord sit in adjacent spaces and each tie runs along the staff line just
# outside its head, the shape measured on the Clair left hand.
CHORDS = ((3, 5, True), (5, 7, True), (1, 3, False), (3, 5, False))
STEP_PITCHES = ("F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4")

EXPECTED_MEASURES = tuple(
    {"pitches": (STEP_PITCHES[lower], STEP_PITCHES[upper])}
    for upper, lower, _ in CHORDS
)


def _tie(draw, x1, x2, y, direction):
    """Draw a tie from (x1, y) to (x2, y): flat along y at both ends, bowing in direction."""
    steps = 160
    top, bottom = [], []
    for i in range(steps + 1):
        t = i / steps
        x = x1 + (x2 - x1) * t
        rise = math.sin(math.pi * t)
        center = y + direction * 0.6 * INTERLINE * rise ** 0.55
        half_width = (3 + 3 * rise) / 2
        top.append((x, center - half_width))
        bottom.append((x, center + half_width))
    draw.polygon(top + bottom[::-1], fill=0)


def write_pdf(audiveris_jar: Path, output: Path) -> None:
    from PIL import Image, ImageDraw, ImageFont

    with zipfile.ZipFile(audiveris_jar) as jar:
        bravura = BytesIO(jar.read("res/Bravura.otf"))
    font = ImageFont.truetype(bravura, 4 * INTERLINE)
    page = Image.new("L", (2480, 3508), 255)
    draw = ImageDraw.Draw(page)
    draw.fontmode = "1"

    def step_y(step):
        return STAFF_TOP + step * INTERLINE // 2

    def glyph(x, y, codepoint):
        draw.text((x, y), chr(codepoint), font=font, fill=0, anchor="ls")

    first = STAFF_LEFT + 170
    right = first + MEASURE_WIDTH * len(EXPECTED_MEASURES)
    for index in range(5):
        y = step_y(2 * index)
        draw.rectangle([STAFF_LEFT, y - 1, right, y + 1], fill=0)
    glyph(STAFF_LEFT + 30, step_y(6), 0xE050)   # G clef
    glyph(STAFF_LEFT + 110, step_y(2), 0xE083)  # 3
    glyph(STAFF_LEFT + 110, step_y(6), 0xE084)  # 4

    for number, (upper, lower, stem_up) in enumerate(CHORDS):
        left = first + number * MEASURE_WIDTH
        for head_x, codepoint in ((left + 40, 0xE0A3), (left + 360, 0xE0A4)):
            upper_y, lower_y = step_y(upper), step_y(lower)
            glyph(head_x, upper_y, codepoint)
            glyph(head_x, lower_y, codepoint)
            if stem_up:
                draw.rectangle(
                    [head_x + 21, upper_y - int(3.5 * INTERLINE), head_x + 23, lower_y], fill=0)
            else:
                draw.rectangle(
                    [head_x, upper_y, head_x + 2, lower_y + int(3.5 * INTERLINE)], fill=0)
        tie_left, tie_right = left + 40 + 24 + 35, left + 360 - 23
        _tie(draw, tie_left, tie_right, step_y(upper - 1), -1)
        _tie(draw, tie_left, tie_right, step_y(lower + 1), +1)
        bar = left + MEASURE_WIDTH
        draw.rectangle([bar - 1, step_y(0), bar + 1, step_y(8)], fill=0)
    draw.rectangle([right - 8, step_y(0), right, step_y(8)], fill=0)

    page.convert("1").save(output, resolution=300)
