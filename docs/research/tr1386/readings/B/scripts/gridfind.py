"""Find grid line positions in a box of a 400 dpi page render.

usage: python3 -I gridfind.py PAGE X0 Y0 X1 Y1 [THRESH] [FRAC]
Prints positions (page pixels) of vertical lines (column dark fraction > FRAC)
and horizontal lines (row dark fraction > FRAC), as weighted centres of runs.
"""
import sys
import numpy as np
from PIL import Image

WORK = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"


def runs(mask, weights, offset):
    out = []
    i = 0
    n = len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            w = weights[i:j]
            c = (np.arange(i, j) * w).sum() / w.sum()
            out.append((round(c + offset, 1), j - i, round(float(w.max()), 2)))
            i = j
        else:
            i += 1
    return out


def main():
    page = int(sys.argv[1])
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    thresh = int(sys.argv[6]) if len(sys.argv) > 6 else 140
    frac = float(sys.argv[7]) if len(sys.argv) > 7 else 0.5
    im = np.asarray(Image.open(f"{WORK}/p400-{page:02d}.png").convert("L"), dtype=np.float32)
    sub = im[y0:y1, x0:x1]
    dark = (sub < thresh).astype(np.float32)
    colfrac = dark.mean(axis=0)
    rowfrac = dark.mean(axis=1)
    print("vertical lines (x, width, peak frac):")
    for r in runs(colfrac > frac, colfrac, x0):
        print("  ", r)
    print("horizontal lines (y, width, peak frac):")
    for r in runs(rowfrac > frac, rowfrac, y0):
        print("  ", r)


if __name__ == "__main__":
    main()
