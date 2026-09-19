"""Synthetic single-staff score of ties next to another voice's aligned chord (#134, D-071).

Two voices share the treble staff: the upper G5 has its stem up, the lower E5
its stem down, and both heads stand at the same abscissa. The tie leaves (m1)
or reaches (m3) the upper G5 while the other end's stem points the opposite
way, so Audiveris's tie box spans both stem tails and covers the lower voice's
chord, like Clair de Lune easy m9 (bass E3/G3 into the C3 chord) and m10 (D5
beside the A4 dotted half). Measures 4 and 5 keep a same-pitch curve over a
genuinely intervening chord; m5 also has an aligned lower voice at its start,
so both must stay slurs.

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
MEASURE_WIDTH = 400
BEAT = 120

# Step 0 is the top line (F5); each step is half an interline downward.
G5, F5, E5 = -1, 0, 1
BLACK, VOID, DOT = 0xE0A4, 0xE0A3, 0xE1E7

# Per measure: notes as (beat, step, head, stem_up, dotted) and curves as
# (from note index, to (measure offset, note index)). m3's lower voice starts on
# beat 2 without a rest: a rest under the stem-down G5 collides with that stem
# and is read as a head.
MEASURES = (
    {"notes": ((0, G5, VOID, True, True), (0, E5, VOID, False, True)), "curves": ((0, (1, 0)),)},
    {"notes": ((0, G5, BLACK, False, False), (1, F5, BLACK, False, False),
               (2, E5, BLACK, False, False)), "curves": ()},
    {"notes": ((0, G5, BLACK, False, False), (1, G5, VOID, True, False),
               (1, E5, VOID, False, False)), "curves": ((0, (0, 1)),)},
    {"notes": ((0, G5, BLACK, False, False), (1, F5, BLACK, False, False),
               (2, G5, BLACK, False, False)), "curves": ((0, (0, 2)),)},
    {"notes": ((0, G5, BLACK, True, False), (1, F5, BLACK, True, False),
               (2, G5, BLACK, True, False), (0, E5, VOID, False, True)), "curves": ((0, (0, 2)),)},
)

# Expected G5 (type, tie types) per measure in MusicXML order.
EXPECTED_G5 = (
    (("half", ["start"]),),
    (("quarter", ["stop"]),),
    (("quarter", ["start"]), ("half", ["stop"])),
    (("quarter", []), ("quarter", [])),
    (("quarter", []), ("quarter", [])),
)


def _arc(draw, x1, x2, y, height):
    """Draw a curve from (x1, y) to (x2, y) bowing upward by height pixels."""
    steps = 160
    top, bottom = [], []
    for i in range(steps + 1):
        t = i / steps
        x = x1 + (x2 - x1) * t
        rise = math.sin(math.pi * t)
        center = y - height * rise
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
    right = first + MEASURE_WIDTH * len(MEASURES)
    for index in range(5):
        y = step_y(2 * index)
        draw.rectangle([STAFF_LEFT, y - 1, right, y + 1], fill=0)
    glyph(STAFF_LEFT + 30, step_y(6), 0xE050)   # G clef
    glyph(STAFF_LEFT + 110, step_y(2), 0xE083)  # 3
    glyph(STAFF_LEFT + 110, step_y(6), 0xE084)  # 4

    def head_x(measure, beat):
        return first + measure * MEASURE_WIDTH + 40 + beat * BEAT

    for number, measure in enumerate(MEASURES):
        for beat, step, head, stem_up, dotted in measure["notes"]:
            x, y = head_x(number, beat), step_y(step)
            glyph(x, y, head)
            if dotted:
                glyph(x + 34, y, DOT)
            if stem_up:
                draw.rectangle([x + 21, y - int(3.5 * INTERLINE), x + 23, y], fill=0)
            else:
                draw.rectangle([x, y, x + 2, y + int(3.5 * INTERLINE)], fill=0)
        for start, (offset, stop) in measure["curves"]:
            beat, step = measure["notes"][start][:2]
            end_beat = MEASURES[number + offset]["notes"][stop][0]
            x1 = head_x(number, beat) + (50 if measure["notes"][start][4] else 28)
            x2 = head_x(number + offset, end_beat) - 4
            _arc(draw, x1, x2, step_y(step) - int(0.8 * INTERLINE), int(0.7 * INTERLINE))
        bar = first + (number + 1) * MEASURE_WIDTH
        draw.rectangle([bar - 1, step_y(0), bar + 1, step_y(8)], fill=0)
    draw.rectangle([right - 8, step_y(0), right, step_y(8)], fill=0)

    page.convert("1").save(output, resolution=300)
