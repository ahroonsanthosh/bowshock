"""Crop a region of a rendered page and save it for viewing.

usage: crop.py page.png out.png x0 y0 x1 y1 [scale] [grid_step]
Coordinates are in the pixels of the rendered page. scale resizes the crop.
If grid_step is given, faint tick labels of page pixel coordinates are drawn
along the edges every grid_step page pixels (for locating things only).
"""
import sys
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None

src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
scale = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
grid = int(sys.argv[8]) if len(sys.argv) > 8 else 0

im = Image.open(src).convert("RGB")
c = im.crop((x0, y0, x1, y1))
if scale != 1.0:
    c = c.resize((max(1, int(c.width * scale)), max(1, int(c.height * scale))), Image.LANCZOS)
if grid:
    d = ImageDraw.Draw(c)
    gx = (x0 // grid + 1) * grid
    while gx < x1:
        px = (gx - x0) * scale
        d.line([(px, 0), (px, 12)], fill=(255, 0, 0))
        d.line([(px, c.height - 12), (px, c.height)], fill=(255, 0, 0))
        d.text((px + 2, 0), str(gx), fill=(255, 0, 0))
        gx += grid
    gy = (y0 // grid + 1) * grid
    while gy < y1:
        py = (gy - y0) * scale
        d.line([(0, py), (12, py)], fill=(255, 0, 0))
        d.line([(c.width - 12, py), (c.width, py)], fill=(255, 0, 0))
        d.text((14, py - 5), str(gy), fill=(255, 0, 0))
        gy += grid
c.save(out)
print(out, c.size)
