"""List long straight vertical and horizontal lines in a region.

Usage: python -I lines.py PAGE.png x0 y0 x1 y1 [thr] [minfrac]
Prints the positions (darkness-weighted centre) of columns / rows in
which at least minfrac (default 0.5) of the pixels along the region are
ink (grey < thr, default 170).
"""
import sys

import numpy as np
from PIL import Image


def peaks(frac, minfrac, off):
    out = []
    i = 0
    n = len(frac)
    while i < n:
        if frac[i] >= minfrac:
            j = i
            while j + 1 < n and frac[j + 1] >= minfrac * 0.5:
                j += 1
            w = frac[i:j + 1]
            c = (np.arange(i, j + 1) * w).sum() / w.sum()
            out.append((off + c, j - i + 1, float(w.max())))
            i = j + 1
        else:
            i += 1
    return out


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    x0, y0, x1, y1 = (int(v) for v in a[1:5])
    thr = float(a[5]) if len(a) > 5 else 170
    mf = float(a[6]) if len(a) > 6 else 0.5
    sub = img[y0:y1, x0:x1] < thr
    v = sub.mean(axis=0)
    h = sub.mean(axis=1)
    print("vertical lines (x, width, frac):")
    for p in peaks(v, mf, x0):
        print("  %.2f %d %.2f" % p)
    print("horizontal lines (y, width, frac):")
    for p in peaks(h, mf, y0):
        print("  %.2f %d %.2f" % p)


if __name__ == "__main__":
    main()
