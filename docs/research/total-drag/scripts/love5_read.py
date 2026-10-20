"""NACA TN 3819 fig. 5 (two-dimensional base pressures): dark runs (grey < 150, at most 7 px) in five columns
8 to 12 px right of each Mach number (clear of the 0.2-M grid lines), grid rows (every 0.04) excluded within
2.5 px; runs within 0.004 merged. FIRST READING (second pending). Calibration love5_cal.py. Assignment on the
zooms img/love2d/f5_lo.png, f5_hi.png: from the more negative side, the vacuum and limiting-nonviscous curves
(far above the data), then the hatched line of ref. 25's compilation with Chapman's dash-dot curve on or near it,
then Love's estimate from P_r (solid, least negative)."""
import os
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import love5_cal as c
a = np.array(Image.open('img/love2d/p36.png').convert('L')).astype(int)
for M in (1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.2, 2.4, 2.5, 2.6, 2.8, 3.0, 3.1):
    vals = []
    for dx in (8, 9, 10, 11, 12):
        x = int(round(c.x_of(M, 1500))) + dx
        ylo, yhi = int(c.y_of(-0.62, x)), int(c.y_of(-0.06, x))
        col = a[ylo:yhi, x] < 150
        grid = [c.y_of(-0.04 * k, x) for k in range(0, 21)]
        y = 0
        while y < len(col):
            if col[y]:
                z = y
                while z + 1 < len(col) and col[z + 1]:
                    z += 1
                yc = ylo + 0.5 * (y + z)
                if z - y + 1 <= 7 and min(abs(yc - g) for g in grid) > 2.5:
                    vals.append(c.P_of(x, yc))
                y = z + 1
            else:
                y += 1
    vals.sort()
    cl = []
    for p in vals:
        if cl and p - cl[-1][-1] <= 0.004:
            cl[-1].append(p)
        else:
            cl.append([p])
    print('M %.2f: %s' % (M + 10.0 / 520, '  '.join('%.3f(%d)' % (np.mean(q), len(q)) for q in cl)))
