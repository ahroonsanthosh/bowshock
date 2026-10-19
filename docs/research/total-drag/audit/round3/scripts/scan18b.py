import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
import fig18_affine as F
a = np.asarray(Image.open(os.path.join(os.path.dirname(__file__), "..", "..", "work", "love-49.png")).convert("L"), dtype=float)
for arg in sys.argv[1:]:
    M, Plo, Phi = map(float, arg.split(":"))
    x, yhi = F.xy(M, Phi); _, ylo = F.xy(M, Plo)
    xi = int(round(x))
    col = a[int(ylo):int(yhi), xi - 1:xi + 2].min(axis=1)
    d = col < 215
    out = []; i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            w = 255 - col[i:j]; yc = int(ylo) + (np.arange(i, j) * w).sum() / w.sum()
            out.append(f"{F.value(xi, yc)[1]:.4f}(y{yc:.1f},w{j-i},m{int(col[i:j].min())})")
            i = j
        else: i += 1
    print(f"M {M:.3f} x {xi}: " + " ".join(out))
