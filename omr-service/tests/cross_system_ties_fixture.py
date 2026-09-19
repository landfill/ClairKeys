"""Generated two-system score: two boundary ties compete with a higher phrase slur.

Bravura glyphs are read from the installed engine; no source-score pixels are used.
"""
import math
import zipfile
from io import BytesIO
from pathlib import Path


def write_pdf(jar_path: Path, output: Path, scenario: str = 'control') -> None:
    from PIL import Image, ImageDraw, ImageFont
    with zipfile.ZipFile(jar_path) as jar:
        font = ImageFont.truetype(BytesIO(jar.read('res/Bravura.otf')), 80)
    page = Image.new('L', (2480, 3508), 255)
    draw = ImageDraw.Draw(page)
    draw.fontmode = '1'

    def glyph(x, y, code):
        draw.text((x, y), chr(code), font=font, fill=0, anchor='ls')

    def curve(x1, x2, y1, y2, bow):
        upper, lower = [], []
        for i in range(161):
            t = i / 160
            x = x1 + (x2 - x1) * t
            y = y1 + (y2 - y1) * t + bow * math.sin(math.pi * t) ** (1.0 if scenario == 'control' else 1.5)
            half = 0.8 + 1.6 * math.sin(math.pi * t)
            upper.append((x, y-half)); lower.append((x, y+half))
        draw.polygon(upper + lower[::-1], fill=0)

    for system, top in enumerate((500, 1050)):
        for line in range(5):
            draw.rectangle((200, top+20*line-1, 2260, top+20*line+1), fill=0)
        glyph(220, top+60, 0xE050)
        if system == 0:
            glyph(300, top+20, 0xE083); glyph(300, top+60, 0xE084)
        for bar in (1240, 2260):
            draw.rectangle((bar-1, top, bar+1, top+80), fill=0)
        for idx, x in enumerate((410, 700, 990, 1400, 1760, 2150)):
            if scenario == 'staff_hugging' and system == 0 and idx == 5:
                continue
            if system == 1 and idx == 0:
                x = 350
            long_chord = scenario == 'staff_hugging' and system == 0 and idx == 4
            steps = (3, 5) if long_chord else (3, 5) if ((system == 0 and idx == 5) or (system == 1 and idx == 0)) else (4,)
            if scenario == 'staff_hugging' and (long_chord or (system == 1 and idx == 0)):
                steps = (2, 4)
            for step in steps:
                glyph(x, top+10*step, 0xE0A3 if scenario == 'staff_hugging' and system == 0 and idx == 3 else 0xE0A4)
            draw.rectangle((x+21, top+10*min(steps)-70, x+23, top+10*max(steps)), fill=0)
        if system == 0:
            if scenario != 'staff_hugging':
                curve(1790 if scenario == 'staff_hugging' else 2180, 2255,
                      top+16 if scenario == 'staff_hugging' else top+20,
                      top+16 if scenario == 'staff_hugging' else top+20, -9)
            curve(1790 if scenario == 'staff_hugging' else 2180, 2255,
                  top+44 if scenario == 'staff_hugging' else top+60,
                  top+44 if scenario == 'staff_hugging' else top+60, 9)
            curve(440, 2140, top+20, top+20, -65)
        else:
            if scenario != 'staff_hugging':
                curve(305,
                      329 if scenario == 'small_arrival' else 342,
                      top+16 if scenario == 'staff_hugging' else top+20,
                      top+16 if scenario == 'staff_hugging' else top+20,
                      -8 if scenario != 'small_arrival' else -7)
            curve(305, 342, top+44 if scenario == 'staff_hugging' else top+60,
                  top+44 if scenario == 'staff_hugging' else top+60, 8)
            curve(300, 980, top-35, top+20, -35)
    page.convert('1').save(output, resolution=300)
