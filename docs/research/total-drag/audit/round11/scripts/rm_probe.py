"""Find approximate gridline positions in a panel (exploratory).

usage: python3 -I rm_probe.py PAGE.png x0 y0 x1 y1
Prints columns and rows whose mean darkness over the box is a local peak
well above the median (candidate gridlines), as run centres.
"""
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
d = 255.0 - np.asarray(Image.open(sys.argv[1]).convert("L")).astype(float)
x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
blk = d[y0:y1, x0:x1]


def runs(p, off, thr):
    out = []
    i = 0
    while i < len(p):
        if p[i] > thr:
            j = i
            while j < len(p) and p[j] > thr:
                j += 1
            w = p[i:j]
            out.append(round(off + (np.arange(i, j) * w).sum() / w.sum(), 1))
            i = j
        else:
            i += 1
    return out


cp = blk.mean(axis=0)
rp = blk.mean(axis=1)
print("columns:", runs(cp, x0, np.median(cp) + 0.35 * (cp.max() - np.median(cp))))
print("rows:", runs(rp, y0, np.median(rp) + 0.35 * (rp.max() - np.median(rp))))
