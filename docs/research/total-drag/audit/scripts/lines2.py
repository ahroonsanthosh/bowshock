"""Find dark straight lines (grid lines, axes) in a band of a rendered page.
usage: lines.py in.png axis x0 y0 x1 y1 [thresh_frac]
axis = v : vertical lines, reports x positions where the column darkness in
           the box exceeds thresh_frac of the box height
axis = h : horizontal lines, reports y positions
Positions are the darkness-weighted centre of each run of qualifying columns/rows.
"""
import sys
import numpy as np
from PIL import Image

src, axis = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
frac = float(sys.argv[7]) if len(sys.argv) > 7 else 0.5
thr = float(sys.argv[8]) if len(sys.argv) > 8 else 128
a = np.asarray(Image.open(src).convert("L"), dtype=float)[y0:y1, x0:x1]
dark = (a < thr).astype(float)
if axis == "v":
    prof = dark.mean(axis=0); off = x0
else:
    prof = dark.mean(axis=1); off = y0
idx = np.where(prof >= frac)[0]
runs = []
for i in idx:
    if runs and i == runs[-1][-1] + 1:
        runs[-1].append(i)
    else:
        runs.append([i])
for r in runs:
    w = prof[r]
    c = (np.array(r) * w).sum() / w.sum() + off
    print(f"{c:8.1f}  width={len(r)}  peak={w.max():.2f}")
