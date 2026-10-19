import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from grid35 import g, V, H
a = np.asarray(Image.open(os.path.join(os.path.dirname(__file__), "..", "work", "love35-66.png")).convert("L"), dtype=float)
x0, x1, dx, y0, y1 = map(int, sys.argv[1:6])
for x in range(x0, x1, dx):
    if min(abs(x - (tt + 0.45 * (bb - tt))) for _, tt, bb in V) < 4: continue
    col = a[y0:y1, x]; d = col < 200
    gl = [l + (x - 600) / (2150 - 600) * (r - l) for _, l, r in H]
    out = []; i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            yc = y0 + (i + j - 1) / 2
            if j - i <= 7 and min(abs(yc - q) for q in gl) > 3.5:
                out.append(f"{yc:.0f}")
            i = j
        else: i += 1
    M = g.value(x, 1100)[0]
    print(f"{x} M{M:.3f}: " + " ".join(out))
