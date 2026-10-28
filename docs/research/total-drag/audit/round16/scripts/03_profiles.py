# Column and row darkness profiles over the plotting frame, to locate gridlines roughly.
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
dark = 255 - im
H, W = im.shape
# column profile over a vertical band y 760..2260
col = dark[760:2260, :].mean(axis=0)
row = dark[:, 420:2000].mean(axis=1)
def peaks(p, thr, mind):
    out = []
    i = 0
    idx = np.where(p > thr)[0]
    groups = []
    for k in idx:
        if groups and k - groups[-1][-1] <= 2:
            groups[-1].append(k)
        else:
            groups.append([k])
    for g in groups:
        g = np.array(g)
        w = p[g]
        out.append((round(float((g * w).sum() / w.sum()), 2), round(float(w.max()), 1), len(g)))
    return out
print('columns (x centre, peak darkness, width):')
for c in peaks(col, 40, 3): print(c)
print('rows:')
for r in peaks(row, 40, 3): print(r)
