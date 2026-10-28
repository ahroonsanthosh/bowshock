"""Measure legend line styles: components right of the airfoil sketches in the legend box.
Usage: legend.py img.png x0 y0 x1 y1 out.png"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
a = np.array(Image.open(sys.argv[1]).convert('L')) < 128
x0, y0, x1, y1 = map(int, sys.argv[2:6])
sub = a[y0:y1, x0:x1]
lab, n = ndi.label(sub, structure=np.ones((3,3)))
rows = []
for i in range(1, n+1):
    ys, xs = np.where(lab == i)
    rows.append((ys.mean()+y0, xs.min()+x0, xs.max()+x0, ys.min()+y0, ys.max()+y0, len(xs)))
rows.sort(key=lambda r: (round(r[0]/10), r[1]))
prev = None
for r in rows:
    if r[5] < 3: continue
    print('cy %.1f  x %d-%d (len %d)  y %d-%d  n %d' % (r[0], r[1], r[2], r[2]-r[1]+1, r[3], r[4], r[5]))
im = Image.fromarray(np.where(sub, 0, 255).astype(np.uint8)).resize(((x1-x0)*4, (y1-y0)*4), Image.NEAREST)
im.save(sys.argv[6])
