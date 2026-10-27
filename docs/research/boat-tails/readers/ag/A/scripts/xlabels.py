# usage: python3 -I xlabels.py <png> <x0> <y0> <x1> <y1> [gap=12]  -> label glyph groups along a row (x extent, y extent)
import sys
import numpy as np, cv2
from PIL import Image
g = np.asarray(Image.open(sys.argv[1]).convert('L')); x0, y0, x1, y1 = map(int, sys.argv[2:6]); gap = int(sys.argv[6]) if len(sys.argv) > 6 else 12
b = (g[y0:y1, x0:x1] < 128).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(b, 8)
comps = sorted([(x0 + st[i][0], x0 + st[i][0] + st[i][2] - 1, y0 + st[i][1], y0 + st[i][1] + st[i][3] - 1) for i in range(1, n) if st[i][4] >= 8 and st[i][2] < 60 and st[i][3] < 50])
groups = []
for c in comps:
    if groups and c[0] <= groups[-1][1] + gap:
        G = groups[-1]; groups[-1] = (G[0], max(G[1], c[1]), min(G[2], c[2]), max(G[3], c[3]))
    else: groups.append(c)
for G in groups: print(f"label x {G[0]}-{G[1]} (centre {(G[0]+G[1])/2:.1f}) y {G[2]}-{G[3]}")
