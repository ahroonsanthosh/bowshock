"""Track lines on fig. 5 from seeds (x, P_B), column by column (every 1 px), predicting from the
local slope; reports per line the fraction of columns where a run was found (solid ~1, dashed less),
and P_B at requested Mach numbers by local linear fit of the tracked points.
usage: track5.py x0 x1 P_seed1 [P_seed2 ...]"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
import numpy as np
from PIL import Image
import p5
a = np.asarray(Image.open(p5.PAGE).convert("L"), dtype=float)
g, H, V = p5.g, p5.H, p5.V
x0, x1 = int(sys.argv[1]), int(sys.argv[2]); seeds = [float(s) for s in sys.argv[3:]]
def y_of(x, P):
    lo, hi = 470.0, 2560.0
    for _ in range(50):
        mid = 0.5 * (lo + hi)
        if g.value(x, mid)[1] < P: lo = mid
        else: hi = mid
    return 0.5 * (lo + hi)
def runs(x):
    gl = [l + (x - p5.xband[0]) / (p5.xband[1] - p5.xband[0]) * (r - l) for _, l, r in H]
    col = a[470:2560, x]; d = col < 175; out = []; i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            yc = 470 + (i + j - 1) / 2
            if j - i <= 9 and min(abs(yc - q) for q in gl) > 2.5: out.append(yc)
            i = j
        else: i += 1
    return out
def onv(x): return min(abs(x - (t + 0.5 * (b - t))) for _, t, b in V) < 4
tr = [[(x0, y_of(x0, s))] for s in seeds]; slope = [None] * len(seeds); found = [0] * len(seeds); tot = 0
for x in range(x0 + 1, x1):
    if onv(x): continue
    tot += 1; rs = runs(x)
    # predicted positions
    preds = []
    for k, t in enumerate(tr):
        xl, yl = t[-1]
        if slope[k] is None and len(t) >= 2: pass
        sl = slope[k] if slope[k] is not None else 0.0
        preds.append(yl + sl * (x - xl))
    for k, t in enumerate(tr):
        if not rs: continue
        best = min(rs, key=lambda r: abs(r - preds[k]))
        others = [abs(best - p) for kk, p in enumerate(preds) if kk != k]
        if abs(best - preds[k]) < 2.0 and (not others or min(others) > abs(best - preds[k])):
            t.append((x, best)); found[k] += 1
            if len(t) > 6:
                xs = [p[0] for p in t[-25:]]; ys = [p[1] for p in t[-25:]]
                slope[k] = np.polyfit(xs, ys, 1)[0]
        elif slope[k] is None and len(t) == 1:
            pass
    if x == x0 + 1:
        pass
Ms = [float(m) for m in os.environ.get("MS", "1.5 2 2.5 3 3.5 4").split()]
for k, t in enumerate(tr):
    xs = np.array([p[0] for p in t]); ys = np.array([p[1] for p in t])
    MP = np.array([g.value(x, y) for x, y in zip(xs, ys)])
    vals = []
    for M in Ms:
        sel = np.abs(MP[:, 0] - M) < 0.03
        if sel.sum() >= 4:
            c = np.polyfit(MP[sel, 0], MP[sel, 1], 2 if sel.sum() > 8 else 1)
            vals.append(f"M{M:g}:{np.polyval(c, M):.4f}(n{sel.sum()})")
    print(f"seed {seeds[k]}: tracked {len(t)} cols, found fraction {found[k] / max(tot, 1):.2f}, M {MP[:, 0].min():.2f}..{MP[:, 0].max():.2f}  " + " ".join(vals))
