# Integrated ink of the CD = 1.25 grid line (or any horizontal line) per column window: inside a symbol vs outside,
# to tell whether a cross stroke lies on top of it. usage: gridload.py scriptsdir page y_near half "a0-a1" ...
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2]); yn = float(sys.argv[3]); h = int(sys.argv[4])
for r in sys.argv[5:]:
    a0, a1 = map(int, r.split('-')); s = []; c = []
    for x in range(a0, a1 + 1):
        lo = int(round(yn)) - h; p = ink[lo:lo + 2 * h + 1, x].copy(); p[p < 0.08] = 0
        s.append(p.sum()); c.append((p * np.arange(lo, lo + 2 * h + 1)).sum() / max(p.sum(), 1e-9))
    print('cols %s: ink per column %.2f (sd %.2f), centroid y %.2f' % (r, np.mean(s), np.std(s), np.mean(c)))
