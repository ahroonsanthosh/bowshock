"""Calibration quality inside a data window, from a localgrid dump.

usage: python3 -I calib_report.py CALIB.json Xmin Xmax Ymin Ymax

Prints, for the measured gridline intersections whose data values lie in the
window: an affine fit (data from pixels) and its residuals in data units, the
rotation of each axis and the skew between them, and the leave-one-out
residual of each interior intersection predicted as the mean of its four
neighbours (pixels), which bounds the error of interpolating inside a cell.
"""
import json
import sys
import numpy as np

c = json.load(open(sys.argv[1]))
x0, x1, y0, y1 = (float(v) for v in sys.argv[2:6])
vv, hv = np.array(c["vvals"]), np.array(c["hvals"])
X = np.array([[np.nan if v is None else v for v in r] for r in c["X"]])
Y = np.array([[np.nan if v is None else v for v in r] for r in c["Y"]])
K = [k for k, v in enumerate(vv) if x0 - 1e-9 <= v <= x1 + 1e-9]
J = [j for j, v in enumerate(hv) if y0 - 1e-9 <= v <= y1 + 1e-9]
pts = [(X[k, j], Y[k, j], vv[k], hv[j]) for k in K for j in J if not np.isnan(X[k, j])]
P = np.array(pts)
x, y, V, H = P.T
A = np.c_[np.ones_like(x), x, y]
cV = np.linalg.lstsq(A, V, rcond=None)[0]
cH = np.linalg.lstsq(A, H, rcond=None)[0]
rV, rH = V - A @ cV, H - A @ cH
print("window x %.3f..%.3f y %.3f..%.3f: %d of %d intersections measured" % (
    x0, x1, y0, y1, len(P), len(K) * len(J)))
print("affine fit residual x-axis value: rms %.5f max %.5f" % (np.sqrt(np.mean(rV ** 2)), np.abs(rV).max()))
print("affine fit residual y-axis value: rms %.6f max %.6f" % (np.sqrt(np.mean(rH ** 2)), np.abs(rH).max()))
# pixel directions of the axes: invert to pixel-per-unit vectors
Minv = np.linalg.inv(np.array([[cV[1], cV[2]], [cH[1], cH[2]]]))
ex, ey = Minv[:, 0], Minv[:, 1]
ang_x = np.degrees(np.arctan2(ex[1], ex[0]))
ang_y = np.degrees(np.arctan2(ey[0], -ey[1])) if ey[1] < 0 else np.degrees(np.arctan2(-ey[0], ey[1]))
print("x-axis direction in image: %.3f deg from horizontal; %.2f px per unit" % (ang_x, np.hypot(*ex)))
print("y-axis: %.2f px per unit; angle between axes %.3f deg" % (
    np.hypot(*ey), np.degrees(np.arccos(abs(ex @ ey) / np.hypot(*ex) / np.hypot(*ey)))))
loo = []
for k in K:
    for j in J:
        if k - 1 < 0 or j - 1 < 0 or k + 1 >= len(vv) or j + 1 >= len(hv):
            continue
        q = [X[k - 1, j], X[k + 1, j], X[k, j - 1], X[k, j + 1], X[k, j]]
        if any(np.isnan(q)):
            continue
        px = 0.25 * (X[k - 1, j] + X[k + 1, j] + X[k, j - 1] + X[k, j + 1])
        py = 0.25 * (Y[k - 1, j] + Y[k + 1, j] + Y[k, j - 1] + Y[k, j + 1])
        loo.append((X[k, j] - px, Y[k, j] - py))
loo = np.array(loo)
print("leave-one-out (px): n %d, rms x %.2f y %.2f, max x %.2f y %.2f" % (
    len(loo), np.sqrt(np.mean(loo[:, 0] ** 2)), np.sqrt(np.mean(loo[:, 1] ** 2)),
    np.abs(loo[:, 0]).max(), np.abs(loo[:, 1]).max()))
