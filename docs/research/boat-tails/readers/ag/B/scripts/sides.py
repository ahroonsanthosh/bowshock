"""Outermost stroke positions, row by row, of a vertical stack of open
symbols.

Usage: python -I sides.py PAGE.png xc halfspan y0 y1 [thr]
For each row y in [y0, y1), scans from xc - halfspan inward to find the
first dark run (grey < thr, default 160) and from xc + halfspan inward
for the right one; prints the darkness-weighted centre of each run, the
width between them and the mid point.  Rows where a long horizontal
line crosses (dark run longer than 8 px) are marked.
"""
import sys

import numpy as np
from PIL import Image


def run_centre(vals, idx, step, thr):
    # vals: grey row, start idx, step +1 (left->right) or -1
    n = len(vals)
    i = idx
    while 0 <= i < n and vals[i] >= thr:
        i += step
    if not (0 <= i < n):
        return None, 0
    j = i
    while 0 <= j + step < n and vals[j + step] < thr:
        j += step
    a, b = min(i, j), max(i, j)
    w = 255.0 - vals[a:b + 1]
    c = (np.arange(a, b + 1) * w).sum() / w.sum()
    return c, b - a + 1


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    xc, hs, y0, y1 = (int(v) for v in a[1:5])
    thr = float(a[5]) if len(a) > 5 else 160
    for y in range(y0, y1):
        row = img[y, xc - hs:xc + hs + 1]
        l, lw = run_centre(row, 0, 1, thr)
        r, rw = run_centre(row, len(row) - 1, -1, thr)
        if l is None or r is None:
            print(y, "-")
            continue
        L = xc - hs + l
        R = xc - hs + r
        mark = " LINE" if (lw > 8 or rw > 8) else ""
        print("%d  L=%.1f(w%d)  R=%.1f(w%d)  width=%.1f  mid=%.1f%s" % (y, L, lw, R, rw, R - L, (L + R) / 2, mark))


if __name__ == "__main__":
    main()
