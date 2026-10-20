"""NACA TN 3320 (NTRS 19930084086) fig. 9, PDF p. 21 at 300 dpi: base-pressure coefficient (dp/q)base of the
full-scale RM-10 model 1 (circles) against Mach number. First reading (a second, independent reading is pending).
Calibration: horizontal lines every 0.05 found by row profiles (grey < 170, dark > 70%) in bands at x 600 to 2040:
y(0) = 2399.0 at x 600 and 2395.0 at x 2000 (tilt -2.9 px per 1000 px), 125.5 px per 0.05 (lines at -0.05 to
-0.35 at 2270.5, 2144.5, 2018.0, 1893.0, 1766.5, 1642.0, 1513.5 at x 1400). Vertical lines every 0.2 in M from
column profiles: M 0.8 at x 568.9, then 694.3, 820.1, 945.2, 1070.1, 1195.4, 1319.3, 1445.4, 1570.1, 1695.7,
1820.8, 1946.8, 2071.1 (M 3.2), at y 1950.
Circles: ring template (radius 13 to 17 px, +-1 px), score = dark fraction on the ring minus half the dark
fraction 5 px inside; maxima at least 22 px apart."""
import numpy as np
from PIL import Image
a = np.array(Image.open('img/tn3320/hi-21.png').convert('L')).astype(int)
dark = a < 150
VX = [568.9, 694.3, 820.1, 945.2, 1070.1, 1195.4, 1319.3, 1445.4, 1570.1, 1695.7, 1820.8, 1946.8, 2071.1]
def M_of(x):
    for k in range(len(VX) - 1):
        if VX[k] <= x <= VX[k + 1]:
            return 0.8 + 0.2 * k + 0.2 * (x - VX[k]) / (VX[k + 1] - VX[k])
def P_of(x, y):
    y0 = 2399.0 + (x - 600) * (-4.0 / 1400)
    return -(y0 - y) / 2510.0
t = np.arange(0, 2 * np.pi, 2 * np.pi / 180)
res = []
for r in (13, 14, 15, 16, 17):
    for x in range(640, 1720, 1):
        for y in range(2060, 2180, 1):
            hit = 0; tot = 0
            for dr in (-1, 0, 1):
                xs = np.round(x + (r + dr) * np.cos(t)).astype(int); ys = np.round(y + (r + dr) * np.sin(t)).astype(int)
                hit += dark[ys, xs].sum(); tot += len(t)
            xi = np.round(x + (r - 5) * np.cos(t[::3])).astype(int); yi = np.round(y + (r - 5) * np.sin(t[::3])).astype(int)
            res.append((hit / tot - 0.5 * dark[yi, xi].mean(), x, y, r))
res.sort(reverse=True)
picked = []
for s, x, y, r in res:
    if s < 0.45:
        break
    if all((x - px) ** 2 + (y - py) ** 2 > 22 ** 2 for _, px, py, _ in picked):
        picked.append((s, x, y, r))
print('x      y     r  score  M      dp/q')
for s, x, y, r in sorted(picked, key=lambda q: q[1]):
    print('%5d %5d %3d  %.2f  %.3f  %.4f' % (x, y, r, s, M_of(x), P_of(x, y)))
