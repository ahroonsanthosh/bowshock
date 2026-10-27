"""Print a darkness profile along a column band (or row band) with peaks.

Usage: python -I colprof.py PAGE.png v|h centre halfwidth lo hi
v: average columns centre-halfwidth..centre+halfwidth, profile along y
from lo to hi.  h: average rows, profile along x.
Prints each position's mean darkness (255 - grey) and marks local
maxima with their darkness-weighted centre.
"""
import sys

import numpy as np
from PIL import Image


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    mode = a[1]
    c, hw, lo, hi = (int(v) for v in a[2:6])
    if mode == "v":
        prof = (255 - img[lo:hi, c - hw:c + hw + 1]).mean(axis=1)
    else:
        prof = (255 - img[c - hw:c + hw + 1, lo:hi]).mean(axis=0)
    bg = np.percentile(prof, 20)
    line = []
    for i, v in enumerate(prof):
        line.append("%d:%d" % (lo + i, v))
    print(" ".join(line))
    # peaks
    p = prof - bg
    pk = []
    for i in range(1, len(p) - 1):
        if p[i] >= p[i - 1] and p[i] > p[i + 1] and p[i] > 25:
            a0 = i
            while a0 > 0 and p[a0 - 1] > p[i] * 0.5:
                a0 -= 1
            b0 = i
            while b0 < len(p) - 1 and p[b0 + 1] > p[i] * 0.5:
                b0 += 1
            w = p[a0:b0 + 1]
            cc = (np.arange(a0, b0 + 1) * w).sum() / w.sum()
            pk.append("%.1f(h%d,w%d)" % (lo + cc, p[i], b0 - a0 + 1))
    print("peaks:", " ".join(pk))


if __name__ == "__main__":
    main()
