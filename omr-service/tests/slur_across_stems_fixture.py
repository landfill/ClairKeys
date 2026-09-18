"""Synthetic single-staff score of a slur crossing the stems of a beamed group (#134, D-065).

Every 3/4 measure holds four beamed eighths with stems down, then one quarter. A
slur runs above the beam and crosses every stem of the group, like Deborah's Theme
m24 left hand. Its flat part spans two stems, so a rule that pulls a beam end back
to the stem seed inside it can turn that curve into a second, false beam group and
emit each beamed note twice.

The curve is drawn thinner than the beam, the way slur ink is thinner than beam ink
on a real engraving, but still above the 0.7 ratio that the beam height check alone
accepts. That is the margin the trim guard has to judge.

Glyphs come from the Bravura (SIL OFL) font bundled in the Audiveris jar and the
slur is a drawn curve, so the fixture is copyright-free and needs no committed
image or PDF.
"""
import zipfile
from io import BytesIO
from pathlib import Path

INTERLINE = 20  # pixels; about 300 dpi engraving
STAFF_LEFT, STAFF_TOP = 200, 400
MEASURE_WIDTH = 460
BEAM_HEIGHT = 14  # pixels, as measured on the Clair left hand
CURVE_HEIGHT = 11  # pixels; measured ratio on Deborah m24 is 9.8 against a typical beam of 11
CURVE_OVERHANG = 45  # pixels the curve runs past the outer stems
CURVE_RISE = 45  # pixels between the beam and the flat part of the curve, as on Deborah m24
STEM_SPACING = 70

# (beamed eighths step, quarter step); step 0 is the top line (F5) and each step is
# half an interline downward, so odd steps are spaces.
PAIRS = ((5, 3), (6, 4), (7, 5), (8, 6))
STEP_PITCHES = ("F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4")

EXPECTED_MEASURES = tuple(
    {"eighths": STEP_PITCHES[beamed], "quarter": STEP_PITCHES[rest]}
    for beamed, rest in PAIRS
)


def _slur_across(draw, x1, x2, y):
    """Draw a slur whose flat part sits level at y and falls away at both ends.

    The flat part is what crosses the stems. It keeps CURVE_HEIGHT thickness while it
    is level and thins out as it leaves the group, the way an engraved slur does.
    """
    steps = 320
    flat = 0.6  # fraction of the half span that stays level
    top, bottom = [], []
    for index in range(steps + 1):
        t = index / steps
        x = x1 + (x2 - x1) * t
        u = abs((2 * t) - 1)
        away = max(0.0, (u - flat) / (1 - flat))
        center = y + 0.6 * INTERLINE * away ** 1.5
        half = (CURVE_HEIGHT / 2) - 3 * away
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
        stem_xs = [left + 40 + STEM_SPACING * i for i in range(4)]
        beam_top = head_y + int(4.5 * INTERLINE)
        for head_x in stem_xs:
            glyph(head_x, head_y, 0xE0A4)  # black notehead
            draw.rectangle([head_x, head_y, head_x + 2, beam_top + BEAM_HEIGHT], fill=0)
        draw.rectangle(
            [stem_xs[0], beam_top, stem_xs[-1] + 2, beam_top + BEAM_HEIGHT - 1], fill=0)
        # The slur crosses every stem of the group, well above the beam.
        _slur_across(
            draw, stem_xs[0] - CURVE_OVERHANG, stem_xs[-1] + 2 + CURVE_OVERHANG,
            beam_top - CURVE_RISE)
        quarter_y = step_y(rest)
        head_x = left + 350
        glyph(head_x, quarter_y, 0xE0A4)
        draw.rectangle([head_x, quarter_y, head_x + 2, quarter_y + int(3.5 * INTERLINE)], fill=0)
        bar = left + MEASURE_WIDTH
        draw.rectangle([bar - 1, step_y(0), bar + 1, step_y(8)], fill=0)
    draw.rectangle([right - 8, step_y(0), right, step_y(8)], fill=0)

    page.convert("1").save(output, resolution=300)
