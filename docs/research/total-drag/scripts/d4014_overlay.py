"""Overlay check for d4014_curve.py: draws the calibrated grid lines (blue), the curve inliers (red)
and the read point at alpha 0 (green cross) on a zoom of the page. Usage: PAGE X0 Y0 X1 Y1 OUT"""
import sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, 'scripts')
import d4014_curve as dc
page = int(sys.argv[1]); X0, Y0, X1, Y1 = map(int, sys.argv[2:6]); out = sys.argv[6]
S = 4
P, a, G = dc.load(page)
C = dc.Calib(P, G, a)
im = Image.open(P['img']).convert('RGB').crop((X0, Y0, X1, Y1))
im = im.resize(((X1 - X0) * S, (Y1 - Y0) * S), Image.NEAREST)
d = ImageDraw.Draw(im)
for ca, L in C.h:
    ya, yb = C.hy(L, X0), C.hy(L, X1)
    if Y0 - 5 < ya < Y1 + 5:
        d.line([(0, (ya - Y0) * S), ((X1 - X0) * S, (yb - Y0) * S)], fill=(80, 80, 255), width=1)
        d.text((2, (ya - Y0) * S - 12), '%.3f' % ca, fill=(0, 0, 255))
rng = np.random.default_rng(1)
for name, seed in P['curves'].items():
    v, sd, n, ntot, inl = dc.read_curve(a, C, seed, rng)
    seed = seed[0] if isinstance(seed, tuple) else seed
    for al, c, x, y in inl:
        if X0 <= x < X1 and Y0 <= y < Y1:
            d.rectangle([((x - X0) * S + 1, (y - Y0) * S + 1), ((x - X0) * S + 2, (y - Y0) * S + 2)], fill=(255, 0, 0))
    x0 = C.x_of_alpha(0.0, C.y_of_ca(v, 1000)); y0 = C.y_of_ca(v, x0)
    cx, cy = (x0 - X0) * S + 2, (y0 - Y0) * S + 2
    d.line([(cx - 14, cy), (cx + 14, cy)], fill=(0, 170, 0), width=2)
    d.line([(cx, cy - 14), (cx, cy + 14)], fill=(0, 170, 0), width=2)
    d.text((cx + 16, cy - 6), '%s %.4f' % (name, v), fill=(0, 140, 0))
im.save(out)
