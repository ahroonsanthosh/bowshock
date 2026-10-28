"""Vertex reading of each triangle from its own strokes (the 'by eye with a pixel ruler' route,
made repeatable). For each side: ink-weighted x centre in each listed row inside an x window,
straight line fitted x = a + b*y. Base: ink-weighted y centre in each listed column inside a y
window, averaged. Apex = intersection of the two side lines; base corners = side lines at the
base y. Centroid = mean of the three vertices (one third of the height above the base).
Gridline pixels (within 1.6 px of a fitted gridline) get no weight.
Usage: sidefit.py page.jpg calib.json spec.json out.json"""
import json
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__file__))
from trifit import lpos

ink = 255.0 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
cal = json.load(open(sys.argv[2]))
spec = json.load(open(sys.argv[3]))

def gridw(x, y):
    # gridlines exist only inside the frame (the frame lines themselves are the outer lines)
    if 749 <= y <= 2274:
        for f in cal['vertical']:
            if abs(x - lpos(f, y)) <= 1.6:
                return 0.0
    if 407 <= x <= 2007:
        for f in cal['horizontal']:
            if abs(y - lpos(f, x)) <= 1.6:
                return 0.0
    return 1.0

def centre_row(y, xa, xb):
    xs = np.arange(xa, xb + 1)
    v = np.array([ink[y, x] * gridw(x, y) for x in xs])
    bg = 25.0
    w = np.clip(v - bg, 0, None)
    if w.max() < 60:
        return None
    k = int(np.argmax(w))
    sel = (np.abs(np.arange(len(xs)) - k) <= 2) & (w >= 0.3 * w[k])
    return float((xs[sel] * w[sel]).sum() / w[sel].sum())

def centre_col(x, ya, yb):
    ys = np.arange(ya, yb + 1)
    v = np.array([ink[y, x] * gridw(x, y) for y in ys])
    w = np.clip(v - 25.0, 0, None)
    if w.max() < 60:
        return None
    k = int(np.argmax(w))
    sel = (np.abs(np.arange(len(ys)) - k) <= 2) & (w >= 0.3 * w[k])
    return float((ys[sel] * w[sel]).sum() / w[sel].sum())

out = {}
for name, s in spec.items():
    res = {}
    lines = {}
    for side in ('left', 'right'):
        pts = []
        for (y0, y1, xa, xb) in s[side]:
            for y in range(y0, y1 + 1):
                c = centre_row(y, xa, xb)
                if c is not None:
                    pts.append((y, c))
        P = np.array(pts)
        b, a = np.polyfit(P[:, 0], P[:, 1], 1)
        r = P[:, 1] - (a + b * P[:, 0])
        lines[side] = (a, b)
        res[side] = dict(n=len(P), slope_dx_dy=float(b), rms=float(np.sqrt((r ** 2).mean())),
                         rows=[int(P[0, 0]), int(P[-1, 0])])
    bys = []
    if 'base_fixed' in s:
        bys = [float(s['base_fixed'])]
    for (x0, x1, ya, yb) in s.get('base', []):
        for x in range(x0, x1 + 1):
            c = centre_col(x, ya, yb)
            if c is not None:
                bys.append(c)
    by = float(np.mean(bys))
    (aL, bL), (aR, bR) = lines['left'], lines['right']
    ay = (aR - aL) / (bL - bR)
    ax = aL + bL * ay
    lx = aL + bL * by
    rx = aR + bR * by
    cx = (ax + lx + rx) / 3
    cy = (ay + 2 * by) / 3
    res.update(base_y=by, base_sd=float(np.std(bys)), base_n=len(bys), apex=[float(ax), float(ay)],
               left_corner=float(lx), right_corner=float(rx), width=float(rx - lx), height=float(by - ay),
               cx=float(cx), cy=float(cy))
    out[name] = res
    print(f"{name:6s} centroid ({cx:7.2f}, {cy:7.2f})  apex ({ax:6.1f},{ay:7.1f})  base y {by:7.2f} (sd {np.std(bys):.2f}, n {len(bys)})"
          f"  corners {lx:6.1f} {rx:6.1f}  w {rx - lx:5.1f} h {by - ay:5.1f}  sideL n{res['left']['n']} rms {res['left']['rms']:.2f}"
          f"  sideR n{res['right']['n']} rms {res['right']['rms']:.2f}")
json.dump(out, open(sys.argv[4], 'w'), indent=1)
