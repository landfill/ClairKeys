"""Synthetic single-staff score of a second written across a stem (#134, D-066).

Every 3/4 measure holds four beamed eighths with stems up, then one quarter. On the
second eighth an upper voice and a lower voice share one vertical line: the upper
head keeps the normal place on the left of it and the lower head, a second below,
is displaced to the right, the way a second has to be engraved. The line runs on
below that lower head, because the lower voice is stemmed downwards. Clair de Lune
m5 and m7 carry this shape in the right hand.

The engine splits that long line into two stem pieces, one above the heads and one
below. Measured against the upper piece alone, the displaced head looks like a head
sitting at a stem end on the non-canonical side, so it is pruned from the stem and
then deleted for having no stem, and the chord loses its lower note. That is what
this fixture pins.

Glyphs come from the Bravura (SIL OFL) font bundled in the Audiveris jar, so the
fixture is copyright-free and needs no committed image or PDF.
"""
import zipfile
from io import BytesIO
from pathlib import Path

INTERLINE = 20  # pixels; about 300 dpi engraving
STAFF_LEFT, STAFF_TOP = 200, 700
MEASURE_WIDTH = 460
BEAM_HEIGHT = 14
STEM_SPACING = 80
STEM_WIDTH = 3
STEM_LENGTH = int(3.5 * INTERLINE)  # head to beam, as on a normal engraving

# Offsets measured on Clair m5, whose interline is close to this one. The upper
# voice's stem stops just inside the top of the displaced head and the lower
# voice's stem starts again just below that, so the head itself breaks the line
# and the engine reads two stem pieces rather than one.
UPPER_STEM_END = -6      # relative to the displaced head's centre (Clair: 1236 vs 1242)
LOWER_STEM_START = -1    # relative to the displaced head's centre (Clair: 1241 vs 1242)
LOWER_VOICE_STEM = 51    # pixels the lower voice's stem runs on (Clair: 1241 to 1292)
SECOND_DROP = 9          # centre-to-centre of the two heads (Clair: 1233 vs 1242)
HEAD_STEM_BITE = 2       # columns of the stem each head covers

# Per measure: (step of the four beamed eighths, step of the upper head of the
# second, step of the closing quarter). Step 0 is the top line (F5) and each step
# is half an interline downward, so odd steps are spaces. The lower head of the
# second always sits one step below the upper one.
MEASURES = ((4, 4, 2), (5, 5, 3), (6, 6, 4), (3, 3, 1))
STEP_PITCHES = ("F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4", "D4")

# The chord is on the second eighth of each group.
CHORD_INDEX = 1

EXPECTED_MEASURES = tuple(
    {
        "eighths": STEP_PITCHES[beamed],
        "chord": (STEP_PITCHES[upper], STEP_PITCHES[upper + 1]),  # upper == beamed
        "quarter": STEP_PITCHES[quarter],
    }
    for beamed, upper, quarter in MEASURES
)


def write_pdf(audiveris_jar: Path, output: Path) -> None:
    from PIL import Image, ImageDraw, ImageFont

    with zipfile.ZipFile(audiveris_jar) as jar:
        bravura = BytesIO(jar.read("res/Bravura.otf"))
    font = ImageFont.truetype(bravura, 4 * INTERLINE)
    page = Image.new("L", (2480, 3508), 255)
    draw = ImageDraw.Draw(page)
    draw.fontmode = "1"  # no antialiasing

    black_head = chr(0xE0A4)
    head_box = draw.textbbox((0, 0), black_head, font=font, anchor="ls")
    head_width = head_box[2] - head_box[0]

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

    for number, (beamed, upper, quarter) in enumerate(MEASURES):
        left = first + number * MEASURE_WIDTH
        head_y = step_y(beamed)
        # Stems go up, so each stem stands at the right edge of its head.
        head_xs = [left + 40 + STEM_SPACING * i for i in range(4)]
        stem_xs = [x + head_width - HEAD_STEM_BITE for x in head_xs]
        beam_bottom = head_y - STEM_LENGTH
        for index, (head_x, stem_x) in enumerate(zip(head_xs, stem_xs)):
            glyph(head_x, head_y, 0xE0A4)
            if index != CHORD_INDEX:
                draw.rectangle(
                    [stem_x, beam_bottom, stem_x + STEM_WIDTH - 1, head_y], fill=0)
                continue

            # A second: the lower head is displaced to the right of the stem and
            # only its left columns touch it, so the head breaks the vertical run.
            lower_y = head_y + SECOND_DROP
            glyph(stem_x + STEM_WIDTH - HEAD_STEM_BITE, lower_y, 0xE0A4)
            # Upper voice: stem up to the beam, stopping inside the head's top.
            draw.rectangle(
                [stem_x, beam_bottom, stem_x + STEM_WIDTH - 1,
                 lower_y + UPPER_STEM_END], fill=0)
            # Lower voice: its own stem runs downwards from just below that.
            draw.rectangle(
                [stem_x, lower_y + LOWER_STEM_START, stem_x + STEM_WIDTH - 1,
                 lower_y + LOWER_STEM_START + LOWER_VOICE_STEM], fill=0)
        draw.rectangle(
            [stem_xs[0], beam_bottom, stem_xs[-1] + STEM_WIDTH - 1,
             beam_bottom + BEAM_HEIGHT - 1], fill=0)

        quarter_y = step_y(quarter)
        head_x = left + 350
        glyph(head_x, quarter_y, 0xE0A4)
        draw.rectangle(
            [head_x + head_width - STEM_WIDTH, quarter_y - STEM_LENGTH,
             head_x + head_width - 1, quarter_y], fill=0)

        bar = left + MEASURE_WIDTH
        draw.rectangle([bar - 1, step_y(0), bar + 1, step_y(8)], fill=0)
    draw.rectangle([right - 8, step_y(0), right, step_y(8)], fill=0)

    page.convert("1").save(output, resolution=300)
