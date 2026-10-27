"""Vertical extent of a stack of symbols centred on one abscissa, with
thin lines (grid lines, curves) removed by a morphological opening.

Usage: python -I stackext.py PAGE.png xc halfband y0 y1 [thr] [open]
Ink = grey < thr (default 128).  The ink is opened with an open x open
square (default 4) which removes lines thinner than `open` px but keeps
the thicker symbol strokes and filled areas.  The connected component(s)
of the opened ink that intersect the band xc +- halfband within
[y0, y1) are kept, and the first and last rows with opened ink inside
the band are printed, with the ink run on each of those rows.
Also prints, every 2 rows, the left and right ink limits inside
xc +- 3*halfband for the kept components, so the outline of the stack
can be inspected.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    xc, hb, y0, y1 = (int(v) for v in a[1:5])
    thr = float(a[5]) if len(a) > 5 else 128
    op = int(a[6]) if len(a) > 6 else 4
    X0, X1 = xc - 4 * hb, xc + 4 * hb + 1
    sub = img[y0:y1, X0:X1] < thr
    o = ndimage.binary_opening(sub, structure=np.ones((op, op)))
    lab, n = ndimage.label(o)
    band = lab[:, 3 * hb:5 * hb + 1]
    ids = set(np.unique(band)) - {0}
    keep = np.isin(lab, list(ids))
    rows = np.nonzero(keep[:, 3 * hb:5 * hb + 1].any(axis=1))[0]
    if len(rows) == 0:
        print("nothing")
        return
    print("top %d bottom %d" % (rows[0] + y0, rows[-1] + y0))
    for r in range(rows[0], rows[-1] + 1, 2):
        c = np.nonzero(keep[r])[0]
        if len(c):
            print("  %d: %d..%d" % (r + y0, c[0] + X0, c[-1] + X0))


if __name__ == "__main__":
    main()
