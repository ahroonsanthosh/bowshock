"""Column scans of fig. 35: dark runs at given M, away from horizontal grid lines.
usage: scan35.py M [M ...]"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from grid35 import g, V, H
a = np.asarray(Image.open(os.path.join(os.path.dirname(__file__), "..", "work", "love35-66.png")).convert("L"), dtype=float)

def x_of(M, y):
    # invert M along the row y
    lo, hi = 400.0, 2600.0
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        if g.value(mid, y)[0] < M: lo = mid
        else: hi = mid
    return 0.5 * (lo + hi)

for Ms in sys.argv[1:]:
    M = float(Ms)
    out = []
    y = 330
    xs = x_of(M, 1000)
    x = int(round(xs))
    col = a[330:1780, x - 1:x + 2].min(axis=1)
    d = col < 200
    i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            yc = 330 + (i + j - 1) / 2
            # horizontal grid line position at this x
            gl = [l + (x - 600) / (2150 - 600) * (r - l) for _, l, r in H]
            if min(abs(yc - q) for q in gl) > 3.5 or j - i > 7:
                Mv, P = g.value(x, yc)
                out.append(f"{P:.4f}(w{j-i},min{int(col[i:j].min())})")
            i = j
        else:
            i += 1
    print(f"M {M:.2f} x {x}: " + " ".join(out))
