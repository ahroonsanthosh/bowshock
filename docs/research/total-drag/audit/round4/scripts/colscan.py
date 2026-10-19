"""Generic column scan on a page with a Grid: for each abscissa value X (axis units), find the
column x at mid-height, list dark runs (thr) between y0 and y1 that are not on horizontal grid lines,
and print their ordinate values.  Used for TR 1109 fig. 29 and others.
usage: colscan.py module X1 X2 ...   (module defines PAGE, g, H, y0, y1, thr, xband)"""
import sys, os, importlib
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
import numpy as np
from PIL import Image
m = importlib.import_module(sys.argv[1])
a = np.asarray(Image.open(m.PAGE).convert("L"), dtype=float)
def x_of(X, y):
    lo, hi = 0.0, a.shape[1] - 1.0
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        if m.g.value(mid, y)[0] < X: lo = mid
        else: hi = mid
    return 0.5 * (lo + hi)
for Xs in sys.argv[2:]:
    X = float(Xs); x = int(round(x_of(X, 0.5 * (m.y0 + m.y1))))
    col = a[m.y0:m.y1, x - 1:x + 2].min(axis=1); d = col < m.thr
    gl = [l + (x - m.xband[0]) / (m.xband[1] - m.xband[0]) * (r - l) for _, l, r in m.H]
    out = []; i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            w = 255 - col[i:j]; yc = m.y0 + (np.arange(i, j) * w).sum() / w.sum()
            tag = "grid" if min(abs(yc - q) for q in gl) < 3.0 and j - i < 6 else ""
            if not tag:
                out.append(f"{m.g.value(x, yc)[1]:.4f}(w{j - i},m{int(col[i:j].min())})")
            i = j
        else: i += 1
    print(f"X {X:g} x {x}: " + " ".join(out))
