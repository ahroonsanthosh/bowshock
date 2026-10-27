"""Vertical extent of a cluster of symbols at one abscissa.

Usage: python -I extent.py PAGE.png xc halfband y0 y1 [thr]
For each row in [y0, y1) counts ink pixels (grey < thr, default 128) in
the band xc-halfband..xc+halfband, and also in two side bands just
outside it (xc +- 2*halfband).  A row is "line" when the side bands are
mostly inked too (a horizontal grid line or curve crossing).  Prints
the counts and the first and last rows where the band has at least
6 ink pixels and the row is not a line.
"""
import sys

import numpy as np
from PIL import Image


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    xc, hb, y0, y1 = (int(v) for v in a[1:5])
    thr = float(a[5]) if len(a) > 5 else 128
    first = last = None
    for y in range(y0, y1):
        band = (img[y, xc - hb:xc + hb + 1] < thr).sum()
        left = (img[y, xc - 3 * hb:xc - hb] < thr).mean()
        right = (img[y, xc + hb + 1:xc + 3 * hb + 1] < thr).mean()
        line = left > 0.8 and right > 0.8
        tag = "LINE" if line else ""
        print(y, band, "%.2f %.2f" % (left, right), tag)
        if band >= 6 and not line:
            if first is None:
                first = y
            last = y
    print("first", first, "last", last)


if __name__ == "__main__":
    main()
