"""Render a page (600 dpi, grey) and write a view of a box with a pixel ruler,
so regions and seeds can be picked by eye.

Usage: python3 -I view.py <pdf> <page> <workdir> <out.png> [x0 y0 x1 y1] [scale] [step]
Coordinates are full-page render pixels at 600 dpi.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import dig  # noqa: E402


def main():
    pdf, page, work, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
    png = dig.render(pdf, page, work)
    im = Image.open(png).convert("L")
    if len(sys.argv) >= 9:
        box = tuple(int(v) for v in sys.argv[5:9])
    else:
        box = (0, 0, im.width, im.height)
    scale = float(sys.argv[9]) if len(sys.argv) >= 10 else 0.25
    step = int(sys.argv[10]) if len(sys.argv) >= 11 else 200
    sub = im.crop(box).convert("RGB")
    d = ImageDraw.Draw(sub)
    x0, y0, x1, y1 = box
    for x in range((x0 // step + 1) * step, x1, step):
        d.line((x - x0, 0, x - x0, sub.height), fill=(255, 0, 0) if x % (5 * step) == 0 else (255, 160, 160), width=1)
        d.text((x - x0 + 2, 2), str(x), fill=(255, 0, 0))
    for y in range((y0 // step + 1) * step, y1, step):
        d.line((0, y - y0, sub.width, y - y0), fill=(0, 0, 255) if y % (5 * step) == 0 else (160, 160, 255), width=1)
        d.text((2, y - y0 + 2), str(y), fill=(0, 0, 255))
    sub = sub.resize((max(1, int(sub.width * scale)), max(1, int(sub.height * scale))), Image.LANCZOS)
    sub.save(out)
    print(out, im.width, im.height)


if __name__ == "__main__":
    main()
