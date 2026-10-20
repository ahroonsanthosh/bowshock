"""Dense column scan of fig. 35: for every 2nd column, dark runs (<200, width<=7) not on grid
lines, converted to (M, P_B).  Prints per 0.05-M bin the distinct line levels (clustered within
0.003), with counts.  usage: dense35.py Mlo Mhi Pmin Pmax"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from grid35 import g, V, H
a = np.asarray(Image.open(os.path.join(os.path.dirname(__file__), "..", "work", "love35-66.png")).convert("L"), dtype=float)
Mlo, Mhi, Pmin, Pmax = map(float, sys.argv[1:5])
pts = []
for x in range(540, 2450, 2):
    t = 0.45
    if min(abs(x - (tt + t * (bb - tt))) for _, tt, bb in V) < 4: continue
    col = a[330:1790, x]; d = col < 200
    gl = [l + (x - 600) / (2150 - 600) * (r - l) for _, l, r in H]
    i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            yc = 330 + (i + j - 1) / 2
            if j - i <= 7 and min(abs(yc - q) for q in gl) > 3.5:
                M, P = g.value(x, yc)
                if Mlo <= M <= Mhi and Pmin <= P <= Pmax:
                    pts.append((M, P))
            i = j
        else: i += 1
pts = np.array(pts)
W = float(sys.argv[5]) if len(sys.argv) > 5 else 0.05
for b0 in np.arange(Mlo, Mhi, 0.1):
    sel = pts[(pts[:, 0] >= b0 - W) & (pts[:, 0] < b0 + W)]
    if len(sel):
        c = np.polyfit(sel[:, 0], sel[:, 1], 0)
    # remove local slope per point using nearest-neighbour is not possible; report raw clusters
    if len(sel) == 0: print(f"{b0:.2f}: none"); continue
    # detrend within bin by local slope: cluster on P after removing mean slope of the bundle
    Ps = np.sort(sel[:, 1])
    cl = [[Ps[0]]]
    for p in Ps[1:]:
        if p - cl[-1][-1] < 0.003: cl[-1].append(p)
        else: cl.append([p])
    print(f"{b0:.2f}+-{W}: " + "  ".join(f"{np.mean(c):.4f}[{len(c)}]" for c in cl))
