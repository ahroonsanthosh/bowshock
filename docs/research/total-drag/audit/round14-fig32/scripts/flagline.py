"""Trace a flag stroke: ink-weighted centroid per row inside a column band, straight-line fit,
and where the line meets a given x (the gridline / symbol axis).
Usage: flagline.py page.jpg y0 y1 xlo xhi x_axis"""
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
y0, y1, xlo, xhi = map(int, sys.argv[2:6])
xa = float(sys.argv[6])
ys, xs = [], []
for y in range(y0, y1 + 1):
    row = 255 - a[y, xlo:xhi + 1]
    bg = np.median(255 - a[y, xhi + 2:xhi + 8])
    w = np.clip(row - bg - 30, 0, None)
    if w.sum() > 0:
        x = (np.arange(xlo, xhi + 1) * w).sum() / w.sum()
        ys.append(y); xs.append(x)
        print(f'row {y}: centroid x {x:.2f}  peak ink {row.max():.0f}')
ys, xs = np.array(ys, float), np.array(xs, float)
b, c = np.polyfit(xs, ys, 1)
print(f'fit y = {b:.3f} x + {c:.1f}; slope angle {np.degrees(np.arctan(-b)):.1f} deg above horizontal')
print(f'line meets x = {xa} at y = {b * xa + c:.2f}')
