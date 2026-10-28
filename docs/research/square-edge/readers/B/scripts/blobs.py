"""List dark connected blobs in a region of a page image.
usage: python3 -I blobs.py in.png x0 y0 x1 y1 thresh minarea maxarea
Prints centroid (native pixels, intensity-weighted), bbox, area.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src = sys.argv[1]
x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
th = float(sys.argv[6])
amin, amax = int(sys.argv[7]), int(sys.argv[8])
g = np.asarray(Image.open(src).convert("L"), dtype=float)[y0:y1, x0:x1]
mask = g < th
lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
w = 255.0 - g
for k, sl in enumerate(ndimage.find_objects(lab), start=1):
    m = lab[sl] == k
    a = int(m.sum())
    if a < amin or a > amax:
        continue
    ys, xs = np.nonzero(m)
    ww = w[sl][m]
    cy = (ys * ww).sum() / ww.sum() + sl[0].start + y0
    cx = (xs * ww).sum() / ww.sum() + sl[1].start + x0
    print("cx=%8.2f cy=%8.2f area=%5d bbox x%d-%d y%d-%d" % (
        cx, cy, a, sl[1].start + x0, sl[1].stop + x0 - 1,
        sl[0].start + y0, sl[0].stop + y0 - 1))
