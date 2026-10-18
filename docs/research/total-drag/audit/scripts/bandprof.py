"""Row-profile peaks in successive narrow x-bands (to find faired curves
between symbols).  usage: bandprof.py png x0 x1 w y0 y1 frac"""
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert("L"), dtype=float) < 128
x0, x1, w, y0, y1 = map(int, sys.argv[2:7]); frac = float(sys.argv[7])
for xs in range(x0, x1, w):
    prof = a[y0:y1, xs:xs + w].mean(axis=1)
    idx = np.where(prof >= frac)[0]
    runs = []
    for i in idx:
        if runs and i == runs[-1][-1] + 1: runs[-1].append(i)
        else: runs.append([i])
    print(f"{xs}-{xs + w}: " + " ".join(f"{np.mean(r) + y0:.1f}" for r in runs))
