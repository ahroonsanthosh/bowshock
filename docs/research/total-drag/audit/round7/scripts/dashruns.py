"""Measure the dash pattern of a drawn line (exploratory).

usage: python3 -I dashruns.py PAGE.png HALF x0,y0;x1,y1;...
Follows the polyline through the given points; in each column takes the
maximum darkness within +-HALF px of the polyline and prints the inked runs
(x start, x end, length, mean peak darkness, mean ink width in px).
"""
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
d = 255.0 - np.asarray(Image.open(sys.argv[1]).convert("L")).astype(float)
half = int(sys.argv[2])
pts = np.array([[float(v) for v in p.split(",")] for p in sys.argv[3].split(";")])
xs = np.arange(int(pts[0, 0]), int(pts[-1, 0]) + 1)
yp = np.interp(xs, pts[:, 0], pts[:, 1])
mx, wd = [], []
for x, y in zip(xs, yp):
    col = d[int(y) - half:int(y) + half + 1, x]
    mx.append(col.max())
    wd.append((col > 0.5 * max(col.max(), 1)).sum())
mx = np.array(mx)
wd = np.array(wd)
on = mx > 90
i = 0
while i < len(xs):
    if on[i]:
        j = i
        while j < len(xs) and on[j]:
            j += 1
        print("run x %d-%d len %d peak %.0f width %.1f" % (xs[i], xs[j - 1], j - i, mx[i:j].mean(), wd[i:j].mean()))
        i = j
    else:
        i += 1
