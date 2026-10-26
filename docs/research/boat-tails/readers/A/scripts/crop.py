"""Crop a region of a page scan, optionally rotate, upscale for viewing.

usage: python3 -I crop.py IN OUT ROT X0 Y0 X1 Y1 SCALE [grid]
ROT is applied first (0, 90, 180, 270 counterclockwise degrees, PIL convention),
then the crop box (in rotated-image pixel coordinates), then upscale by SCALE
(nearest neighbour, so pixels are not invented).
If 'grid' is given, a light pixel-coordinate grid is drawn every 50 source px
and labelled, to read positions off the view.
"""
import sys
from PIL import Image, ImageDraw

inp, out, rot = sys.argv[1], sys.argv[2], int(sys.argv[3])
x0, y0, x1, y1 = map(int, sys.argv[4:8])
scale = float(sys.argv[8])
grid = len(sys.argv) > 9 and sys.argv[9] == 'grid'
im = Image.open(inp).convert('RGB')
if rot:
    im = im.rotate(rot, expand=True)
c = im.crop((x0, y0, x1, y1))
c = c.resize((int(c.width * scale), int(c.height * scale)), Image.NEAREST)
if grid:
    d = ImageDraw.Draw(c)
    step = 50
    gx = (x0 // step + 1) * step
    while gx < x1:
        X = (gx - x0) * scale
        d.line([(X, 0), (X, c.height)], fill=(0, 160, 255), width=1)
        d.text((X + 2, 2), str(gx), fill=(0, 0, 255))
        gx += step
    gy = (y0 // step + 1) * step
    while gy < y1:
        Y = (gy - y0) * scale
        d.line([(0, Y), (c.width, Y)], fill=(255, 120, 0), width=1)
        d.text((2, Y + 2), str(gy), fill=(200, 0, 0))
        gy += step
c.save(out)
print(im.size, c.size)
