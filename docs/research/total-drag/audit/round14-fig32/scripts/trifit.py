"""Outline template fit of open triangles in TN 3819 fig. 32 (native 300 ppi scan pixels).

Model: each triangle is three straight strokes joining its vertices; ink across a stroke is
Gaussian (sigma s). Vertices relative to the centroid (cx, cy): apex (0, -2h/3), base corners
(-w/2, +h/3) and (+w/2, +h/3), image y down. Pixel (i, j) has its centre at x = i, y = j.
Image ink = 255 - grey. A constant background is fitted. Pixels within `gmask` px of a
fitted gridline centre are left out (the gridlines cross every symbol), as are pixels inside
any extra mask boxes given on the command line (flags, curve). Robust (soft L1) least squares.

Usage:
  trifit.py page.jpg calib.json key  x0 y0 x1 y1                -> free w, h, s, centre (legend key)
  trifit.py page.jpg calib.json fit  x0 y0 x1 y1 w h s n cx1 cy1 [cx2 cy2] [--mask x0,y0,x1,y1 ...]
     n = number of triangles (1 or 2); starting centres given; prints fitted centres and
     residual statistics as JSON.
"""
import json
import sys
import numpy as np
from PIL import Image
from scipy.optimize import least_squares

def load(page):
    a = np.asarray(Image.open(page).convert('L')).astype(float)
    return 255.0 - a

def lpos(f, t):
    u = t - f['tref']
    return f['q0'] + f['q1'] * u + f['q2'] * u * u

def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy
    t = np.clip(((px - ax) * vx + (py - ay) * vy) / L2, 0, 1)
    dx = px - (ax + t * vx)
    dy = py - (ay + t * vy)
    return np.sqrt(dx * dx + dy * dy)

def tri_ink(px, py, cx, cy, w, h, s):
    ax, ay = cx, cy - 2 * h / 3
    blx, bly = cx - w / 2, cy + h / 3
    brx, bry = cx + w / 2, cy + h / 3
    d = np.minimum(np.minimum(seg_dist(px, py, ax, ay, blx, bly),
                              seg_dist(px, py, ax, ay, brx, bry)),
                   seg_dist(px, py, blx, bly, brx, bry))
    return np.exp(-0.5 * (d / s) ** 2)

def window(ink, x0, y0, x1, y1):
    ys, xs = np.mgrid[y0:y1, x0:x1]
    return xs.astype(float), ys.astype(float), ink[y0:y1, x0:x1]

def grid_mask(cal, xs, ys, gm):
    keep = np.ones_like(xs, bool)
    for f in cal['vertical']:
        keep &= np.abs(xs - lpos(f, ys)) > gm
    for f in cal['horizontal']:
        keep &= np.abs(ys - lpos(f, xs)) > gm
    return keep

def main():
    page, calp, mode = sys.argv[1:4]
    ink = load(page)
    cal = json.load(open(calp))
    x0, y0, x1, y1 = map(int, sys.argv[4:8])
    xs, ys, im = window(ink, x0, y0, x1, y1)
    if mode in ('key', 'free'):
        # 'key': whole window; 'free': same but gridline pixels left out (data symbols)
        if mode == 'free':
            kp = grid_mask(cal, xs, ys, 1.6)
            Xk, Yk, Ik = xs[kp], ys[kp], im[kp]
        else:
            Xk, Yk, Ik = xs.ravel(), ys.ravel(), im.ravel()
        def res(p):
            cx, cy, w, h, s, A, B = p
            return A * tri_ink(Xk, Yk, cx, cy, w, h, s) + B - Ik
        p0 = [float(sys.argv[8]), float(sys.argv[9]), 18.9, 15.9, 0.9, 120, 15] if len(sys.argv) > 9 else \
             [(x0 + x1) / 2, (y0 + y1) / 2 + 2, 18.9, 15.9, 0.9, 120, 15]
        lo = [x0, y0, 12, 10, 0.4, 30, -50]
        hi = [x1, y1, 26, 22, 2.0, 255, 120]
        r = least_squares(res, p0, loss='soft_l1', f_scale=20, bounds=(lo, hi))
        cx, cy, w, h, s, A, B = r.x
        J = r.jac
        rr = r.fun
        dof = max(1, len(rr) - len(r.x))
        cov = np.linalg.pinv(J.T @ J) * (rr ** 2).sum() / dof
        print(json.dumps(dict(cx=cx, cy=cy, w=w, h=h, s=s, A=A, B=B,
                              sd=[float(np.sqrt(cov[i, i])) for i in range(len(r.x))],
                              rms=float(np.sqrt((rr ** 2).mean())))))
        return
    w, h, s = map(float, sys.argv[8:11])
    n = int(sys.argv[11])
    starts = list(map(float, sys.argv[12:12 + 2 * n]))
    rest = sys.argv[12 + 2 * n:]
    gm = 1.6
    masks = []
    i = 0
    while i < len(rest):
        if rest[i] == '--mask':
            masks.append(tuple(map(float, rest[i + 1].split(','))))
            i += 2
        elif rest[i] == '--gm':
            gm = float(rest[i + 1]); i += 2
        else:
            i += 1
    keep = grid_mask(cal, xs, ys, gm)
    for (mx0, my0, mx1, my1) in masks:
        keep &= ~((xs >= mx0) & (xs <= mx1) & (ys >= my0) & (ys <= my1))
    X, Y, I = xs[keep], ys[keep], im[keep]
    def model(p, X, Y):
        # overlapping strokes do not add up on paper: take the darker of the triangles
        tri = np.zeros_like(X)
        for k in range(n):
            cx, cy, A = p[3 * k:3 * k + 3]
            tri = np.maximum(tri, A * tri_ink(X, Y, cx, cy, w, h, s))
        return p[-1] + tri
    def res(p):
        return model(p, X, Y) - I
    p0, lo, hi = [], [], []
    for k in range(n):
        p0 += [starts[2 * k], starts[2 * k + 1], 120.0]
        lo += [starts[2 * k] - 8, starts[2 * k + 1] - 8, 30.0]
        hi += [starts[2 * k] + 8, starts[2 * k + 1] + 8, 255.0]
    p0 += [15.0]; lo += [-50.0]; hi += [120.0]
    r = least_squares(res, p0, loss='soft_l1', f_scale=25, bounds=(lo, hi))
    rr = r.fun
    dof = max(1, len(rr) - len(r.x))
    cov = np.linalg.pinv(r.jac.T @ r.jac) * (rr ** 2).sum() / dof
    out = dict(n=n, npix=int(keep.sum()), rms=float(np.sqrt((rr ** 2).mean())),
               cost=float(r.cost), bg=float(r.x[-1]), tri=[])
    for k in range(n):
        out['tri'].append(dict(cx=float(r.x[3 * k]), cy=float(r.x[3 * k + 1]), A=float(r.x[3 * k + 2]),
                               sd_cx=float(np.sqrt(cov[3 * k, 3 * k])), sd_cy=float(np.sqrt(cov[3 * k + 1, 3 * k + 1]))))
    print(json.dumps(out))

if __name__ == '__main__':
    main()
