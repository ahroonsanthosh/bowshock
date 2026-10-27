# usage: python3 -I dots.py <png> <x> <y> <half_window> [dark=200] [invert=0]
# lists small isolated blobs (plotting pin-prick dots) near (x,y): connected components of pixels darker
# than <dark> (or lighter than <dark> if invert=1, for filled symbols) with area 2..40 px, with centroids.
import sys
import numpy as np, cv2
from PIL import Image
f = sys.argv[1]; x, y, h = float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4])
dk = int(sys.argv[5]) if len(sys.argv) > 5 else 200; inv = len(sys.argv) > 6 and sys.argv[6] == '1'
g = np.asarray(Image.open(f).convert('L')).astype(np.float32)
x0, y0 = int(x) - h, int(y) - h
w = g[y0:y0 + 2 * h + 1, x0:x0 + 2 * h + 1]
b = ((w > dk) if inv else (w < dk)).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(b, 8)
for i in range(1, n):
    bx, by, bw, bh, a = st[i]
    if 2 <= a <= 40 and max(bw, bh) <= 8:
        ys, xs = np.where(lab == i); wt = (w[ys, xs] if inv else 255 - w[ys, xs])
        print(f"blob area {a} at ({x0 + (xs * wt).sum() / wt.sum():.2f},{y0 + (ys * wt).sum() / wt.sum():.2f}) min/max grey {w[ys, xs].min():.0f}/{w[ys, xs].max():.0f}")
