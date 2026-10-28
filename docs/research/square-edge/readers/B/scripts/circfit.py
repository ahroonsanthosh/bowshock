"""Least-squares circle through dark pixels near a guessed circle.
usage: python3 -I circfit.py in.png cx cy r band thresh
Uses dark pixels whose distance from (cx,cy) is within r +- band.
Prints fitted centre, radius and rms residual (native pixels).
"""
import sys
import numpy as np
from PIL import Image

src = sys.argv[1]
cx, cy, r, band, th = (float(v) for v in sys.argv[2:7])
g = np.asarray(Image.open(src).convert("L"), dtype=float)
y0, y1 = int(cy - r - band), int(cy + r + band)
x0, x1 = int(cx - r - band), int(cx + r + band)
sub = g[y0:y1, x0:x1]
ys, xs = np.nonzero(sub < th)
xs = xs + x0
ys = ys + y0
d = np.hypot(xs - cx, ys - cy)
k = np.abs(d - r) < band
xs, ys = xs[k].astype(float), ys[k].astype(float)
for it in range(3):
    A = np.c_[2 * xs, 2 * ys, np.ones_like(xs)]
    b = xs ** 2 + ys ** 2
    sol = np.linalg.lstsq(A, b, rcond=None)[0]
    a, bb = sol[0], sol[1]
    rr = np.sqrt(sol[2] + a * a + bb * bb)
    res = np.hypot(xs - a, ys - bb) - rr
    keep = np.abs(res) < 3 * res.std() + 1
    xs, ys = xs[keep], ys[keep]
print("centre x=%.2f y=%.2f radius=%.2f n=%d rms=%.2f" % (a, bb, rr, len(xs), res[keep].std()))
