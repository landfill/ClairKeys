"""Synthetic single-staff score of dotted-half line-line thirds (#134, D-062).

Every measure holds one 3/4 dotted-half chord whose two heads sit on adjacent
staff lines, so one dot lies in the space above the chord and the other in the
space between the heads. Audiveris sorts dots by integer left abscissa only;
shifting one dot by two pixels therefore decides which dot is processed first.
Each chord shape appears twice, once per processing order.

Glyphs come from the Bravura (SIL OFL) font bundled in the Audiveris jar, so the
fixture is copyright-free and needs no committed image or PDF.
"""
import zipfile
from io import BytesIO
from pathlib import Path

INTERLINE = 20  # pixels; about 300 dpi engraving
STAFF_LEFT, STAFF_TOP = 200, 400
MEASURE_WIDTH = 250

# (upper line index, lower line index, stem up); line 0 is the top line (F5).
CHORDS = ((3, 4, True), (2, 3, True), (1, 2, False), (0, 1, False))
ORDERS = ("lower-first", "upper-first")
LINE_PITCHES = ("F5", "D5", "B4", "G4", "E4")

EXPECTED_MEASURES = tuple(
    {"pitches": (LINE_PITCHES[lower], LINE_PITCHES[upper]), "order": order}
    for upper, lower, _ in CHORDS
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

    first = STAFF_LEFT + 170
    right = first + MEASURE_WIDTH * len(EXPECTED_MEASURES)
    for index in range(5):
        draw.rectangle([STAFF_LEFT, line_y(index) - 1, right, line_y(index) + 1], fill=0)
    glyph(STAFF_LEFT + 30, line_y(3), 0xE050)   # G clef
    glyph(STAFF_LEFT + 110, line_y(1), 0xE083)  # 3
    glyph(STAFF_LEFT + 110, line_y(3), 0xE084)  # 4

    shapes = [(chord, order) for chord in CHORDS for order in ORDERS]
    for number, ((upper, lower, stem_up), order) in enumerate(shapes):
        left = first + number * MEASURE_WIDTH
        head_x = left + 90
        upper_y, lower_y = line_y(upper), line_y(lower)
        glyph(head_x, upper_y, 0xE0A3)  # half notehead
        glyph(head_x, lower_y, 0xE0A3)
        if stem_up:
            draw.rectangle(
                [head_x + 21, upper_y - int(3.5 * INTERLINE), head_x + 23, lower_y], fill=0)
        else:
            draw.rectangle(
                [head_x, upper_y, head_x + 2, lower_y + int(3.5 * INTERLINE)], fill=0)
        dot_x = head_x + 34
        upper_dot_x, lower_dot_x = (
            (dot_x + 2, dot_x) if order == "lower-first" else (dot_x, dot_x + 2))
        glyph(upper_dot_x, upper_y - INTERLINE // 2, 0xE1E7)  # space above upper head
        glyph(lower_dot_x, lower_y - INTERLINE // 2, 0xE1E7)  # space between heads
        bar = left + MEASURE_WIDTH
        draw.rectangle([bar - 1, line_y(0), bar + 1, line_y(4)], fill=0)
    draw.rectangle([right - 8, line_y(0), right, line_y(4)], fill=0)

    page.convert("1").save(output, resolution=300)
