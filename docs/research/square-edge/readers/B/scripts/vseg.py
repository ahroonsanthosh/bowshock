"""Find long vertical dark line segments in a region: column, top, bottom.
usage: python3 -I vseg.py in.png x0 y0 x1 y1 thresh minlen
For each column, the longest run of dark pixels (with gaps up to 2 px)
is reported if longer than minlen; neighbouring columns are merged.
"""
import sys
import numpy as np
from PIL import Image
g = np.asarray(Image.open(sys.argv[1]).convert('L'), dtype=float)
x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
th, ml = float(sys.argv[6]), int(sys.argv[7])
res = []
for x in range(x0, x1):
    col = g[y0:y1, x] < th
    best = (0, 0, 0); start = None; gap = 0
    for i, v in enumerate(col):
        if v:
            if start is None: start = i
            last = i; gap = 0
        elif start is not None:
            gap += 1
            if gap > 2:
                if last - start > best[0]: best = (last - start, start, last)
                start = None; gap = 0
    if start is not None and last - start > best[0]:
        best = (last - start, start, last)
    if best[0] >= ml:
        res.append((x, best[1] + y0, best[2] + y0, best[0]))
for r in res:
    print("x=%d top=%d bottom=%d len=%d" % r)
