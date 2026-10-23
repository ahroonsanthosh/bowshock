"""Print ink runs of a row or column profile over a box (exploratory).

usage: python3 -I profile.py PAGE.png x0 y0 x1 y1 rows|cols [thr]
rows: mean ink (gray < 128) of each row over x0..x1, runs above thr printed
as (start, end, centroid, peak). cols: the same per column over y0..y1.
"""
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None


def main():
    page = sys.argv[1]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
    mode = sys.argv[6]
    thr = float(sys.argv[7]) if len(sys.argv) > 7 else 0.3
    a = np.asarray(Image.open(page).convert("L")).astype(float)
    ink = (a < 128).astype(float)[y0:y1, x0:x1]
    p = ink.mean(axis=1) if mode == "rows" else ink.mean(axis=0)
    off = y0 if mode == "rows" else x0
    i = 0
    while i < len(p):
        if p[i] > thr:
            j = i
            while j < len(p) and p[j] > thr:
                j += 1
            w = p[i:j]
            c = off + i + (np.arange(j - i) * w).sum() / w.sum()
            print("%d-%d centre %.2f peak %.2f" % (off + i, off + j - 1, c, w.max()))
            i = j
        else:
            i += 1


if __name__ == "__main__":
    main()
