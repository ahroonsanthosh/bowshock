"""Row darkness profile between vertical gridlines (exploratory, BRL 934 Graph I).

usage: python3 -I brl_rows.py PAGE.png x0 x1 y0 y1 VLINES_CSV
Mean darkness of each row over x0..x1 with +-8 px around each vertical
gridline position (comma separated) left out; prints every local maximum
with its darkness, so heavy rulings and fine rulings can be told apart.
"""
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
d = 255.0 - np.asarray(Image.open(sys.argv[1]).convert("L")).astype(float)
x0, x1, y0, y1 = (int(v) for v in sys.argv[2:6])
vl = [float(v) for v in sys.argv[6].split(",")] if sys.argv[6] != "none" else []
cols = np.arange(x0, x1)
keep = np.ones(len(cols), bool)
for v in vl:
    keep &= np.abs(cols - v) > 8
p = d[y0:y1, x0:x1][:, keep].mean(axis=1)
ps = np.convolve(p, np.ones(3) / 3, mode="same")
for i in range(2, len(ps) - 2):
    if ps[i] >= ps[i - 1] and ps[i] > ps[i + 1] and ps[i] > 25:
        w = p[i - 2:i + 3]
        c = (np.arange(i - 2, i + 3) * w).sum() / w.sum()
        print("%.1f %.0f" % (y0 + c, ps[i]))
