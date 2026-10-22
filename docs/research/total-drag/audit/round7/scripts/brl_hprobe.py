"""Heavy horizontal rulings in each gap between vertical rulings (exploratory).

usage: python3 -I brl_hprobe.py PAGE.png y0 y1 THRESH x_first x_step n [halfwidth]
For gap centres x_first + k x_step (k < n) the row darkness over +-halfwidth
px (default 25) is searched for local maxima above THRESH in y0..y1; one line
per gap. Used to follow a ruling across the skewed BRL 934 page.
"""
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
d = 255.0 - np.asarray(Image.open(sys.argv[1]).convert("L")).astype(float)
y0, y1 = int(sys.argv[2]), int(sys.argv[3])
thr = float(sys.argv[4])
xf, xs, n = float(sys.argv[5]), float(sys.argv[6]), int(sys.argv[7])
hw = int(sys.argv[8]) if len(sys.argv) > 8 else 25
for k in range(n):
    xc = int(round(xf + k * xs))
    p = d[y0:y1, xc - hw:xc + hw].mean(axis=1)
    ps = np.convolve(p, np.ones(3) / 3, mode="same")
    out = []
    for i in range(2, len(ps) - 2):
        if ps[i] >= ps[i - 1] and ps[i] > ps[i + 1] and ps[i] > thr:
            w = p[i - 2:i + 3]
            out.append("%.1f:%.0f" % (y0 + (np.arange(i - 2, i + 3) * w).sum() / w.sum(), ps[i]))
    print("x%d %s" % (xc, " ".join(out)))
