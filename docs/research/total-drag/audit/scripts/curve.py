"""Find dark runs crossing a column (vertical scan) of a rendered page,
to locate a faired curve at given x.  Reports runs of at least minrun dark
pixels between y0 and y1 averaged over columns x-1..x+1.
usage: curve.py in.png y0 y1 minrun thresh x [x ...]
"""
import sys
import numpy as np
from PIL import Image
src = sys.argv[1]; y0, y1, minrun = map(int, sys.argv[2:5]); thr = float(sys.argv[5])
a = np.asarray(Image.open(src).convert("L"), dtype=float)
for xs in sys.argv[6:]:
    x = int(round(float(xs)))
    col = a[y0:y1, x - 1:x + 2].mean(axis=1)
    d = col < thr
    runs = []; i = 0
    while i < len(d):
        if d[i]:
            j = i
            while j < len(d) and d[j]: j += 1
            if j - i >= minrun:
                w = 255 - col[i:j]
                runs.append(((np.arange(i, j) * w).sum() / w.sum() + y0, j - i))
            i = j
        else:
            i += 1
    print(xs, " ".join(f"{c:.1f}(w{n})" for c, n in runs))
