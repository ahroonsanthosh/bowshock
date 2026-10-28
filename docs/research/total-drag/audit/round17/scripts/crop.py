"""Crop a region of a native page image and upscale it (nearest neighbour) for viewing.

usage: python3 -I crop.py PAGE.npy OUT.png X0 Y0 X1 Y1 SCALE [grid]
With 'grid', draws faint tick marks every 10 native pixels along the border
so pixel positions can be read off the view.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

ink = np.load(sys.argv[1])
out = sys.argv[2]
x0, y0, x1, y1, sc = map(int, sys.argv[3:8])
grid = len(sys.argv) > 8 and sys.argv[8] == 'grid'
c = ink[y0:y1, x0:x1]
img = np.where(c == 1, 0, 255).astype(np.uint8)
rgb = np.stack([img] * 3, -1)
im = Image.fromarray(rgb).resize(((x1 - x0) * sc, (y1 - y0) * sc), Image.NEAREST)
if grid:
    d = ImageDraw.Draw(im)
    for x in range(x0 - x0 % 10, x1, 10):
        if x < x0:
            continue
        X = (x - x0) * sc
        L = 12 if x % 50 == 0 else 5
        d.line([(X, 0), (X, L)], fill=(255, 0, 0))
        d.line([(X, im.height - L), (X, im.height)], fill=(255, 0, 0))
        if x % 50 == 0:
            d.text((X + 2, 12), str(x), fill=(255, 0, 0))
    for y in range(y0 - y0 % 10, y1, 10):
        if y < y0:
            continue
        Y = (y - y0) * sc
        L = 12 if y % 50 == 0 else 5
        d.line([(0, Y), (L, Y)], fill=(0, 0, 255))
        d.line([(im.width - L, Y), (im.width, Y)], fill=(0, 0, 255))
        if y % 50 == 0:
            d.text((14, Y + 1), str(y), fill=(0, 0, 255))
im.save(out)
print(out, im.size)
