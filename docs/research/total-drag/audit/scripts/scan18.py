"""Column scans of TN 3819 fig 18 between grid lines: dark-run centres not on
a horizontal grid line.  usage: scan18.py png x0 x1 dx y0 y1 thr"""
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert("L"), dtype=float)
x0, x1, dx, y0, y1 = map(int, sys.argv[2:7]); thr = float(sys.argv[7])
L = [1805.9,1746.0,1685.1,1625.1,1565.0,1505.1,1444.9,1385.2,1325.2,1265.1,1205.1,1144.1,1084.9,1024.2,964.2,904.0,844.0,784.2,724.0,664.2,604.0,543.9,483.1,423.1,362.5,302.2]
R = [1800.9,1740.7,1680.0,1620.5,1559.9,1499.9,1439.9,1380.0,1320.0,1259.9,1199.9,1139.6,1079.9,1019.0,959.5,898.9,838.9,779.0,718.9,658.9,598.9,538.9,478.0,418.0,357.4,297.5]
for x in range(x0, x1, dx):
    t = (x - 660) / (2510 - 660)
    gl = [l + t * (r - l) for l, r in zip(L, R)]
    col = a[y0:y1, x - 1:x + 2].min(axis=1)
    d = col < thr
    out = []; i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            w = 255 - col[i:j]; c = (np.arange(i, j) * w).sum() / w.sum() + y0
            if min(abs(c - g) for g in gl) > 3.5 or j - i > 6:
                out.append(f"{c:.1f}/{j-i}/{int(col[i:j].min())}")
            i = j
        else:
            i += 1
    print(x, " ".join(out))
