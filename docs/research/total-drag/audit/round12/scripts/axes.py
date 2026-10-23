"""Round 12: find axis lines and tick marks in a crop of the native 300 ppi page image.

Usage: python3 -I axes.py PAGE_PNG x0 y0 x1 y1
Prints the darkest long rows and columns (axis candidates) in page pixel coordinates,
then short dark runs that stick out of each axis (tick candidates).
Written for round 12; no code from other rounds.
"""
import sys
import numpy as np
from PIL import Image

page, x0, y0, x1, y1 = sys.argv[1], *map(int, sys.argv[2:6])
a = np.array(Image.open(page).convert('L'))
ink = a < 128
c = ink[y0:y1, x0:x1]

rows = c.sum(axis=1)
cols = c.sum(axis=0)
print('long rows (y, count):', [(y0 + i, int(rows[i])) for i in np.argsort(rows)[::-1][:6]])
print('long cols (x, count):', [(x0 + i, int(cols[i])) for i in np.argsort(cols)[::-1][:6]])


def runs(v):
    """Start,end of True runs in a 1D bool array."""
    out, s = [], None
    for i, t in enumerate(v):
        if t and s is None:
            s = i
        if not t and s is not None:
            out.append((s, i - 1)); s = None
    if s is not None:
        out.append((s, len(v) - 1))
    return out


if len(sys.argv) > 6:
    # tick search: mode row Y XL XR side(+1 below/-1 above) or col X YT YB side(+1 right/-1 left)
    mode = sys.argv[6]
    pos, lo, hi, side = map(int, sys.argv[7:11])
    for off in range(3, 40, 3):
        if mode == 'row':
            line = ink[pos + side * off, lo:hi]
            print(off, [(lo + (s + e) / 2, e - s + 1) for s, e in runs(line)])
        else:
            line = ink[lo:hi, pos + side * off]
            print(off, [(lo + (s + e) / 2, e - s + 1) for s, e in runs(line)])
