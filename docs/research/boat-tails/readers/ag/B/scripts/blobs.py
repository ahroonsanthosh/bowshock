"""Top and bottom of symbol stacks at given stations (lines removed).

Usage: python -I blobs.py PAGE.png open label:x:ya:yb [...]
For each station, ink (grey < 128) in a window x-30..x+30, ya..yb is
opened with an open x open square; components touching the band x+-5
are kept; the first and last rows of kept ink within x +- 14 are
printed, with the mid point and the kept ink's horizontal extent at
its widest row.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    op = int(a[1])
    for t in a[2:]:
        lab_, xs, ya, yb = t.split(":")
        x, ya, yb = float(xs), int(ya), int(yb)
        X0 = int(round(x)) - 30
        sub = img[ya:yb, X0:X0 + 61] < 128
        o = ndimage.binary_opening(sub, structure=np.ones((op, op)))
        lab, n = ndimage.label(o)
        ids = set(np.unique(lab[:, 25:36])) - {0}
        keep = np.isin(lab, list(ids))
        rows = np.nonzero(keep[:, 16:45].any(axis=1))[0]
        if len(rows) == 0:
            print(lab_, "none")
            continue
        top, bot = rows[0] + ya, rows[-1] + ya
        mids = []
        for rr in rows:
            c = np.nonzero(keep[rr])[0]
            if 8 <= c[-1] - c[0] + 1 <= 32:
                mids.append(0.5 * (c[0] + c[-1]) + X0)
        xm = float(np.median(mids)) if mids else float("nan")
        print("%s x=%.1f top=%d bottom=%d mid=%.1f height=%d xcentre=%.1f (n=%d)" % (
            lab_, x, top, bot, 0.5 * (top + bot), bot - top + 1, xm, len(mids)))


if __name__ == "__main__":
    main()
