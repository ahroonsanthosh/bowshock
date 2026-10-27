# usage: python3 -I calib.py <spec.json> <out.json>
# spec: {"png":..., "dpi":..., "box":[x0,y0,x1,y1],
#        "v":[[approx_px, value], ...], "h":[[approx_px, value], ...],
#        "xscale":"lin"|"log", "yscale":"lin"|"log", "halfwin":6, "dark":170}
# Traces each labelled gridline along its length inside box (darkness centroid in a +-halfwin window per
# 10-px band), fits a straight line robustly, intersects every v with every h line, then fits
# value = a0 + a1*px + a2*py for each axis by least squares over the intersections. Prints the 1-D tick
# positions (where each gridline crosses the box's bottom edge / left edge) and all residuals.
import sys, json
import numpy as np
from PIL import Image
spec = json.load(open(sys.argv[1]))
g = np.asarray(Image.open(spec['png']).convert('L'), dtype=float)
x0, y0, x1, y1 = spec['box']; hw = spec.get('halfwin', 6); dk = spec.get('dark', 170)
def tr(v): return v
def trace(p, along_lo, along_hi, vertical):
    # adaptive: follow the line band by band from the start, re-centring the window on the last centre
    pts = []; cur = float(p); miss = 0
    for a in range(along_lo, along_hi - 10, 10):
        q = int(round(cur))
        if vertical:
            win = g[a:a+10, q-hw:q+hw+1]; prof = (255 - win).sum(axis=0); m = (win < dk).mean(axis=0)
        else:
            win = g[q-hw:q+hw+1, a:a+10]; prof = (255 - win).sum(axis=1); m = (win < dk).mean(axis=1)
        if m.max() < 0.5:
            miss += 1; continue
        prof = prof - np.median(prof); prof[prof < 0] = 0
        if prof.sum() == 0: continue
        c = (np.arange(len(prof)) * prof).sum() / prof.sum() + q - hw
        if abs(c - cur) <= 2.5 or not pts: cur = c
        pts.append((a + 5, c))
    pts = np.array(pts)
    # robust fit: iterate rejecting > 1.5 px
    keep = np.ones(len(pts), bool)
    for _ in range(5):
        A = np.vstack([np.ones(keep.sum()), pts[keep, 0]]).T
        coef, *_ = np.linalg.lstsq(A, pts[keep, 1], rcond=None)
        r = pts[:, 1] - (coef[0] + coef[1] * pts[:, 0])
        newkeep = np.abs(r) < 1.5
        if (newkeep == keep).all(): break
        keep = newkeep
    return coef, np.sqrt(np.mean(r[keep]**2)), keep.sum(), len(pts)
V = []; H = []
for p, val in spec['v']:
    coef, rms, n, nt = trace(p, y0, y1, True); V.append((val, coef)); print(f"v line value {val}: x = {coef[0]:.2f} + {coef[1]:.5f}*y  (rms {rms:.2f}px, {n}/{nt} bands)")
for p, val in spec['h']:
    hx0, hx1 = spec.get('hspan', [x0, x1])
    coef, rms, n, nt = trace(p, hx0, hx1, False); H.append((val, coef)); print(f"h line value {val}: y = {coef[0]:.2f} + {coef[1]:.5f}*x  (rms {rms:.2f}px, {n}/{nt} bands)")
def fx(v): return np.log10(v) if spec.get('xscale') == 'log' else v
def fy(v): return np.log10(v) if spec.get('yscale') == 'log' else v
rows = []
for xv, cv in V:
    for yv, ch in H:
        # x = cv0 + cv1*y ; y = ch0 + ch1*x
        y = (ch[0] + ch[1] * cv[0]) / (1 - ch[1] * cv[1]); x = cv[0] + cv[1] * y
        rows.append((x, y, fx(xv), fy(yv), xv, yv))
R = np.array(rows)
A = np.vstack([np.ones(len(R)), R[:, 0], R[:, 1]]).T
cx, *_ = np.linalg.lstsq(A, R[:, 2], rcond=None); cy, *_ = np.linalg.lstsq(A, R[:, 3], rcond=None)
rx = R[:, 2] - A @ cx; ry = R[:, 3] - A @ cy
print("affine X = %.6g + %.6g*px + %.6g*py" % tuple(cx)); print("affine Y = %.6g + %.6g*px + %.6g*py" % tuple(cy))
print("intersection residuals (data units): x rms %.3g max %.3g ; y rms %.3g max %.3g" % (np.sqrt((rx**2).mean()), abs(rx).max(), np.sqrt((ry**2).mean()), abs(ry).max()))
# 1-D tick positions on box bottom (y1) and left (x0) edges
ticks_x = [(xv, cv[0] + cv[1] * y1) for xv, cv in V]; ticks_y = [(yv, ch[0] + ch[1] * x0) for yv, ch in H]
def fit1(t, f):
    t = np.array([(f(v), p) for v, p in t]); A1 = np.vstack([np.ones(len(t)), t[:, 1]]).T
    c, *_ = np.linalg.lstsq(A1, t[:, 0], rcond=None); return c, t[:, 0] - A1 @ c, t
c1x, r1x, tx = fit1(ticks_x, fx); c1y, r1y, ty = fit1(ticks_y, fy)
print("1-D x ticks (px at y=%d):" % y1, ", ".join(f"{v:g}@{p:.2f} (res {r:+.2g})" for (v, p), r in zip(ticks_x, r1x)))
print("1-D y ticks (py at x=%d):" % x0, ", ".join(f"{v:g}@{p:.2f} (res {r:+.2g})" for (v, p), r in zip(ticks_y, r1y)))
out = dict(spec=spec, ax=list(cx), ay=list(cy), res_x=list(rx), res_y=list(ry),
           rms_x=float(np.sqrt((rx**2).mean())), rms_y=float(np.sqrt((ry**2).mean())),
           sx=float(np.hypot(cx[1], cx[2])), sy=float(np.hypot(cy[1], cy[2])),
           ticks_x=[[v, p, r] for (v, p), r in zip(ticks_x, r1x)], ticks_y=[[v, p, r] for (v, p), r in zip(ticks_y, r1y)],
           vlines=[[v, list(c)] for v, c in V], hlines=[[v, list(c)] for v, c in H])
json.dump(out, open(sys.argv[2], 'w'), indent=1)
print("data units per px: x %.5g  y %.5g" % (out['sx'], out['sy']))
