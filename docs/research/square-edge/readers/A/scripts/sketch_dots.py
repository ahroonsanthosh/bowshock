"""Measure orifice dots on a face sketch (a circle with dots).

usage: python3 -I sketch_dots.py IMG X0 Y0 X1 Y1 [THR] [MINPIX] [MAXPIX] [BAND]

Fits the circle outline by least squares (Kasa fit on the dark pixels that
lie on the largest ring-shaped component), then lists every small dark
component inside it with its centroid, radial position r/R and angle
(degrees, 0 = to the right, counter-clockwise positive, image y down).
Components touching the outline are reported with a flag.
"""
import sys
import numpy as np
from PIL import Image
from collections import deque

img = sys.argv[1]
X0, Y0, X1, Y1 = (int(v) for v in sys.argv[2:6])
thr = float(sys.argv[6]) if len(sys.argv) > 6 else 150
minpix = int(sys.argv[7]) if len(sys.argv) > 7 else 8
maxpix = int(sys.argv[8]) if len(sys.argv) > 8 else 400
g = np.asarray(Image.open(img).convert("L")).astype(float)[Y0:Y1, X0:X1]
m = g < thr
H, W = m.shape
lab = np.zeros(m.shape, int); comps = []; n = 0
for y, x in zip(*np.nonzero(m)):
    if lab[y, x]:
        continue
    n += 1; q = deque([(y, x)]); lab[y, x] = n; pts = []
    while q:
        cy, cx = q.popleft(); pts.append((cy, cx))
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; q.append((ny, nx))
    comps.append(np.array(pts))
big = max(comps, key=len)
ys, xs = big[:, 0].astype(float), big[:, 1].astype(float)
A = np.c_[2 * xs, 2 * ys, np.ones_like(xs)]
b = xs ** 2 + ys ** 2
c, *_ = np.linalg.lstsq(A, b, rcond=None)
xc, yc = c[0], c[1]; R = np.sqrt(c[2] + xc ** 2 + yc ** 2)
res = np.sqrt((xs - xc) ** 2 + (ys - yc) ** 2) - R
for _ in range(5):  # robust refit: drop pixels off the ring (leaders, labels)
    keep = np.abs(res) < max(3.0, 2.5 * np.sqrt(np.mean(res ** 2)) if _ == 0 else 3.0)
    A2 = np.c_[2 * xs[keep], 2 * ys[keep], np.ones(keep.sum())]
    c, *_r = np.linalg.lstsq(A2, b[keep], rcond=None)
    xc, yc = c[0], c[1]; R = np.sqrt(c[2] + xc ** 2 + yc ** 2)
    res = np.sqrt((xs - xc) ** 2 + (ys - yc) ** 2) - R
# the outline has a stroke width; R is its centre line
kk = np.abs(res) < 3.0
print(f"circle centre ({X0 + xc:.2f}, {Y0 + yc:.2f}) radius {R:.2f} px; outline residual rms {np.sqrt(np.mean(res[kk]**2)):.2f} px on {kk.sum()} of {len(big)} outline pixels")
# optional second pass: erase the outline band (|r - R| <= BAND px) and look again
BAND = float(sys.argv[9]) if len(sys.argv) > 9 else 0
if BAND > 0:
    yy, xx = np.mgrid[0:H, 0:W]
    rr_ = np.hypot(xx - xc, yy - yc)
    m2 = m & (np.abs(rr_ - R) > BAND)
    lab = np.zeros(m.shape, int); comps2 = []; n = 0
    for y, x in zip(*np.nonzero(m2)):
        if lab[y, x]:
            continue
        n += 1; q = deque([(y, x)]); lab[y, x] = n; pts = []
        while q:
            cy, cx = q.popleft(); pts.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and m2[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n; q.append((ny, nx))
        comps2.append(np.array(pts))
    comps = comps2; big = None
    print(f"outline band +-{BAND} px erased before the search; dots cut by the band are partial")
out = []
for p in comps:
    if p is big or len(p) < minpix or len(p) > maxpix:
        continue
    cy_, cx_ = p[:, 0].mean(), p[:, 1].mean()
    r = np.hypot(cx_ - xc, cy_ - yc)
    if r > R + 6:
        continue
    ang = np.degrees(np.arctan2(-(cy_ - yc), cx_ - xc))
    w = p[:, 1].max() - p[:, 1].min() + 1; h = p[:, 0].max() - p[:, 0].min() + 1
    out.append((ang, r / R, X0 + cx_, Y0 + cy_, len(p), w, h))
for ang, rr, x, y, npx, w, h in sorted(out, key=lambda t: (round(t[0] / 10), t[1])):
    print(f"dot at ({x:8.2f},{y:8.2f}) px={npx:4d} {w}x{h}  r/R={rr:.3f}  angle={ang:7.1f} deg")
