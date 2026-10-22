"""Quick pixel probe used while setting up the grid fit (exploratory only).

usage: python3 -I probe.py PAGE.png
"""
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

im = np.asarray(Image.open(sys.argv[1]).convert("L")).astype(float)
print("shape", im.shape)
print("percentiles 1,5,10,50,90:", np.percentile(im[700:3700, 800:4400], [1, 5, 10, 50, 90]))
d = 255.0 - im
p = d[3100:3550, 700:im.shape[1]].mean(axis=0)
thr = np.median(p) + 6 * p.std() / 3
cols = np.where(p > np.median(p) + 40)[0] + 700
print("dark columns (band y 3100-3550):", cols.tolist())
q = d[750:3650, 900:1000].mean(axis=1)
rows = np.where(q > np.median(q) + 40)[0] + 750
print("dark rows (band x 900-1000):", rows.tolist())
