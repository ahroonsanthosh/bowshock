"""Summarise a gridfit calibration as markdown table rows.
usage: python3 -I calsum.py name map.json
For each labelled vertical line (X tick) gives the fitted x at the vertical
middle of the tracked range, and for each horizontal line (Y tick) the
fitted y at the horizontal middle; then the least-squares affine fit
residuals per tick (mean and max over all intersections, pixels).
"""
import json
import sys
import numpy as np

name, path = sys.argv[1], sys.argv[2]
M = json.load(open(path))
rows = np.array(M["intersections"])
cx, cy = np.array(M["cx"]), np.array(M["cy"])
A = np.c_[np.ones(len(rows)), rows[:, 0], rows[:, 1]]
rx = rows[:, 2] - A @ cx
ry = rows[:, 3] - A @ cy
ymid = rows[:, 3].mean()
xmid = rows[:, 2].mean()
print("%s: affine px = %.2f + %.3f X + %.3f Y ; py = %.2f + %.3f X + %.3f Y" % ((name,) + tuple(cx) + tuple(cy)))
print("  X ticks (value: x px at y=%.0f; affine residual mean/max px):" % ymid)
out = []
for v, c in sorted(M["vlines"], key=lambda t: t[0]):
    k = rows[:, 0] == v
    out.append("%g: %.1f (%.2f/%.2f)" % (v, c[0] + c[1] * ymid, rx[k].mean(), np.abs(rx[k]).max()))
print("   " + "; ".join(out))
print("  Y ticks (value: y px at x=%.0f; affine residual mean/max px):" % xmid)
out = []
for v, c in sorted(M["hlines"], key=lambda t: t[0]):
    k = rows[:, 1] == v
    out.append("%g: %.1f (%.2f/%.2f)" % (v, c[0] + c[1] * xmid, ry[k].mean(), np.abs(ry[k]).max()))
print("   " + "; ".join(out))
print("  overall rms px: x %.2f, y %.2f; max x %.2f, y %.2f" % (rx.std(), ry.std(), np.abs(rx).max(), np.abs(ry).max()))
