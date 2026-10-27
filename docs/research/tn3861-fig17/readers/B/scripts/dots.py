# dots.py scriptsdir page.png x y [r] ... : darkness-weighted centroid of a small isolated dot (window radius r, default 3), with peak darkness
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np
import measure_lib as M
ink = M.load(sys.argv[2])
args = sys.argv[3:]
for i in range(0, len(args), 3):
    x, y, r = float(args[i]), float(args[i + 1]), int(args[i + 2])
    xi, yi = int(round(x)), int(round(y))
    w = ink[yi - r:yi + r + 1, xi - r:xi + r + 1].copy()
    w[w < 0.15] = 0
    yy, xx = np.mgrid[yi - r:yi + r + 1, xi - r:xi + r + 1]
    print('dot near (%g,%g): centroid (%.2f, %.2f) peak %.2f sum %.2f' % (x, y, (w * xx).sum() / w.sum(), (w * yy).sum() / w.sum(), w.max(), w.sum()))
    print(np.array2string((ink[yi - r - 2:yi + r + 3, xi - r - 2:xi + r + 3] * 9).astype(int), max_line_width=200))
