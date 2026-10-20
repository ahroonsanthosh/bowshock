"""NACA TN 3819 fig. 35: dark runs (grey < 150, at most 6 px) in nine columns centred half-way between the
0.1 Mach grid lines (M = 1.75, 1.85, ..., 2.95), so vertical grid lines are avoided; horizontal grid-line rows
(within 2.5 px of a 0.02 line) excluded. Runs within 0.0015 in P_B are merged; each listed value is the mean
of the merged runs and the number of columns (of 9) in which the line was found (dashed lines have gaps).
Calibration love35_cal.py. Assignment to curves: see data/love_fig35_tn3819.csv."""
import sys
import os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import love35_cal as c
a = np.array(Image.open('img/love_fins/p66.png').convert('L')).astype(int)
for i in range(13):
    M = 1.75 + 0.1 * i
    vals = []
    for dx in range(-4, 5):
        y = c.y_of(-0.18, 1500)
        x = int(round(c.x_of(M, y))) + dx
        ylo, yhi = int(c.y_of(-0.31, x)), int(c.y_of(-0.085, x))
        col = a[ylo:yhi, x] < 150
        grid = [yy for _, yy in c.ylines(x)]
        yy = 0
        while yy < len(col):
            if col[yy]:
                z = yy
                while z + 1 < len(col) and col[z + 1]:
                    z += 1
                yc = ylo + 0.5 * (yy + z)
                if z - yy + 1 <= 6 and min(abs(yc - g) for g in grid) > 2.5:
                    vals.append(c.P_of(x, yc))
                yy = z + 1
            else:
                yy += 1
    vals.sort()
    cl = []
    for p in vals:
        if cl and p - cl[-1][-1] <= 0.0015:
            cl[-1].append(p)
        else:
            cl.append([p])
    print('M %.2f: %s' % (M, '  '.join('%.4f(%d)' % (np.mean(q), len(q)) for q in cl)))
