"""Print darkness profiles (255 - gray) along a column or row (exploratory).

usage: python3 -I profiles.py PAGE.png col X Y0 Y1 [avg]
       python3 -I profiles.py PAGE.png row Y X0 X1 [avg]
avg: number of neighbouring columns/rows averaged (default 1).
"""
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
d = 255.0 - np.asarray(Image.open(sys.argv[1]).convert("L")).astype(float)
kind = sys.argv[2]
c, a, b = (int(v) for v in sys.argv[3:6])
n = int(sys.argv[6]) if len(sys.argv) > 6 else 1
h = n // 2
if kind == "col":
    prof = d[a:b, c - h:c - h + n].mean(axis=1)
else:
    prof = d[c - h:c - h + n, a:b].mean(axis=0)
for i, v in enumerate(prof):
    if v > 25:
        print(a + i, int(v), "#" * int(v / 8))
