# usage: python3 -I holes.py <png> <x0> <y0> <x1> <y1> [dark=128]
# lists (1) small isolated dark blobs (area 6..80, both sides < 12 px) = candidate centre dots, and
# (2) enclosed white holes (white components not touching the crop border) with bbox and centroid,
# which are the open interiors of symbols in a merged cluster
import sys
import numpy as np, cv2
from PIL import Image
a = sys.argv; x0, y0, x1, y1 = map(int, a[2:6]); dk = int(a[6]) if len(a) > 6 else 128
g = np.asarray(Image.open(a[1]).convert('L'))[y0:y1, x0:x1]
b = (g < dk).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(b, 8)
for i in range(1, n):
    x, y, w, h, ar = st[i]
    if 6 <= ar <= 80 and w < 12 and h < 12:
        print(f"dot  area {ar:3d} centre ({x0 + cen[i][0]:.1f},{y0 + cen[i][1]:.1f}) bbox w{w} h{h}")
wt = (1 - b).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(wt, 4)
for i in range(1, n):
    x, y, w, h, ar = st[i]
    if x == 0 or y == 0 or x + w >= wt.shape[1] or y + h >= wt.shape[0]: continue
    if ar < 8: continue
    print(f"hole area {ar:4d} centroid ({x0 + cen[i][0]:.1f},{y0 + cen[i][1]:.1f}) bbox x {x0 + x}-{x0 + x + w - 1} y {y0 + y}-{y0 + y + h - 1}")
