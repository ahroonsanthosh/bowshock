"""Outline of a filled symbol blob (lines removed by a morphological
opening), row by row and column by column.

Usage: python -I blob.py PAGE.png seed_x seed_y [thr] [open_px] [step]
Prints the blob's bounding box, then for every `step` rows the left and
right extent, and for every `step` columns the top and bottom extent.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    sx, sy = int(a[1]), int(a[2])
    thr = float(a[3]) if len(a) > 3 else 150
    op = int(a[4]) if len(a) > 4 else 7
    step = int(a[5]) if len(a) > 5 else 2
    x0, y0 = max(0, sx - 120), max(0, sy - 120)
    sub = img[y0:sy + 120, x0:sx + 120] < thr
    opened = ndimage.binary_opening(sub, structure=np.ones((op, op)))
    lab, n = ndimage.label(opened)
    k = lab[sy - y0, sx - x0]
    if k == 0:
        print("seed not on a blob")
        return
    m = lab == k
    ys, xs = np.nonzero(m)
    print("bbox x %d..%d  y %d..%d  (w %d, h %d)  area %d" % (xs.min() + x0, xs.max() + x0, ys.min() + y0, ys.max() + y0,
                                                          xs.max() - xs.min() + 1, ys.max() - ys.min() + 1, m.sum()))
    print("rows (y: left..right width):")
    for y in range(ys.min(), ys.max() + 1, step):
        r = np.nonzero(m[y])[0]
        print("  %d: %d..%d w%d" % (y + y0, r.min() + x0, r.max() + x0, r.max() - r.min() + 1))
    print("cols (x: top..bottom height):")
    for x in range(xs.min(), xs.max() + 1, step):
        c = np.nonzero(m[:, x])[0]
        print("  %d: %d..%d h%d" % (x + x0, c.min() + y0, c.max() + y0, c.max() - c.min() + 1))


if __name__ == "__main__":
    main()
