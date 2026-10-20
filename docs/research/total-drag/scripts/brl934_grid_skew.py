"""Track continuous grid lines across a scanned graph to measure skew.
usage: grid_skew.py image axis y0 y1 x_from x_to x_step width thr
axis = h: find horizontal lines (rows) in vertical strips; v: vertical lines (columns) in horizontal strips."""
import sys
import numpy as np
from PIL import Image

im = np.asarray(Image.open(sys.argv[1]).convert("L")) < 128
axis = sys.argv[2]
a0, a1, b_from, b_to, b_step, width = (int(v) for v in sys.argv[3:9])
thr = float(sys.argv[9])
if axis == "v":
    im = im.T
for b in range(b_from, b_to + 1, b_step):
    strip = im[a0:a1, b:b + width]
    prof = strip.mean(axis=1)
    rows = [i + a0 for i, v in enumerate(prof) if v > thr]
    g = []
    for r in rows:
        if g and r - g[-1][-1] <= 2:
            g[-1].append(r)
        else:
            g.append([r])
    cs = [round(float(np.mean(x)), 1) for x in g]
    print(b, len(cs), cs)
