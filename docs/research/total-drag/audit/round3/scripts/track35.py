"""Track the curves of fig. 35 column by column.  At each column x, dark runs (<200) that are
not on a horizontal grid line and not inside a vertical grid line are found; runs are linked
to tracks seeded at given (x, y) by nearest continuation (predicted from the last slope).
usage: track35.py x0 x1 seed_y [seed_y ...]   (seeds at column x0)"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from grid35 import g, V, H
a = np.asarray(Image.open(os.path.join(os.path.dirname(__file__), "..", "work", "love35-66.png")).convert("L"), dtype=float)
x0, x1 = int(sys.argv[1]), int(sys.argv[2]); seeds = [float(s) for s in sys.argv[3:]]

def runs_at(x):
    col = a[300:1800, x]
    d = col < 200
    out = []; i = 0
    gl = [l + (x - 600) / (2150 - 600) * (r - l) for _, l, r in H]
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            yc = 300 + (i + j - 1) / 2
            if j - i <= 8 and min(abs(yc - q) for q in gl) > 3.0:
                out.append(yc)
            i = j
        else: i += 1
    return out

# vertical gridline columns to skip
def on_vline(x, y=1000):
    t = (y - 420) / (1650 - 420)
    return min(abs(x - (tt + t * (bb - tt))) for _, tt, bb in V) < 3.5

tracks = [[(x0, s)] for s in seeds]
slopes = [0.0 for _ in seeds]
hits = [0 for _ in seeds]; cols = 0
for x in range(x0 + 1, x1):
    if on_vline(x, 1000): continue
    cols += 1
    rs = runs_at(x)
    for k, tr in enumerate(tracks):
        xl, yl = tr[-1]
        pred = yl + slopes[k] * (x - xl)
        if not rs: continue
        best = min(rs, key=lambda r: abs(r - pred))
        if abs(best - pred) < 2.5 + 0.02 * (x - xl):
            if x - xl < 40 and len(tr) > 3:
                xs = [p[0] for p in tr[-8:]] + [x]; ys = [p[1] for p in tr[-8:]] + [best]
                slopes[k] = np.polyfit(xs, ys, 1)[0]
            tr.append((x, best)); hits[k] += 1
for k, tr in enumerate(tracks):
    xs = np.array([p[0] for p in tr]); ys = np.array([p[1] for p in tr])
    print(f"track {k} seed {seeds[k]}: {len(tr)} pts, coverage {hits[k] / max(cols, 1):.2f}, x {xs.min()}..{xs.max()}")
    for Mq in np.arange(1.0, 3.45, 0.1):
        # find nearest points around the column of Mq
        Ms = np.array([g.value(x, y)[0] for x, y in zip(xs, ys)])
        sel = np.abs(Ms - Mq) < 0.04
        if sel.sum() >= 3:
            c = np.polyfit(Ms[sel], ys[sel], 1); yq = np.polyval(c, Mq)
            xq = xs[sel].mean()
            print(f"   M {Mq:.2f}: P_B {g.value(xq, yq)[1]:.4f} (n {sel.sum()})")
