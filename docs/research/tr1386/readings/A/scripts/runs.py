"""List dark runs in narrow column bands (for reading curves without symbols).

usage: runs.py scriptdir page.png y0 y1 halfwidth thr x1 x2 ...
For each x, prints runs (start-end, centre, width) where darkness > thr.
"""
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np
import digi

page = digi.load(sys.argv[2])
y0, y1, hw = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
thr = float(sys.argv[6])
for xs in sys.argv[7:]:
    x = int(round(float(xs)))
    prof = page[y0:y1, x - hw:x + hw + 1].mean(axis=1)
    runs = []
    i = 0
    while i < len(prof):
        if prof[i] > thr:
            j = i
            while j < len(prof) and prof[j] > thr:
                j += 1
            seg = prof[i:j]
            c = (seg * np.arange(i, j)).sum() / seg.sum()
            runs.append(f"{y0+i}-{y0+j-1}(c={y0+c:.1f},w={j-i})")
            i = j
        else:
            i += 1
    print(x, " ".join(runs))
