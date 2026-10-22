"""List ink peaks (darkness centroids) along columns (exploratory).

usage: python3 -I peaks.py PAGE.png Y0 Y1 X [X ...]
For each column X (averaged over X-1..X+1) prints the centroid y, peak
darkness and width (pixels above half peak) of each ink run in Y0..Y1.
"""
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
d = 255.0 - np.asarray(Image.open(sys.argv[1]).convert("L")).astype(float)
y0, y1 = int(sys.argv[2]), int(sys.argv[3])
for xs in sys.argv[4:]:
    x = int(xs)
    p = d[y0:y1, x - 1:x + 2].mean(axis=1)
    runs = []
    i = 0
    while i < len(p):
        if p[i] > 30:
            j = i
            while j < len(p) and p[j] > 30:
                j += 1
            seg = p[i:j]
            c = (np.arange(i, j) * seg).sum() / seg.sum() + y0
            pk = seg.max()
            wd = int((seg > pk / 2).sum())
            runs.append("%.1f(%d,w%d)" % (c, pk, wd))
            i = j
        else:
            i += 1
    print("x=%d:" % x, " ".join(runs))
