"""Find candidate gridline positions from dark-pixel projections.
Usage: python3 -I projections.py page.jpg"""
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
print('shape', a.shape)
dark = a < 140
# region of frame (rough)
y0, y1, x0, x1 = 700, 2320, 380, 2060
sub = dark[y0:y1, x0:x1]
col = sub.sum(axis=0)
row = sub.sum(axis=1)
def peaks(v, off, thr):
    out = []
    i = 0
    n = len(v)
    while i < n:
        if v[i] >= thr:
            j = i
            while j < n and v[j] >= thr:
                j += 1
            seg = v[i:j]
            c = (np.arange(i, j) * seg).sum() / seg.sum()
            out.append((round(c + off, 1), int(seg.max()), j - i))
            i = j
        else:
            i += 1
    return out
print('vertical lines (x, max count, width):')
for p in peaks(col, x0, 0.4 * sub.shape[0]):
    print(p)
print('horizontal lines (y, max count, width):')
for p in peaks(row, y0, 0.4 * sub.shape[1]):
    print(p)
