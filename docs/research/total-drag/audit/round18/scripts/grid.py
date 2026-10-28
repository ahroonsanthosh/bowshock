import sys
import numpy as np
from PIL import Image
a = np.array(Image.open(sys.argv[1]).convert('L')) < 128   # ink True
x0, y0, x1, y1 = map(int, sys.argv[2:6])
sub = a[y0:y1, x0:x1]
col = sub.sum(axis=0); row = sub.sum(axis=1)
H, W = sub.shape
print('panel window', x0, y0, x1, y1, 'H', H, 'W', W)
def peaks(prof, thr, off):
    idx = np.where(prof > thr)[0]
    groups = []
    for i in idx:
        if groups and i - groups[-1][-1] <= 1: groups[-1].append(i)
        else: groups.append([i])
    out = []
    for g in groups:
        g = np.array(g); w = prof[g].astype(float)
        out.append((off + (g*w).sum()/w.sum(), off+g[0], off+g[-1], int(prof[g].max())))
    return out
print('vertical lines (x center, from, to, max count):')
for p in peaks(col, 0.6*H, x0): print('  %.2f %d %d %d' % p)
print('horizontal lines (y center, from, to, max count):')
for p in peaks(row, 0.6*W, y0): print('  %.2f %d %d %d' % p)
