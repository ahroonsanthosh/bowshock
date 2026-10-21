"""Find long dark horizontal and vertical lines (grid lines) in a page image.
Usage: python3 -I grid.py <image> [x0 y0 x1 y1] [frac]
Prints the positions (px) where the fraction of dark pixels along a row or
column within the box exceeds frac (default 0.5), merged into runs."""
import sys
import numpy as np
from PIL import Image

im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
if len(sys.argv) >= 6:
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
else:
    x0, y0, x1, y1 = 0, 0, im.shape[1], im.shape[0]
frac = float(sys.argv[6]) if len(sys.argv) >= 7 else 0.5
box = im[y0:y1, x0:x1]
dark = box < float(__import__("os").environ.get("THR", "140"))


def runs(profile, offset):
    idx = np.where(profile > frac)[0]
    out = []
    if len(idx) == 0:
        return out
    start = prev = idx[0]
    for i in idx[1:]:
        if i != prev + 1:
            out.append((start + offset, prev + offset))
            start = i
        prev = i
    out.append((start + offset, prev + offset))
    return out


rows = dark.mean(axis=1)
cols = dark.mean(axis=0)
print('horizontal lines (y):', [(a, b, round((a + b) / 2, 1)) for a, b in runs(rows, y0)])
print('vertical lines (x):', [(a, b, round((a + b) / 2, 1)) for a, b in runs(cols, x0)])
