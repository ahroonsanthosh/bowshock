"""Centre of a solid (filled) symbol from its own dark pixels.
usage: python3 -I disc.py in.png thr r x y [x y ...]
For each approximate centre: take pixels darker than thr within radius r,
keep the largest 8-connected blob, and report its unweighted centroid,
bounding box and area; the bbox mid-point is printed as a second estimate.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
g = np.asarray(Image.open(sys.argv[1]).convert('L'), dtype=float)
thr, r = float(sys.argv[2]), float(sys.argv[3])
v = [float(a) for a in sys.argv[4:]]
for x, y in zip(v[0::2], v[1::2]):
    x0, y0 = int(x - r), int(y - r)
    sub = g[y0:int(y + r) + 1, x0:int(x + r) + 1]
    yy, xx = np.mgrid[0:sub.shape[0], 0:sub.shape[1]]
    m = (sub < thr) & (np.hypot(xx + x0 - x, yy + y0 - y) <= r)
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n == 0:
        print(x, y, 'none'); continue
    k = np.argmax(ndimage.sum(m, lab, range(1, n + 1))) + 1
    ys, xs = np.nonzero(lab == k)
    print('approx (%.1f,%.1f): centroid (%.2f, %.2f) bbox x %d-%d y %d-%d mid (%.1f, %.1f) area %d' % (
        x, y, xs.mean() + x0, ys.mean() + y0, xs.min() + x0, xs.max() + x0, ys.min() + y0, ys.max() + y0,
        (xs.min() + xs.max()) / 2 + x0, (ys.min() + ys.max()) / 2 + y0, len(xs)))
