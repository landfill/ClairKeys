"""Synthetic single-staff score of a dotted half under another voice's line head (#134, D-064).

Every 3/4 measure starts with two chords at the same abscissa: an upper-voice
quarter on a staff line (stem up) and a lower-voice dotted half on the line
below (stem down). The only dot lies in the space between the two heads and
belongs to the lower head. Two more upper-voice quarters complete the measure.

Audiveris orders the two chords by their left bound; moving the lower head a
few pixels decides which chord comes first. Each line pair appears twice, once
per chord order.

Glyphs come from the Bravura (SIL OFL) font bundled in the Audiveris jar, so the
fixture is copyright-free and needs no committed image or PDF.
"""
import zipfile
from io import BytesIO
from pathlib import Path

INTERLINE = 20  # pixels; about 300 dpi engraving
STAFF_LEFT, STAFF_TOP = 200, 400
MEASURE_WIDTH = 250
LOWER_SHIFT = 3  # pixels between the two heads' left edges

# (upper line index, lower line index); line 0 is the top line (F5).
LINE_PAIRS = ((3, 4), (2, 3), (1, 2), (0, 1))
ORDERS = ("upper-chord-first", "lower-chord-first")
LINE_PITCHES = ("F5", "D5", "B4", "G4", "E4")

EXPECTED_MEASURES = tuple(
    {"upper": LINE_PITCHES[upper], "lower": LINE_PITCHES[lower], "order": order}
    for upper, lower in LINE_PAIRS
    for order in ORDERS
)


def write_pdf(audiveris_jar: Path, output: Path) -> None:
    from PIL import Image, ImageDraw, ImageFont

    with zipfile.ZipFile(audiveris_jar) as jar:
        bravura = BytesIO(jar.read("res/Bravura.otf"))
    font = ImageFont.truetype(bravura, 4 * INTERLINE)
    page = Image.new("L", (2480, 3508), 255)
    draw = ImageDraw.Draw(page)
    draw.fontmode = "1"  # no antialiasing: exact glyph left abscissas

    def line_y(index):
        return STAFF_TOP + index * INTERLINE

    def glyph(x, y, codepoint):
        draw.text((x, y), chr(codepoint), font=font, fill=0, anchor="ls")

    def quarter_up(x, y):
        glyph(x, y, 0xE0A4)  # black notehead
        draw.rectangle([x + 21, y - int(3.5 * INTERLINE), x + 23, y], fill=0)

    first = STAFF_LEFT + 170
    right = first + MEASURE_WIDTH * len(EXPECTED_MEASURES)
    for index in range(5):
        draw.rectangle([STAFF_LEFT, line_y(index) - 1, right, line_y(index) + 1], fill=0)
    glyph(STAFF_LEFT + 30, line_y(3), 0xE050)   # G clef
    glyph(STAFF_LEFT + 110, line_y(1), 0xE083)  # 3
    glyph(STAFF_LEFT + 110, line_y(3), 0xE084)  # 4

    shapes = [(pair, order) for pair in LINE_PAIRS for order in ORDERS]
    for number, ((upper, lower), order) in enumerate(shapes):
        left = first + number * MEASURE_WIDTH
        upper_x = left + 50
        lower_x = upper_x + (LOWER_SHIFT if order == "upper-chord-first" else -LOWER_SHIFT)
        upper_y, lower_y = line_y(upper), line_y(lower)
        quarter_up(upper_x, upper_y)
        glyph(lower_x, lower_y, 0xE0A3)  # half notehead
        draw.rectangle(
            [lower_x, lower_y, lower_x + 2, lower_y + int(3.5 * INTERLINE)], fill=0)
        glyph(upper_x + 34, lower_y - INTERLINE // 2, 0xE1E7)  # space between heads
        quarter_up(left + 135, upper_y)
        quarter_up(left + 190, upper_y)
        bar = left + MEASURE_WIDTH
        draw.rectangle([bar - 1, line_y(0), bar + 1, line_y(4)], fill=0)
    draw.rectangle([right - 8, line_y(0), right, line_y(4)], fill=0)

    page.convert("1").save(output, resolution=300)
