"""Measure a glyph type's size on isolated glyphs: for each size, the best
centre's score; the size with the best mean score is used for the figure.

usage: python3 -I sizescan.py PAGE.png CAL.json KIND SW SIZES x:y [x:y ...]
KIND e.g. circle, square, diamond, tri_up (tri sizes as b/h, e.g. 7/12).
SIZES comma list.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import calmap  # noqa: E402
import glyph  # noqa: E402

Image.MAX_IMAGE_PIXELS = None
g = np.array(Image.open(sys.argv[1]).convert("L"), float)
cal = calmap.Cal(sys.argv[2])
kind, sw = sys.argv[3], float(sys.argv[4])
sizes = sys.argv[5].split(",")
pts = [tuple(map(float, a.split(":"))) for a in sys.argv[6:]]
ink = glyph.ink_map(g)
x0 = int(min(p[0] for p in pts)) - 60
y0 = int(min(p[1] for p in pts)) - 60
x1 = int(max(p[0] for p in pts)) + 60
y1 = int(max(p[1] for p in pts)) + 60
# mask only a sub-image for speed
sub = ink[y0:y1, x0:x1]
c2 = calmap.Cal(sys.argv[2])
for l in c2.V:
    l["a"] = l["a"] - x0 + l["b"] * y0
for l in c2.H:
    l["a"] = l["a"] - y0 + l["b"] * x0
wm = (~c2.mask(sub.shape, 2.0)).astype(float)
for s in sizes:
    shape = (kind,) + tuple(float(v) for v in s.split("/"))
    res = [glyph.fit_one(sub, wm, shape, x - x0, y - y0, sw=sw) for x, y in pts]
    print(s, round(float(np.mean([r[0] for r in res])), 4), [(round(r[0], 3), round(r[1] + x0, 2), round(r[2] + y0, 2)) for r in res])
