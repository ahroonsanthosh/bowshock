"""Symbols on a gridded plot: remove straight grid/curve runs (horizontal or vertical runs longer
than L px), then report connected components of size within limits (bbox centre, bbox size).
usage: blobs.py png x0 y0 x1 y1 thr L minpix maxpix"""
import sys
import numpy as np
from PIL import Image
src = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); thr = float(sys.argv[6]); L = int(sys.argv[7])
mn, mx = int(sys.argv[8]), int(sys.argv[9])
a = np.asarray(Image.open(src).convert("L"), dtype=float)[y0:y1, x0:x1]
d = a < thr
keep = d.copy()
H, W = d.shape
for i in range(H):  # horizontal runs
    row = d[i]; j = 0
    while j < W:
        if row[j]:
            k = j
            while k < W and row[k]: k += 1
            if k - j > L: keep[i, j:k] = False
            j = k
        else: j += 1
for j in range(W):
    col = d[:, j]; i = 0
    while i < H:
        if col[i]:
            k = i
            while k < H and col[k]: k += 1
            if k - i > L: keep[i:k, j] = False
            i = k
        else: i += 1
lab = -np.ones(d.shape, int); n = 0
for i in range(H):
    for j in range(W):
        if keep[i, j] and lab[i, j] < 0:
            st = [(i, j)]; lab[i, j] = n; pts = []
            while st:
                p, q = st.pop(); pts.append((p, q))
                for dp in (-2, -1, 0, 1, 2):
                    for dq in (-2, -1, 0, 1, 2):
                        u, v = p + dp, q + dq
                        if 0 <= u < H and 0 <= v < W and keep[u, v] and lab[u, v] < 0:
                            lab[u, v] = n; st.append((u, v))
            P = np.array(pts)
            if mn <= len(P) <= mx:
                ys, xs = P[:, 0], P[:, 1]
                print(f"{(xs.min() + xs.max()) / 2 + x0:7.1f} {(ys.min() + ys.max()) / 2 + y0:7.1f}  w{xs.max() - xs.min() + 1} h{ys.max() - ys.min() + 1} n{len(P)}")
            n += 1
