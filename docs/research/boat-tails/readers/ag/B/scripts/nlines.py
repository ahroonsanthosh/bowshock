"""Line peaks on a (possibly rotated) native page image.

Usage: python -I nlines.py IMG.png rot x0 y0 x1 y1 minfrac
rot: number of clockwise quarter turns applied first (0..3).
Prints column and row ink-fraction peaks above minfrac, with the
darkness-weighted centre over the peak (+-2 px).
"""
import sys

import numpy as np
from PIL import Image

a = sys.argv[1:]
img = np.asarray(Image.open(a[0]).convert("L"))
img = np.rot90(img, -int(a[1]))
x0, y0, x1, y1 = (int(v) for v in a[2:6])
mf = float(a[6])
ink = img[y0:y1, x0:x1] < 128
for name, p, off in (("V", ink.mean(axis=0), x0), ("H", ink.mean(axis=1), y0)):
    out = []
    for i in range(2, len(p) - 2):
        if p[i] >= mf and p[i] == p[i - 2:i + 3].max():
            w = p[i - 2:i + 3]
            c = off + i - 2 + (np.arange(5) * w).sum() / w.sum()
            if not out or c - out[-1][0] > 3:
                out.append((c, p[i]))
    print(name, " ".join("%.1f(%.2f)" % t for t in out))
