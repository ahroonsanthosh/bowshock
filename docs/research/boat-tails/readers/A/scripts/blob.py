"""Bounding box and stroke centroid of the dark connected component nearest
to a point, after removing long grid lines.
usage: python3 -I blob.py LIB IMG ROT X Y [HALF] [THR]"""
import sys
ns = {}
exec(open(sys.argv[1]).read(), ns)
import numpy as np, cv2
g0 = ns['load_gray'](sys.argv[2], int(sys.argv[3]))
g, _ = ns['remove_lines'](g0)
x, y = int(float(sys.argv[4])), int(float(sys.argv[5]))
half = int(sys.argv[6]) if len(sys.argv) > 6 else 30
thr = float(sys.argv[7]) if len(sys.argv) > 7 else 140
win = g[y - half:y + half, x - half:x + half]
dark = (win < thr).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(dark, 8)
best = None
for k in range(1, n):
    ys, xs = np.nonzero(lab == k)
    d = np.min((xs - half) ** 2 + (ys - half) ** 2)
    if best is None or d < best[0]:
        best = (d, k)
k = best[1]
ys, xs = np.nonzero(lab == k)
w = (255 - win[ys, xs])
print('bbox x %d..%d y %d..%d  bbox centre (%.1f, %.1f)  ink centroid (%.2f, %.2f) n=%d' % (
    xs.min() + x - half, xs.max() + x - half, ys.min() + y - half, ys.max() + y - half,
    (xs.min() + xs.max()) / 2 + x - half + 0.0, (ys.min() + ys.max()) / 2 + y - half,
    (xs * w).sum() / w.sum() + x - half, (ys * w).sum() / w.sum() + y - half, len(xs)))
