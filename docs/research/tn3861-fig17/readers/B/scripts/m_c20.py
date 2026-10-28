# Circle 20: list ring points by angle (radius from a trial centre) and fit with a fixed radius as a check.
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np
from scipy.optimize import least_squares
import measure_lib as M
ink = M.load(sys.argv[2])
cx, cy = float(sys.argv[3]), float(sys.argv[4])
pts = M.ray_samples(ink, cx, cy, 11, 23, np.arange(0, 360, 2.0))
for x, y, a in pts:
    print('%3d %.2f' % (a, np.hypot(x - cx, y - cy)), end=' | ')
print()
def fit_fixed(pts, R0, angs=None):
    P = np.array([(p[0], p[1]) for p in pts if angs is None or any(a0 <= p[2] <= a1 for a0, a1 in angs)])
    keep = np.ones(len(P), bool); c = np.array([cx, cy])
    for _ in range(8):
        r = least_squares(lambda q: np.hypot(P[keep, 0] - q[0], P[keep, 1] - q[1]) - R0, c).x
        res = np.hypot(P[:, 0] - r[0], P[:, 1] - r[1]) - R0
        sig = max(np.sqrt(np.mean(res[keep] ** 2)), 0.15); nk = np.abs(res) < 2.5 * sig
        c = r
        if (nk == keep).all(): break
        keep = nk
    return c, np.sqrt(np.mean(res[keep] ** 2)), keep.sum(), len(P)
for R0 in (15.9, 16.1, 16.3):
    print('R0', R0, 'all angles', fit_fixed(pts, R0), 'upper (0-200, 340-360)', fit_fixed(pts, R0, [(0, 200), (340, 360)]))
