# Coarse projections of dark pixels to locate grid lines.
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]), dtype=float)
dark = a < 128
H, W = a.shape
print('size', W, H)
# vertical lines: columns, using rows 1300..1740 (lower plot, few data)
col = dark[1300:1740, :].sum(axis=0)
idx = np.where(col > 0.5 * 440)[0]
# group
groups = np.split(idx, np.where(np.diff(idx) > 3)[0] + 1)
print('vertical candidates (x range, peak count):')
for g in groups:
    if len(g):
        print(g[0], g[-1], col[g].max())
row = dark[:, 1500:2300].sum(axis=0) if False else dark[:, 1500:2300].sum(axis=1)
idx = np.where(row > 0.5 * 800)[0]
groups = np.split(idx, np.where(np.diff(idx) > 3)[0] + 1)
print('horizontal candidates (y range, peak):')
for g in groups:
    if len(g):
        print(g[0], g[-1], row[g].max())
