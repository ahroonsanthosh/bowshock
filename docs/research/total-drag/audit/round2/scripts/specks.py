"""Find centre dots of hand-drawn open symbols: small dark connected blobs
(area amin..amax px) with no other dark pixel within an annulus r1..r2 around
their centroid except an enclosing outline beyond r2.  Prints centroids.
usage: specks.py png x0 y0 x1 y1 thr amin amax r_clear"""
import sys
import numpy as np
from PIL import Image
src = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); thr = float(sys.argv[6])
amin, amax = int(sys.argv[7]), int(sys.argv[8]); rc = float(sys.argv[9])
a = np.asarray(Image.open(src).convert("L"), dtype=float)[y0:y1, x0:x1]
d = a < thr
H, W = d.shape
lab = -np.ones(d.shape, int); n = 0; comps = []
for i in range(H):
    for j in range(W):
        if d[i, j] and lab[i, j] < 0:
            st = [(i, j)]; lab[i, j] = n; pts = []
            while st:
                p, q = st.pop(); pts.append((p, q))
                for dp in (-1, 0, 1):
                    for dq in (-1, 0, 1):
                        u, v = p + dp, q + dq
                        if 0 <= u < H and 0 <= v < W and d[u, v] and lab[u, v] < 0:
                            lab[u, v] = n; st.append((u, v))
                if len(pts) > amax + 5: break
            comps.append(pts); n += 1
yy, xx = np.mgrid[0:H, 0:W]
for k, pts in enumerate(comps):
    if not (amin <= len(pts) <= amax): continue
    P = np.array(pts); cy, cx = P.mean(axis=0)
    r = np.hypot(yy - cy, xx - cx)
    ring = (r > 2.5) & (r < rc)
    if (d & ring & (lab != k)).sum() > 0: continue
    w = 255 - a[P[:, 0], P[:, 1]]
    cy = (P[:, 0] * w).sum() / w.sum(); cx = (P[:, 1] * w).sum() / w.sum()
    print(f"{cx + x0:8.1f} {cy + y0:8.1f} area={len(pts)}")
