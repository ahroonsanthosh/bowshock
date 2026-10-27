"""Find long straight horizontal and vertical lines on a page by the
longest continuous dark run in each row / column.

Usage: python -I longlines.py PAGE.png minrun [thr] [axis]
axis: h (rows, default), v (columns) or both.  Prints groups of
adjacent rows (columns) whose longest run is >= minrun px, with the
darkness-weighted centre, and the run's start and end.
"""
import sys

import numpy as np
from PIL import Image


def longest(b):
    best = (0, 0, 0)
    n = len(b)
    i = 0
    while i < n:
        if b[i]:
            j = i
            gap = 0
            k = i
            # allow gaps of up to 2 px inside a run
            while k < n and (b[k] or gap < 2):
                if b[k]:
                    j = k
                    gap = 0
                else:
                    gap += 1
                k += 1
            if j - i + 1 > best[0]:
                best = (j - i + 1, i, j)
            i = j + 1
        else:
            i += 1
    return best


def scan(img, minrun, thr, axis):
    a = img < thr
    if axis == "v":
        a = a.T
    hits = []
    for r in range(a.shape[0]):
        L, s, e = longest(a[r])
        if L >= minrun:
            hits.append((r, L, s, e))
    groups = []
    for h in hits:
        if groups and h[0] - groups[-1][-1][0] <= 1:
            groups[-1].append(h)
        else:
            groups.append([h])
    for g in groups:
        rs = np.array([h[0] for h in g], float)
        w = np.array([h[1] for h in g], float)
        c = (rs * w).sum() / w.sum()
        print("%s %.2f (rows %d..%d) run %d from %d to %d" % (axis, c, g[0][0], g[-1][0], max(h[1] for h in g),
                                                           min(h[2] for h in g), max(h[3] for h in g)))


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    minrun = int(a[1])
    thr = float(a[2]) if len(a) > 2 else 128
    axis = a[3] if len(a) > 3 else "h"
    for ax in (["h", "v"] if axis == "both" else [axis]):
        scan(img, minrun, thr, ax)


if __name__ == "__main__":
    main()
