import sys, os
sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
import numpy as np
from PIL import Image
import p5
a = np.asarray(Image.open(p5.PAGE).convert("L"), dtype=float)
g, H, V = p5.g, p5.H, p5.V
x0, x1, dx = map(int, sys.argv[1:4]); Plo, Phi = float(sys.argv[4]), float(sys.argv[5])
for x in range(x0, x1, dx):
    if min(abs(x - (t + 0.5 * (b - t))) for _, t, b in V) < 4: continue
    gl = [l + (x - p5.xband[0]) / (p5.xband[1] - p5.xband[0]) * (r - l) for _, l, r in H]
    col = a[470:2560, x]; d = col < 170; out = []; i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            yc = 470 + (i + j - 1) / 2
            if j - i <= 9 and min(abs(yc - q) for q in gl) > 3.0:
                M, P = g.value(x, yc)
                if Plo <= P <= Phi: out.append(f"{P:.4f}")
            i = j
        else: i += 1
    print(f"{x} M{g.value(x, 1500)[0]:.3f}: " + " ".join(out))
