"""Generated two-system scores with boundary ties and a competing phrase slur.

The staff-hugging case ties both heads of a line-head chord. The small-arrival case uses a short upper half near
the next system's header. Bravura comes from the engine, not source-score pixels.
"""
import math
import zipfile
from io import BytesIO
from pathlib import Path


def write_pdf(jar_path: Path, output: Path, scenario: str = 'control') -> None:
    from PIL import Image, ImageDraw, ImageFont
    if scenario not in ('control', 'staff_hugging', 'small_arrival'):
        raise ValueError(scenario)
    hugging = scenario == 'staff_hugging'
    small = scenario == 'small_arrival'
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
            rise = math.sin(math.pi * t)
            x = x1 + (x2 - x1) * t
            y = y1 + (y2 - y1) * t + bow * rise ** (1.0 if scenario == 'control' else 1.5)
            half = 0.8 + 1.6 * rise
            upper.append((x, y-half))
            lower.append((x, y+half))
        draw.polygon(upper + lower[::-1], fill=0)

    for system, top in enumerate((500, 1050)):
        for line in range(5):
            draw.rectangle((200, top+20*line-1, 2260, top+20*line+1), fill=0)
        glyph(220, top+60, 0xE050)
        if system == 0:
            glyph(300, top+20, 0xE083)
            glyph(300, top+60, 0xE084)
        for bar in (1240, 2260):
            draw.rectangle((bar-1, top, bar+1, top+80), fill=0)
        for idx, x in enumerate((410, 700, 990, 1400, 1760, 2150)):
            if hugging and system == 0 and idx == 5:
                continue
            arrival = system == 1 and idx == 0
            if arrival:
                x = 350
            departure = system == 0 and idx == (4 if hugging else 5)
            steps = ((2, 4) if hugging else (3, 5)) if departure or arrival else (4,)
            half_note = hugging and system == 0 and idx == 3
            for step in steps:
                glyph(x, top+10*step, 0xE0A3 if half_note else 0xE0A4)
            draw.rectangle((x+21, top+10*min(steps)-70, x+23, top+10*max(steps)), fill=0)
        lower_y = top + (44 if hugging else 60)
        if system == 0:
            upper_y = top + (16 if hugging else 20)
            curve(1790 if hugging else 2180, 2255, upper_y, upper_y, -9)
            curve(1790 if hugging else 2180, 2255, lower_y, lower_y, 9)
            curve(440, 1740 if hugging else 2140, top+20, top+20, -65)
        else:
            upper_y = top + (16 if hugging else 20)
            curve(305, 329 if small else 342, upper_y, upper_y, -7 if small else -8)
            curve(305, 342, lower_y, lower_y, 8)
            curve(300, 980, top-35, top+20, -35)
    page.convert('1').save(output, resolution=300)
