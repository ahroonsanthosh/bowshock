"""NACA TN 3819 fig. 5: dark runs (grey < 150) in single columns at a list of Mach numbers, with run length in px
and minimum grey, for linking the curves by continuity across neighbouring columns. Grid rows (every 0.04 in P_B)
flagged 'g' when within 2.5 px. Usage: python3 -I love5_cols.py M0 M1 STEP PLO PHI. Calibration love5_cal.py."""
import os
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import love5_cal as c
a = np.array(Image.open('img/love2d/p36.png').convert('L')).astype(int)
M0, M1, ST, PLO, PHI = map(float, sys.argv[1:6])
M = M0
while M <= M1 + 1e-9:
    x = int(round(c.x_of(M, 1500)))
    ylo, yhi = int(c.y_of(PLO, x)), int(c.y_of(PHI, x))
    col = a[ylo:yhi, x] < 150
    grid = [c.y_of(-0.04 * k, x) for k in range(0, 21)]
    out = []
    y = 0
    while y < len(col):
        if col[y]:
            z = y
            while z + 1 < len(col) and col[z + 1]:
                z += 1
            yc = ylo + 0.5 * (y + z)
            g = 'g' if min(abs(yc - q) for q in grid) <= 2.5 else ''
            out.append('%.4f[%d,%d%s]' % (c.P_of(x, yc), z - y + 1, a[ylo + y:ylo + z + 1, x].min(), g))
            y = z + 1
        else:
            y += 1
    print('M %.3f (x %d): %s' % (c.M_of(x, 1500), x, '  '.join(out)))
    M += ST
