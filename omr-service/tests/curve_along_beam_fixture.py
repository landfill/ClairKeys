"""Synthetic single-staff score of a beam whose ink merges with a slur (#134, D-065).

Every 3/4 measure starts with two beamed eighths whose stems point down, then two
quarters. A slur bows below the pair and runs along the beam, so its ink touches
the beam and continues about two interlines past each stem, like the Clair de Lune
easy arrangement's m9 left hand. The merged blob makes Audiveris build the beam
past both stems, which costs the stems their beam end portions.

Glyphs come from the Bravura (SIL OFL) font bundled in the Audiveris jar and the
slur is a drawn curve, so the fixture is copyright-free and needs no committed
image or PDF.
"""
import math
import zipfile
from io import BytesIO
from pathlib import Path

INTERLINE = 20  # pixels; about 300 dpi engraving
STAFF_LEFT, STAFF_TOP = 200, 400
MEASURE_WIDTH = 420
BEAM_HEIGHT = 14  # pixels, as measured on the Clair left hand
CURVE_HALF_WIDTH = 4  # pixels; the curve is thinner than the beam
CURVE_OVERHANG = 60  # pixels the curve runs past each stem
BEAM_OVERSHOOT = 10  # pixels of merged curve ink past each stem, as measured on Clair m9

# (beamed eighths step, quarters step); step 0 is the top line (F5) and each step
# is half an interline downward, so odd steps are spaces.
PAIRS = ((5, 3), (6, 4), (7, 5), (8, 6))
STEP_PITCHES = ("F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4")

EXPECTED_MEASURES = tuple(
    {"eighths": STEP_PITCHES[beamed], "quarters": STEP_PITCHES[rest]}
    for beamed, rest in PAIRS
)


def _slur_along(draw, x1, x2, y):
    """Draw a slur running flat along y, then falling away near x1 and x2.

    The flat part is the piece that merges with the beam. It reaches about half an
    interline past each stem, as measured on the Clair left hand, and the curve only
    leaves the beam band outside that.
    """
    steps = 320
    flat = 0.65  # fraction of the half span that stays level with the beam
    top, bottom = [], []
    for index in range(steps + 1):
        t = index / steps
        x = x1 + (x2 - x1) * t
        u = abs((2 * t) - 1)
        away = max(0.0, (u - flat) / (1 - flat))
        center = y - 0.5 * INTERLINE * away ** 1.5
        half = CURVE_HALF_WIDTH - 2 * away
        top.append((x, center - half))
        bottom.append((x, center + half))
    draw.polygon(top + bottom[::-1], fill=0)


def write_pdf(audiveris_jar: Path, output: Path) -> None:
    from PIL import Image, ImageDraw, ImageFont

    with zipfile.ZipFile(audiveris_jar) as jar:
        bravura = BytesIO(jar.read("res/Bravura.otf"))
    font = ImageFont.truetype(bravura, 4 * INTERLINE)
    page = Image.new("L", (2480, 3508), 255)
    draw = ImageDraw.Draw(page)
    draw.fontmode = "1"  # no antialiasing

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

    for number, (beamed, rest) in enumerate(PAIRS):
        left = first + number * MEASURE_WIDTH
        head_y = step_y(beamed)
        first_x, second_x = left + 40, left + 130
        beam_top = head_y + int(3.2 * INTERLINE)
        for head_x in (first_x, second_x):
            glyph(head_x, head_y, 0xE0A4)  # black notehead
            draw.rectangle([head_x, head_y, head_x + 2, beam_top + BEAM_HEIGHT], fill=0)
        draw.rectangle(
            [first_x - BEAM_OVERSHOOT, beam_top, second_x + 2 + BEAM_OVERSHOOT,
             beam_top + BEAM_HEIGHT - 1], fill=0)
        _slur_along(
            draw, first_x - CURVE_OVERHANG, second_x + 2 + CURVE_OVERHANG,
            beam_top + BEAM_HEIGHT - 1 - CURVE_HALF_WIDTH)  # flat part inside the beam band
        quarter_y = step_y(rest)
        for head_x in (left + 230, left + 320):
            glyph(head_x, quarter_y, 0xE0A4)
            draw.rectangle(
                [head_x, quarter_y, head_x + 2, quarter_y + int(3.5 * INTERLINE)], fill=0)
        bar = left + MEASURE_WIDTH
        draw.rectangle([bar - 1, step_y(0), bar + 1, step_y(8)], fill=0)
    draw.rectangle([right - 8, step_y(0), right, step_y(8)], fill=0)

    page.convert("1").save(output, resolution=300)
