"""Track labelled grid lines (or axis tick lines) and fit an affine map.

usage: python3 -I gridfit.py spec.json
spec = {
  "image": path,
  "v": [[value, x_ref], ...],     # labelled vertical lines: X value, approx x at y_ref
  "h": [[value, y_ref], ...],     # labelled horizontal lines: Y value, approx y at x_ref
  "x_ref": .., "y_ref": ..,        # where the approx positions were taken
  "vslope": dx/dy guess, "hslope": dy/dx guess,
  "vrange": [ymin, ymax], "hrange": [xmin, xmax],  # extent to track along
  "seg": 40, "half": 6,
  "skip": {"v": [[y0, y1], ...], "h": [[x0, x1], ...]}  (optional: stretches
           along the line not used, e.g. where an inset box covers the grid),
  "out": path to write the fitted map (json)
}
Each line is tracked in segments of `seg` pixels: in each segment the
median darkness profile across the line (within +-half px of the
prediction) gives a sub-pixel centre. A straight line is fitted to the
segment centres (2 passes, outliers > 2 px dropped). Intersections of
every labelled vertical with every labelled horizontal line give
(X, Y) -> (px, py) pairs, and an affine map px = a0 + a1 X + a2 Y,
py = b0 + b1 X + b2 Y is fitted by least squares. Residuals are printed.
"""
import json
import sys
import numpy as np
from PIL import Image

spec = json.load(open(sys.argv[1]))
g = 255.0 - np.asarray(Image.open(spec["image"]).convert("L"), dtype=float)
seg, half = spec.get("seg", 40), spec.get("half", 6)


SKIP = spec.get("skip", {"v": [], "h": []})


def track(pos_ref, ref_other, slope, rng, vertical):
    pts = []
    for s0 in range(int(rng[0]), int(rng[1]) - seg + 1, seg):
        mid = s0 + seg / 2.0
        if any(a <= mid <= b for a, b in SKIP["v" if vertical else "h"]):
            continue
        pred = pos_ref + slope * (mid - ref_other)
        c0 = int(round(pred)) - half
        c1 = int(round(pred)) + half + 1
        if vertical:
            block = g[s0:s0 + seg, c0:c1]
            prof = np.median(block, axis=0)
        else:
            block = g[c0:c1, s0:s0 + seg]
            prof = np.median(block, axis=1)
        i = int(np.argmax(prof))
        if i == 0 or i == len(prof) - 1:
            continue
        a, b, c = prof[i - 1], prof[i], prof[i + 1]
        den = a - 2 * b + c
        frac = 0.5 * (a - c) / den if den != 0 else 0.0
        if b - np.min(prof) < 15:
            continue
        pts.append((mid, c0 + i + frac))
    pts = np.array(pts)
    t, p = pts[:, 0], pts[:, 1]
    keep = np.ones(len(t), bool)
    for _ in range(3):
        A = np.c_[np.ones(keep.sum()), t[keep]]
        coef = np.linalg.lstsq(A, p[keep], rcond=None)[0]
        res = p - (coef[0] + coef[1] * t)
        keep = np.abs(res) < 2.0
    rms = res[keep].std()
    return coef, rms, int(keep.sum()), len(t)


vl = []
for val, xr in spec["v"]:
    coef, rms, n, ntot = track(xr, spec["y_ref"], spec["vslope"], spec["vrange"], True)
    vl.append((val, coef))
    print("V %-6s x = %.2f + %.5f*y   rms %.2f px  (%d/%d segs)" % (val, coef[0], coef[1], rms, n, ntot))
hl = []
for val, yr in spec["h"]:
    coef, rms, n, ntot = track(yr, spec["x_ref"], spec["hslope"], spec["hrange"], False)
    hl.append((val, coef))
    print("H %-6s y = %.2f + %.5f*x   rms %.2f px  (%d/%d segs)" % (val, coef[0], coef[1], rms, n, ntot))

rows = []
for xv, (a0, a1) in vl:
    for yv, (b0, b1) in hl:
        # x = a0 + a1*y ; y = b0 + b1*x
        x = (a0 + a1 * b0) / (1 - a1 * b1)
        y = b0 + b1 * x
        rows.append((xv, yv, x, y))
rows = np.array(rows, float)
A = np.c_[np.ones(len(rows)), rows[:, 0], rows[:, 1]]
cx = np.linalg.lstsq(A, rows[:, 2], rcond=None)[0]
cy = np.linalg.lstsq(A, rows[:, 3], rcond=None)[0]
rx = rows[:, 2] - A @ cx
ry = rows[:, 3] - A @ cy
print("affine px = %.3f + %.3f*X + %.3f*Y" % tuple(cx))
print("affine py = %.3f + %.3f*X + %.3f*Y" % tuple(cy))
print("residuals px: rms %.2f max %.2f ; py: rms %.2f max %.2f (pixels)" % (
    rx.std(), np.abs(rx).max(), ry.std(), np.abs(ry).max()))
# residual per labelled tick (mean over the other axis)
for xv in sorted(set(rows[:, 0])):
    k = rows[:, 0] == xv
    print("  X tick %-6g mean px %.2f  mean resid %.2f  max %.2f" % (xv, rows[k, 2].mean(), rx[k].mean(), np.abs(rx[k]).max()))
for yv in sorted(set(rows[:, 1])):
    k = rows[:, 1] == yv
    print("  Y tick %-6g mean py %.2f  mean resid %.2f  max %.2f" % (yv, rows[k, 3].mean(), ry[k].mean(), np.abs(ry[k]).max()))
json.dump({"cx": list(cx), "cy": list(cy),
           "intersections": rows.tolist(),
           "rms_px": [float(rx.std()), float(ry.std())],
           "max_px": [float(np.abs(rx).max()), float(np.abs(ry).max())],
           "vlines": [[v, list(c)] for v, c in vl],
           "hlines": [[v, list(c)] for v, c in hl]},
          open(spec["out"], "w"), indent=1)
