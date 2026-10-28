"""Scan a degridded region for symbol-like peaks (completeness check).
usage: python3 -I scan.py degrid.npy ox oy x0 y0 x1 y1 sizes.json thr
Correlates each template (ring, disc, square, diamond, from sizes.json as
in tmatch.py) with the residual and prints local maxima above thr that
are at least 6 px apart, best template first.
"""
import json
import sys
import numpy as np
from scipy.signal import fftconvolve
from scipy import ndimage

res = np.load(sys.argv[1]).astype(float)
ox, oy = int(sys.argv[2]), int(sys.argv[3])
x0, y0, x1, y1 = (int(v) for v in sys.argv[4:8])
sizes = json.load(open(sys.argv[8]))
thr = float(sys.argv[9])
SS = 4


def template(kind):
    R = 10
    n = 2 * R + 1
    yy, xx = np.mgrid[0:n * SS, 0:n * SS]
    xx = (xx + 0.5) / SS - R - 0.5
    yy = (yy + 0.5) / SS - R - 0.5
    if kind == "disc":
        m = np.hypot(xx, yy) <= sizes["disc"]
    elif kind == "ring":
        ro, ri = sizes["ring"]
        r = np.hypot(xx, yy)
        m = (r <= ro) & (r >= ri)
    elif kind == "square":
        ho, hi = sizes["square"]
        c = np.maximum(abs(xx), abs(yy))
        m = (c <= ho) & (c >= hi)
    else:
        do, di = sizes["diamond"]
        c = abs(xx) + abs(yy)
        m = (c <= do) & (c >= di)
    return m.reshape(n, SS, n, SS).mean(axis=(1, 3))


R = res[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
best = None
for k in ("disc", "ring", "square", "diamond"):
    t = template(k)
    tt = t - t.mean()
    tn = np.sqrt((tt ** 2).sum())
    num = fftconvolve(R, tt[::-1, ::-1], mode="same")
    ones = np.ones_like(t)
    s1 = fftconvolve(R, ones, mode="same")
    s2 = fftconvolve(R ** 2, ones, mode="same")
    var = np.maximum(s2 - s1 ** 2 / t.size, 1e-6)
    ncc = num / (np.sqrt(var) * tn)
    ncc[var < 2000] = 0
    if best is None:
        best = ncc.copy()
        lab = np.full(ncc.shape, k, dtype=object)
    else:
        m = ncc > best
        best[m] = ncc[m]
        lab[m] = k
mx = ndimage.maximum_filter(best, size=9)
pk = np.argwhere((best == mx) & (best > thr))
for j, i in sorted(pk.tolist(), key=lambda p: (p[1], p[0])):
    print("x=%d y=%d score=%.2f %s" % (i + x0, j + y0, best[j, i], lab[j, i]))
