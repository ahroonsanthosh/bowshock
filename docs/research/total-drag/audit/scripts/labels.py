"""Centroid and vertical extent of dark ink inside boxes (tick labels).
usage: labels.py png x0 x1 y0 y1 [y0 y1 ...]"""
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert("L"), dtype=float)
x0, x1 = int(sys.argv[2]), int(sys.argv[3])
v = list(map(int, sys.argv[4:]))
for y0, y1 in zip(v[::2], v[1::2]):
    d = a[y0:y1, x0:x1] < 128
    ys, xs = np.nonzero(d)
    if len(ys) == 0:
        print(y0, y1, "empty"); continue
    print(f"box y {y0}-{y1}: centroid y={ys.mean() + y0:.1f} x={xs.mean() + x0:.1f}  extent y {ys.min() + y0}-{ys.max() + y0} (mid {0.5 * (ys.min() + ys.max()) + y0:.1f}) n={len(ys)}")
