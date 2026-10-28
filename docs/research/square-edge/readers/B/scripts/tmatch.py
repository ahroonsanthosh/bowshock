"""Locate plotted symbols by matching synthetic outline templates.

usage: python3 -I tmatch.py degrid.npy ox oy cands.csv sizes.json out.csv
cands.csv rows: id,type,x,y,search  (approximate native centre, search radius px)
type: disc | ring | square | diamond | triangle_up | triangle_down
sizes.json: {"disc": r, "ring": [r_out, r_in], "square": [h_out, h_in],
             "diamond": [d_out, d_in]}  (pixels)
The residual (grid suppressed) is correlated (zero-mean normalised) with
the template over the search window, the peak is refined with a
parabola in x and y, and the centre, score and the score of the second
best separated peak are written out. The centre is the template's own
geometric centre, so it is found from the symbol's strokes.
"""
import csv
import json
import sys
import numpy as np

res = np.load(sys.argv[1])
ox, oy = int(sys.argv[2]), int(sys.argv[3])
cands = list(csv.DictReader(open(sys.argv[4])))
sizes = json.load(open(sys.argv[5]))
out = sys.argv[6]
SS = 4  # supersampling for template rasterisation


def template(kind):
    R = 10
    n = 2 * R + 1
    yy, xx = np.mgrid[0:n * SS, 0:n * SS]
    xx = (xx + 0.5) / SS - R - 0.5
    yy = (yy + 0.5) / SS - R - 0.5
    if kind == "disc":
        m = np.hypot(xx, yy) <= sizes["disc"]
    elif kind == "ring":
        ro, ri = sizes["ring"]
        r = np.hypot(xx, yy)
        m = (r <= ro) & (r >= ri)
    elif kind == "square":
        ho, hi = sizes["square"]
        c = np.maximum(abs(xx), abs(yy))
        m = (c <= ho) & (c >= hi)
    elif kind == "diamond":
        do, di = sizes["diamond"]
        c = abs(xx) + abs(yy)
        m = (c <= do) & (c >= di)
    else:
        raise SystemExit("unknown type " + kind)
    t = m.reshape(n, SS, n, SS).mean(axis=(1, 3))
    return t


def ncc_map(cx, cy, t, srch):
    R = t.shape[0] // 2
    tt = t - t.mean()
    tn = np.sqrt((tt ** 2).sum())
    xs = np.arange(int(cx) - srch, int(cx) + srch + 1)
    ys = np.arange(int(cy) - srch, int(cy) + srch + 1)
    M = np.zeros((len(ys), len(xs)))
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            w = res[y - oy - R:y - oy + R + 1, x - ox - R:x - ox + R + 1]
            ww = w - w.mean()
            d = np.sqrt((ww ** 2).sum()) * tn
            M[j, i] = (ww * tt).sum() / d if d > 0 else 0
    return xs, ys, M


rows = []
for c in cands:
    t = template(c["type"])
    xs, ys, M = ncc_map(float(c["x"]), float(c["y"]), t, int(c["search"]))
    j, i = np.unravel_index(np.argmax(M), M.shape)
    fx = fy = 0.0
    if 0 < i < M.shape[1] - 1:
        a, b, cc = M[j, i - 1], M[j, i], M[j, i + 1]
        den = a - 2 * b + cc
        fx = 0.5 * (a - cc) / den if den else 0.0
    if 0 < j < M.shape[0] - 1:
        a, b, cc = M[j - 1, i], M[j, i], M[j + 1, i]
        den = a - 2 * b + cc
        fy = 0.5 * (a - cc) / den if den else 0.0
    bx, by = xs[i] + fx, ys[j] + fy
    edge = i in (0, M.shape[1] - 1) or j in (0, M.shape[0] - 1)
    # half-width of the peak (pixels where score > peak-0.1) as a spread measure
    k = M > M[j, i] - 0.1
    yy, xx = np.nonzero(k)
    spread = max(xx.max() - xx.min(), yy.max() - yy.min()) / 2.0
    rows.append([c["id"], c["type"], "%.2f" % bx, "%.2f" % by, "%.3f" % M[j, i],
                 "%.1f" % spread, "edge" if edge else ""])
    print(*rows[-1])
with open(out, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["id", "type", "px", "py", "score", "spread", "edge"])
    w.writerows(rows)
