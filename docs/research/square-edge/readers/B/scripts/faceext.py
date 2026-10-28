"""Measure the straight (flat) part of a near-vertical outline in a drawing.
usage: python3 -I faceext.py in.png x0 x1 y0 y1 thresh [tol]
For each row y in [y0,y1) the centre of the first dark run found scanning
from x0 to x1 is taken as the outline position. A straight line x = a + b*y
is fitted (iteratively, to the rows within tol px), and the first and last
rows of the longest run of consecutive rows within tol px of the line are
reported: these are the ends of the straight segment.
"""
import sys
import numpy as np
from PIL import Image

g = np.asarray(Image.open(sys.argv[1]).convert("L"), dtype=float)
x0, x1, y0, y1 = (int(v) for v in sys.argv[2:6])
th = float(sys.argv[6])
tol = float(sys.argv[7]) if len(sys.argv) > 7 else 1.5
ys, xs = [], []
for y in range(y0, y1):
    row = g[y, x0:x1] < th
    idx = np.nonzero(row)[0]
    if len(idx) == 0:
        continue
    start = idx[0]
    end = start
    while end + 1 < len(row) and row[end + 1]:
        end += 1
    ys.append(y)
    xs.append(x0 + (start + end) / 2.0)
ys, xs = np.array(ys, float), np.array(xs, float)
keep = np.ones(len(ys), bool)
for _ in range(5):
    A = np.c_[np.ones(keep.sum()), ys[keep]]
    a, b = np.linalg.lstsq(A, xs[keep], rcond=None)[0]
    res = xs - (a + b * ys)
    keep = np.abs(res) < tol
best = (0, 0, 0)
i = 0
while i < len(ys):
    if keep[i]:
        j = i
        while j + 1 < len(ys) and keep[j + 1] and ys[j + 1] - ys[j] <= 3:
            j += 1
        if ys[j] - ys[i] > best[0]:
            best = (ys[j] - ys[i], ys[i], ys[j])
        i = j + 1
    else:
        i += 1
print("line x = %.2f + %.5f*y ; straight run y %d to %d (length %d px)" % (a, b, best[1], best[2], best[0]))
