"""Grid lines on bilevel scans with dashed lines.

Usage: python -I glines.py PAGE.png x0 y0 x1 y1 [minfrac] [close]
Ink (grey < 128) is closed along each direction with a line of `close`
px (default 9) to bridge the dashes; column (row) ink fractions over the
region are computed and local peaks above minfrac (default 0.85) are
printed with their darkness-weighted centre.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def peaks(p, off, mf):
    out = []
    for i in range(1, len(p) - 1):
        if p[i] >= mf and p[i] >= p[i - 1] and p[i] >= p[i + 1]:
            a = i
            while a > 0 and p[a - 1] > 0.5 * p[i]:
                a -= 1
            b = i
            while b < len(p) - 1 and p[b + 1] > 0.5 * p[i]:
                b += 1
            if b - a > 10:
                continue
            w = p[a:b + 1]
            c = off + (np.arange(a, b + 1) * w).sum() / w.sum()
            if not out or abs(c - out[-1][0]) > 2:
                out.append((c, p[i]))
    return out


a = sys.argv[1:]
img = np.asarray(Image.open(a[0]).convert("L"), float)
x0, y0, x1, y1 = (int(v) for v in a[1:5])
mf = float(a[5]) if len(a) > 5 else 0.85
cl = int(a[6]) if len(a) > 6 else 9
ink = img[y0:y1, x0:x1] < 128
v = ndimage.binary_closing(ink, structure=np.ones((cl, 1))).mean(axis=0)
h = ndimage.binary_closing(ink, structure=np.ones((1, cl))).mean(axis=1)
print("V:", " ".join("%.1f(%.2f)" % t for t in peaks(v, x0, mf)))
print("H:", " ".join("%.1f(%.2f)" % t for t in peaks(h, y0, mf)))
