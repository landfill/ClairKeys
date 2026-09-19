"""Synthetic single-staff score of two voices sharing one stem (#134, D-067/D-068).

Every 3/4 measure opens with a beamed pair of eighths, stems down. The first stem
also carries a lower voice: a dotted half written as a void head a few steps below
the eighth's black head, on the same stem and with its own augmentation dot. A
quarter and another quarter close the measure. Clair de Lune m5 opens this way.

A rule that excludes heads of different intrinsic duration on one stem makes the
void head lose to the black eighth on contextual grade, and the dotted half is
lost. Keeping it in the beamed chord gives it the wrong duration.
The black_seconds variant instead engraves a dotted quarter displaced beside
a plain eighth; the undotted control must remain one ordinary eighth chord.

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
STEM_WIDTH = 3
BEAM_DROP = int(3.5 * INTERLINE)  # from the lowest head on a stem down to its beam

# Per measure: (step of the beamed eighths, step of the shared void head, step of
# the two quarters). Step 0 is the top line (F5); each step is half an interline
# downward, so odd steps are spaces. The void head sits a fourth below the eighth,
# as on Clair m5 (B4 over F4), and always on a space so its dot needs no shift.
MEASURES = ((4, 7, 3), (2, 5, 1), (6, 9, 5))
STEP_PITCHES = ("F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4", "D4")

EXPECTED_MEASURES = tuple(
    {
        "eighths": STEP_PITCHES[beamed],
        "dotted_half": STEP_PITCHES[shared],
        "quarters": STEP_PITCHES[quarter],
    }
    for beamed, shared, quarter in MEASURES
)


def write_pdf(audiveris_jar: Path, output: Path, *, black_seconds: bool = False, dots: str = "shared") -> None:
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
    right = first + MEASURE_WIDTH * len(MEASURES)
    for index in range(5):
        y = step_y(2 * index)
        draw.rectangle([STAFF_LEFT, y - 1, right, y + 1], fill=0)
    glyph(STAFF_LEFT + 30, step_y(6), 0xE050)   # G clef
    glyph(STAFF_LEFT + 110, step_y(2), 0xE083)  # 3
    glyph(STAFF_LEFT + 110, step_y(6), 0xE084)  # 4

    void_box = draw.textbbox((0, 0), chr(0xE0A3), font=font, anchor="ls")
    void_width = void_box[2] - void_box[0]
    black_box = draw.textbbox((0, 0), chr(0xE0A4), font=font, anchor="ls")
    black_width = black_box[2] - black_box[0]

    for number, (beamed, shared, quarter) in enumerate(MEASURES):
        left = first + number * MEASURE_WIDTH
        eighth_y = step_y(beamed)
        shared_y = step_y(beamed + 1 if black_seconds else shared)
        if black_seconds:
            # Stem up: the dotted lower second sits to the right of the stem.
            beam_top = eighth_y - BEAM_DROP
            stem_xs = [left + 40 + black_width - 1, left + 120 + black_width - 1]
            for stem_x in stem_xs:
                glyph(stem_x - black_width + 1, eighth_y, 0xE0A4)
                draw.rectangle([stem_x - STEM_WIDTH + 1, beam_top,
                                stem_x, shared_y if stem_x == stem_xs[0] else eighth_y], fill=0)
            draw.rectangle([stem_xs[0] - STEM_WIDTH + 1, beam_top,
                            stem_xs[-1], beam_top + BEAM_HEIGHT - 1], fill=0)
            glyph(stem_xs[0], shared_y, 0xE0A4)
            if dots != "none":
                glyph(stem_xs[0] + void_width + INTERLINE // 2, shared_y, 0xE1E7)
            if dots == "both":
                glyph(stem_xs[0] + void_width + INTERLINE // 2,
                      eighth_y - INTERLINE // 2 if beamed % 2 == 0 else eighth_y, 0xE1E7)
        else:
            beam_top = max(eighth_y, shared_y) + BEAM_DROP
            # Stems down stand at the left edge of their heads.
            stem_xs = [left + 40, left + 120]
            for stem_x in stem_xs:
                glyph(stem_x, eighth_y, 0xE0A4)  # black notehead
                draw.rectangle(
                    [stem_x, eighth_y, stem_x + STEM_WIDTH - 1, beam_top + BEAM_HEIGHT - 1], fill=0)
            draw.rectangle(
                [stem_xs[0], beam_top, stem_xs[-1] + STEM_WIDTH - 1, beam_top + BEAM_HEIGHT - 1],
                fill=0)
            # The lower voice shares the first stem: a void head below the eighth, with
            # its augmentation dot in the same space just right of it.
            glyph(stem_xs[0], shared_y, 0xE0A3)  # void (half) notehead
            if dots != "none":
                glyph(stem_xs[0] + void_width + INTERLINE // 2, shared_y, 0xE1E7)
            if dots == "both":
                glyph(stem_xs[0] + void_width + INTERLINE // 2,
                      eighth_y - INTERLINE // 2 if beamed % 2 == 0 else eighth_y, 0xE1E7)  # augmentation dot

        # Two quarters, stems down, finish the upper voice's three beats.
        for head_x in (left + 230, left + 340):
            quarter_y = step_y(quarter)
            glyph(head_x, quarter_y, 0xE0A4)
            draw.rectangle(
                [head_x, quarter_y, head_x + STEM_WIDTH - 1, quarter_y + int(3.5 * INTERLINE)],
                fill=0)

        bar = left + MEASURE_WIDTH
        draw.rectangle([bar - 1, step_y(0), bar + 1, step_y(8)], fill=0)
    draw.rectangle([right - 8, step_y(0), right, step_y(8)], fill=0)

    page.convert("1").save(output, resolution=300)
