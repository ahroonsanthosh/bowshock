"""Dense column scan for a panel module: every dx px, runs (w<=6) not on grid lines, ordinate in [lo,hi].
Assign by order when exactly n runs present.  Then report each line at requested abscissae by local
quadratic fit.  usage: dense_lines.py module dx lo hi n X1 X2 ..."""
import sys, os, importlib
sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
import numpy as np
from PIL import Image
m = importlib.import_module(sys.argv[1]); dx = int(sys.argv[2]); lo, hi = float(sys.argv[3]), float(sys.argv[4]); n = int(sys.argv[5])
Xs = [float(v) for v in sys.argv[6:]]
a = np.asarray(Image.open(m.PAGE).convert("L"), dtype=float)
x0 = int(min(t for _, t, _ in m.V)) + 4; x1 = int(max(t for _, t, _ in m.V)) - 4
lines = [[] for _ in range(n)]
for x in range(x0, x1, dx):
    if min(abs(x - 0.5 * (t + b)) for _, t, b in m.V) < 3.5: continue
    gl = [l + (x - m.xband[0]) / (m.xband[1] - m.xband[0]) * (r - l) for _, l, r in m.H]
    col = a[m.y0:m.y1, x]; d = col < m.thr; i = 0; vals = []
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            w = 255 - col[i:j]; yc = m.y0 + (np.arange(i, j) * w).sum() / w.sum()
            if j - i <= 6 and min(abs(yc - q) for q in gl) > 2.5:
                X, P = m.g.value(x, yc)
                if lo <= P <= hi: vals.append((X, P))
            i = j
        else: i += 1
    if len(vals) == n:
        vals.sort(key=lambda t: -t[1])
        for k in range(n): lines[k].append(vals[k])
for k in range(n):
    A = np.array(lines[k])
    if len(A) == 0: print(f"line {k}: none"); continue
    out = []
    for X in Xs:
        sel = np.abs(A[:, 0] - X) < 0.06 * (A[:, 0].max() - A[:, 0].min()) + 1e-9
        if sel.sum() >= 4:
            c = np.polyfit(A[sel, 0], A[sel, 1], 2 if sel.sum() > 8 else 1); r = A[sel, 1] - np.polyval(c, A[sel, 0])
            out.append(f"{X:g}:{np.polyval(c, X):.4f}(n{sel.sum()},sd{r.std():.4f})")
        else: out.append(f"{X:g}:-")
    print(f"line {k} (n={len(A)}, X {A[:, 0].min():.3f}..{A[:, 0].max():.3f}): " + " ".join(out))
