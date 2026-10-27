# usage: python3 -I findpanels.py <png> [xa xb]  -> prints panel boxes (frame extents) on a page
import sys
import numpy as np
from PIL import Image
g = np.asarray(Image.open(sys.argv[1]).convert('L'))
xa, xb = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (700, 1400)
rows = np.where((g[:, xa:xb] < 128).mean(axis=1) > 0.6)[0]
groups = []
for r in rows:
    if groups and r - groups[-1][-1] < 120: groups[-1].append(r)
    else: groups.append([r])
for gr in groups:
    top, bot = gr[0], gr[-1]
    if bot - top < 100: continue
    sub = g[top:bot, :] < 128
    cols = np.where(sub.mean(axis=0) > 0.6)[0]
    print(f"panel y {top}-{bot}  x {cols.min()}-{cols.max()}")
