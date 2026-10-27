# usage: python3 -I ylabels.py <png> <lx0> <lx1> <y0> <y1>  -> label glyph groups (y extent, x extent) in a column
import sys
import numpy as np, cv2
from PIL import Image
g = np.asarray(Image.open(sys.argv[1]).convert('L')); lx0, lx1, y0, y1 = map(int, sys.argv[2:6])
b = (g[y0:y1, lx0:lx1] < 128).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(b, 8)
comps = sorted([(y0 + st[i][1], y0 + st[i][1] + st[i][3] - 1, lx0 + st[i][0], lx0 + st[i][0] + st[i][2] - 1) for i in range(1, n) if st[i][4] >= 8])
groups = []
for c in comps:
    if groups and c[0] <= groups[-1][1] + 6: 
        G = groups[-1]; groups[-1] = (min(G[0], c[0]), max(G[1], c[1]), min(G[2], c[2]), max(G[3], c[3]))
    else: groups.append(c)
for G in groups:
    if G[1] - G[0] >= 10: print(f"label y {G[0]}-{G[1]} (centre {(G[0]+G[1])/2:.1f}) x {G[2]}-{G[3]}")
