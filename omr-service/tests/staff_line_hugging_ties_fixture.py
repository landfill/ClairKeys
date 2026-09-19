"""Synthetic single-staff score of ties hugging the staff line of their heads (#134, D-072).

Every 3/4 measure holds a half-note chord of two heads on adjacent staff lines, tied to
the same chord as a quarter. The upper tie runs just above the upper head's line and bows
up; the lower tie runs just below the lower head's line and bows down. Each tie end stays
about 0.2 interline off that line and arrives flat, like Clair de Lune easy m3 (upper G4),
m13 (upper G3) and m14 (lower D3). Audiveris's slur purge takes such an end for a piece
of staff line and, with no shorter candidate left on that side, loses the whole tie. The
stock engine loses the four upper ties here, which lie inside the staff; the four lower
ties bow outside the staff and serve as controls.

Glyphs come from the Bravura (SIL OFL) font bundled in the Audiveris jar and the ties
are drawn curves, so the fixture is copyright-free and needs no committed image or PDF.
"""
import math
import zipfile
from io import BytesIO
from pathlib import Path

INTERLINE = 20  # pixels; about 300 dpi engraving
STAFF_LEFT, STAFF_TOP = 200, 400
MEASURE_WIDTH = 460
END_OFFSET = 4  # tie end distance from the head's staff line, pixels
# Bow height in interlines. It keeps each tie inside its space: a deeper bow reaching the
# next line splits the curve there, a different failure than the purge this fixture pins.
BOW = 0.45

# (upper head step, lower head step, stem up); step 0 is the top line (F5) and each
# step is half an interline downward, so even steps are lines. Both heads of every
# chord sit on adjacent lines.
CHORDS = ((4, 6, True), (6, 8, True), (2, 4, False), (4, 6, False))
STEP_PITCHES = ("F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4")

EXPECTED_MEASURES = tuple(
    {"pitches": (STEP_PITCHES[lower], STEP_PITCHES[upper])}
    for upper, lower, _ in CHORDS
)


def _tie(draw, x1, x2, y, direction):
    """Draw a tie from (x1, y) to (x2, y), flat at both ends and bowing in direction."""
    steps = 160
    top, bottom = [], []
    for i in range(steps + 1):
        t = i / steps
        x = x1 + (x2 - x1) * t
        rise = math.sin(math.pi * t)
        center = y + direction * BOW * INTERLINE * rise ** 1.5
        half_width = (2 + 3 * rise) / 2
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
        tie_left, tie_right = left + 40 + 28, left + 360 - 4
        _tie(draw, tie_left, tie_right, step_y(upper) - END_OFFSET, -1)
        _tie(draw, tie_left, tie_right, step_y(lower) + END_OFFSET, +1)
        bar = left + MEASURE_WIDTH
        draw.rectangle([bar - 1, step_y(0), bar + 1, step_y(8)], fill=0)
    draw.rectangle([right - 8, step_y(0), right, step_y(8)], fill=0)

    page.convert("1").save(output, resolution=300)
