"""Check axis tick labels against the fitted gridlines.
Usage: python3 -I labelcheck.py page.jpg calib.json
Groups label ink into clusters and prints each cluster's extent and centre beside the
nearest gridline and that line's value."""
import json
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
cal = json.load(open(sys.argv[2]))
def lpos(f, t):
    u = t - f['tref']
    return f['q0'] + f['q1'] * u + f['q2'] * u * u
def clusters(mask1d, gap):
    idx = np.where(mask1d)[0]
    out = []
    if len(idx) == 0:
        return out
    s = idx[0]; p = idx[0]
    for i in idx[1:]:
        if i - p > gap:
            out.append((s, p)); s = i
        p = i
    out.append((s, p))
    return out
# x labels: strip below the bottom frame
y0, y1 = 2277, 2306
strip = a[y0:y1, 395:2030] < 120
cols = strip.any(axis=0)
print('x labels (strip rows %d-%d): extent, centre, nearest line x at row 2290, its value' % (y0, y1))
for s, e in clusters(cols, 14):
    xs, xe = s + 395, e + 395
    c = 0.5 * (xs + xe)
    best = min(cal['vertical'], key=lambda f: abs(lpos(f, 2290) - c))
    print(f'  {xs:5d}-{xe:5d}  centre {c:7.1f}  line {lpos(best, 2290):7.1f}  value {best["value"]:+.1f}  offset {c - lpos(best, 2290):+6.1f}')
# y labels: strip left of the left frame
x0, x1 = 320, 404
strip = a[730:2290, x0:x1] < 120
rows = strip.any(axis=1)
print('y labels (strip cols %d-%d): extent, centre, nearest line y at col 380, its value' % (x0, x1))
for s, e in clusters(rows, 10):
    ys, ye = s + 730, e + 730
    if ye - ys < 6:
        continue
    c = 0.5 * (ys + ye)
    best = min(cal['horizontal'], key=lambda f: abs(lpos(f, 380) - c))
    print(f'  {ys:5d}-{ye:5d}  centre {c:7.1f}  line {lpos(best, 380):7.1f}  value {best["value"]:+.2f}  offset {c - lpos(best, 380):+6.1f}')
