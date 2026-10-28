"""Fit one or two open triangles with free size (common shape ratio not imposed) in a window,
gridline pixels left out, extra boxes masked. Used only to test what is at a station.
Usage: trifit2.py page.jpg calib.json x0 y0 x1 y1 n cx1 cy1 [cx2 cy2] [--mask x0,y0,x1,y1]..."""
import json
import sys
import numpy as np
from scipy.optimize import least_squares
sys.path.insert(0, __import__('os').path.dirname(__file__))
from trifit import load, window, grid_mask, tri_ink

page, calp = sys.argv[1:3]
ink = load(page)
cal = json.load(open(calp))
x0, y0, x1, y1, n = map(int, sys.argv[3:8])
st = list(map(float, sys.argv[8:8 + 2 * n]))
rest = sys.argv[8 + 2 * n:]
masks = [tuple(map(float, rest[i + 1].split(','))) for i in range(len(rest)) if rest[i] == '--mask']
xs, ys, im = window(ink, x0, y0, x1, y1)
keep = grid_mask(cal, xs, ys, 1.6)
for (a, b, c, d) in masks:
    keep &= ~((xs >= a) & (xs <= c) & (ys >= b) & (ys <= d))
X, Y, I = xs[keep], ys[keep], im[keep]
def model(p):
    t = np.zeros_like(X)
    for k in range(n):
        cx, cy, w, h, A = p[5 * k:5 * k + 5]
        t = np.maximum(t, A * tri_ink(X, Y, cx, cy, w, h, 0.91))
    return p[-1] + t
p0, lo, hi = [], [], []
for k in range(n):
    p0 += [st[2 * k], st[2 * k + 1], 18.9, 15.9, 100]
    lo += [st[2 * k] - 6, st[2 * k + 1] - 6, 8, 6, 30]
    hi += [st[2 * k] + 6, st[2 * k + 1] + 6, 26, 22, 255]
p0 += [15]; lo += [-50]; hi += [120]
r = least_squares(lambda p: model(p) - I, p0, loss='soft_l1', f_scale=25, bounds=(lo, hi))
print('rms', round(float(np.sqrt((r.fun ** 2).mean())), 2), 'npix', int(keep.sum()))
for k in range(n):
    cx, cy, w, h, A = r.x[5 * k:5 * k + 5]
    print(f'  tri {k}: cx {cx:.2f} cy {cy:.2f} w {w:.2f} h {h:.2f} A {A:.1f}  apex y {cy - 2 * h / 3:.2f} base y {cy + h / 3:.2f}')
