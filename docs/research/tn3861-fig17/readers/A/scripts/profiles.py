"""Row and column darkness profiles of the plot area, to locate grid lines.
usage: python -I profiles.py gray.png x0 y0 x1 y1"""
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
x0, y0, x1, y1 = map(int, sys.argv[2:6])
sub = 255 - a[y0:y1, x0:x1]
col = sub.mean(axis=0)   # dark per page column -> vertical lines (constant x)
row = sub.mean(axis=1)   # dark per page row -> horizontal lines (constant y)
def peaks(p, off, thr):
    out = []
    for i in range(1, len(p)-1):
        if p[i] >= thr and p[i] >= p[i-1] and p[i] >= p[i+1]:
            out.append((i+off, round(p[i], 1)))
    return out
print('columns (page x) with strong darkness:')
thr = np.percentile(col, 50) + 3*np.std(col)
print([c for c in peaks(col, x0, max(thr, 40))])
print('rows (page y) with strong darkness:')
thr = np.percentile(row, 50) + 3*np.std(row)
print([r for r in peaks(row, y0, max(thr, 40))])
