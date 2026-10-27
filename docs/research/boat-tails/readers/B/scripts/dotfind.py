"""Find a pinpoint dot (darkness centroid) near a symbol centre.
Usage: python3 -I dotfind.py IMG u v [half=4]"""
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
u, v = float(sys.argv[2]), float(sys.argv[3])
h = int(sys.argv[4]) if len(sys.argv) > 4 else 4
u0, v0 = int(round(u)) - h, int(round(v)) - h
w = im[v0:v0 + 2 * h + 1, u0:u0 + 2 * h + 1]
bg = np.percentile(w, 75)
d = np.clip(bg - w, 0, None)
d[d < 0.3 * d.max()] = 0
vv, uu = np.mgrid[0:w.shape[0], 0:w.shape[1]]
print(f"dot u {u0 + (uu * d).sum() / d.sum():.2f} v {v0 + (vv * d).sum() / d.sum():.2f} peak {d.max():.0f}")
