"""Calibration of NACA TN 3819 figs. 33 and 35 (PDF pp. 65, 66 at 300 dpi) from grid lines fitted by
d4014_grid.py (data/love_fins_grid66.json for fig. 35). Fig. 35: horizontal lines every 0.02 in P_B from -0.36
(top frame) to 0 (bottom frame), 18 intervals; vertical lines every 0.1 in M; the first line found is M 1.1 (the M 1.0 frame
line is not detected), checked against the symbols at the test Mach numbers 1.50, 2.00, 2.41 and the labels. Lines tilt about +9.4 px and lean about -14 px per 1000 px; each line is
evaluated with its own fit where its span covers the point, else carried with the median slope.
Usage as a module, or: python3 -I love35_cal.py X0 Y0 X1 Y1 SCALE OUT (ruler overlay of fig. 35)."""
import json
import sys
import numpy as np
from PIL import Image, ImageDraw
G = json.load(open('data/love_fins_grid66.json'))
H = [L for L in G['h'] if L['n'] >= 10]
V = [L for L in G['v'] if L['n'] >= 10]
hs = float(np.median([L['slope'] for L in H])); vs = float(np.median([L['slope'] for L in V]))
def _y(L, x):
    if L['smin'] - 40 <= x <= L['smax'] + 40:
        return L['slope'] * x + L['icpt']
    xe = L['smin'] if x < L['smin'] else L['smax']
    return L['slope'] * xe + L['icpt'] + hs * (x - xe)
def _x(L, y):
    if L['smin'] - 40 <= y <= L['smax'] + 40:
        return L['slope'] * y + L['icpt']
    ye = L['smin'] if y < L['smin'] else L['smax']
    return L['slope'] * ye + L['icpt'] + vs * (y - ye)
# assign values: horizontal by position at x 1510 (0 at 1769.2, 79.0 px per 0.02), vertical at y 1050
hval = {}
for L in H:
    k = round((1769.2 - _y(L, 1510)) / 79.0)
    hval.setdefault(k, []).append(L)
vval = {}
for L in V:
    # the first detected line (x 620.7 at y 1050) is M 1.1: the M 1.0 frame line is not detected; checked
    # against the symbols at the test Mach numbers (ref. 26 circles at 1.50, squares at 2.00, Langley 9 in
    # diamonds at 2.41) and the printed labels
    k = round((_x(L, 1050) - 620.7) / 78.95) + 1
    vval.setdefault(k, []).append(L)
def ylines(x):
    out = []
    for k, Ls in sorted(hval.items()):
        cov = [L for L in Ls if L['smin'] - 40 <= x <= L['smax'] + 40]
        L = cov[0] if cov else min(Ls, key=lambda L: min(abs(x - L['smin']), abs(x - L['smax'])))
        out.append((-0.02 * k, _y(L, x)))
    return out  # P decreasing (more negative) with k, y decreasing
def xlines(y):
    out = []
    for k, Ls in sorted(vval.items()):
        cov = [L for L in Ls if L['smin'] - 40 <= y <= L['smax'] + 40]
        L = cov[0] if cov else min(Ls, key=lambda L: min(abs(y - L['smin']), abs(y - L['smax'])))
        out.append((1.0 + 0.1 * k, _x(L, y)))
    return out
def P_of(x, y):
    ys = ylines(x)
    for (p1, y1), (p2, y2) in zip(ys, ys[1:]):
        if y2 <= y <= y1:
            return p1 + (p2 - p1) * (y1 - y) / (y1 - y2)
def M_of(x, y):
    xs = xlines(y)
    for (m1, x1), (m2, x2) in zip(xs, xs[1:]):
        if x1 <= x <= x2:
            return m1 + (m2 - m1) * (x - x1) / (x2 - x1)
def y_of(P, x):
    ys = ylines(x)
    for (p1, y1), (p2, y2) in zip(ys, ys[1:]):
        if p2 <= P <= p1:
            return y1 + (y2 - y1) * (p1 - P) / (p1 - p2)
def x_of(M, y):
    xs = xlines(y)
    for (m1, x1), (m2, x2) in zip(xs, xs[1:]):
        if m1 <= M <= m2:
            return x1 + (x2 - x1) * (M - m1) / (m2 - m1)
if __name__ == '__main__':
    X0, Y0, X1, Y1 = map(int, sys.argv[1:5]); S = float(sys.argv[5]); out = sys.argv[6]
    print('horizontal values found:', sorted(-0.02 * k for k in hval), ' vertical:', sorted(round(1 + 0.1 * k, 1) for k in vval))
    im = Image.open('img/love_fins/p66.png').convert('RGB').crop((X0, Y0, X1, Y1))
    im = im.resize((int((X1 - X0) * S), int((Y1 - Y0) * S)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    for i in range(0, 37):
        P = -0.01 * i
        ya, yb = y_of(P, X0), y_of(P, X1)
        if ya and yb and Y0 <= ya <= Y1:
            d.line([(0, (ya - Y0) * S), ((X1 - X0) * S, (yb - Y0) * S)], fill=(255, 0, 0) if i % 2 == 0 else (255, 170, 170), width=1)
            d.text((2, (ya - Y0) * S - 11), '%.2f' % P, fill=(200, 0, 0))
    for i in range(0, 49):
        M = 1.0 + 0.05 * i
        xa, xb = x_of(M, Y0), x_of(M, Y1)
        if xa and xb and X0 <= xa <= X1:
            d.line([((xa - X0) * S, 0), ((xb - X0) * S, (Y1 - Y0) * S)], fill=(0, 0, 255) if i % 2 == 0 else (160, 160, 255), width=1)
            if i % 2 == 0:
                d.text(((xa - X0) * S + 2, 2), '%.1f' % M, fill=(0, 0, 255))
    im.save(out)
