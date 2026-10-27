# usage: python3 -I colscan.py <png> <cal.out.json> <y0> <y1> <machs comma> <shape:size,...> <out.json> [cov=0.9] [inner_max=90] [gridmask=61]
# For each Mach column (x from the calibration) and each shape: outline coverage (dark samples, gridline
# pixels masked out) on a 0.5 px grid, x within +-6 px, y over the panel; local maxima (NMS 8 px) with
# coverage >= cov and inner darkness (0.45-scaled outline) <= inner_max (open symbol) are reported.
import sys, json, math
import numpy as np, cv2
from PIL import Image
from scipy.ndimage import map_coordinates, maximum_filter
a = sys.argv
g = np.asarray(Image.open(a[1]).convert('L')).astype(np.float32); D = 255 - g
cal = json.load(open(a[2])); y0, y1 = int(a[3]), int(a[4]); machs = [float(m) for m in a[5].split(',')]
shapes = [(s.split(':')[0], float(s.split(':')[1])) for s in a[6].split(',')]; out = a[7]
cov = float(a[8]) if len(a) > 8 else 0.9; imax = float(a[9]) if len(a) > 9 else 90; L = int(a[10]) if len(a) > 10 else 61
B = (g < 160).astype(np.uint8)
hl = cv2.morphologyEx(B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (L, 1)))
vl = cv2.morphologyEx(B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, L)))
M = (cv2.dilate(hl | vl, np.ones((3, 3), np.uint8)) > 0).astype(np.float32)
Dc = D * (1 - M)
ax, ay = cal['ax'], cal['ay']
def outline(shape, s, n=72):
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    if shape == 'circle': return s * np.cos(t), s * np.sin(t)
    u = np.linspace(-1, 1, n // 4, endpoint=False)
    px = np.concatenate([u, np.ones_like(u), -u, -np.ones_like(u)]) * s; py = np.concatenate([-np.ones_like(u), u, np.ones_like(u), -u]) * s
    if shape == 'diamond': px, py = (px - py) / 2, (px + py) / 2
    return px, py
res = []
for m in machs:
    pxm = (m - ax[0] - ax[2] * (y0 + y1) / 2) / ax[1]
    YY, XX = np.mgrid[y0:y1:0.5, pxm - 6:pxm + 6.01:0.5].astype(np.float32)
    for shape, s in shapes:
        ox, oy = outline(shape, s); ix, iy = outline(shape, s * 0.45, 36)
        C = np.zeros(XX.shape, np.float32); N = np.zeros(XX.shape, np.float32); I = np.zeros(XX.shape, np.float32)
        for u, v in zip(ox, oy):
            d = map_coordinates(D, [YY + v, XX + u], order=1); mm = map_coordinates(M, [YY + v, XX + u], order=0) < 0.5
            C += (d > 127) & mm; N += mm
        for u, v in zip(ix, iy): I += map_coordinates(Dc, [YY + v, XX + u], order=1)
        C = np.where(N >= len(ox) * 0.4, C / np.maximum(N, 1), 0); I /= len(ix)
        S = np.where(I <= imax, C, 0)
        mx = maximum_filter(S, size=17)
        for j, i in zip(*np.where((S >= mx) & (S >= cov))):
            X = ax[0] + ax[1] * XX[j, i] + ax[2] * YY[j, i]; Y = ay[0] + ay[1] * XX[j, i] + ay[2] * YY[j, i]
            res.append(dict(mach=m, shape=shape, size=s, x=float(XX[j, i]), y=float(YY[j, i]), cov=round(float(C[j, i]), 3), inner=round(float(I[j, i]), 1), X=float(X), Y=float(Y)))
# de-duplicate same shape within 4 px
res.sort(key=lambda r: -r['cov']); keep = []
for r in res:
    if any(k['shape'] == r['shape'] and math.hypot(k['x'] - r['x'], k['y'] - r['y']) < 4 for k in keep): continue
    keep.append(r)
keep.sort(key=lambda r: (r['mach'], r['shape'], r['y']))
json.dump(keep, open(out, 'w'), indent=0)
for r in keep: print(f"M {r['mach']:.2f} {r['shape']:>7} ({r['x']:.1f},{r['y']:.1f}) cov {r['cov']:.2f} inner {r['inner']:.0f}  Y {r['Y']:+.4f}")
