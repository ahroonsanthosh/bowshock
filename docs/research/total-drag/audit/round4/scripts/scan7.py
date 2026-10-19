import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
import p7
a = np.asarray(Image.open(p7.PAGE).convert("L"), dtype=float)
for Ms in sys.argv[1:]:
    M = float(Ms); x = int(round(p7.x_of(M)))
    col = a[820:1250, x - 1:x + 2].min(axis=1); d = col < 150
    out = []; i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            w = 255 - col[i:j]; yc = 820 + (np.arange(i, j) * w).sum() / w.sum()
            out.append(f"{p7.P_of(yc):.4f}(w{j-i})"); i = j
        else: i += 1
    print(f"M' {M:.2f} x {x}: " + " ".join(out))
