"""NACA TN 3819 fig. 35 (PDF p. 66): fin effects on base pressure against Mach number, t/c 0.10, x/c 0, no sweep.
First reading (second pending). At each Mach number the dark runs (grey < 150, at most 7 px tall) in the
columns x(M) - 2 .. x(M) + 2 are listed as P_B with the calibration of love35_cal.py, grid-line rows excluded
(within 2.5 px of a 0.02 line); the runs are then assigned to the curves on the zoom views
img/love_fins/f35_M*.png (ruler every 0.01 in P_B and 0.05 in M)."""
import sys
import os
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import love35_cal as c
a = np.array(Image.open('img/love_fins/p66.png').convert('L')).astype(int)
def runs_at(M, Plo=-0.36, Phi=-0.04):
    y0 = c.y_of(-0.2, 1500)
    x = c.x_of(M, y0)
    res = []
    for dx in (-2, -1, 0, 1, 2):
        xi = int(round(x + dx))
        ylo, yhi = int(c.y_of(Plo, xi)), int(c.y_of(Phi, xi))
        col = a[ylo:yhi, xi] < 150
        grid = [yy for _, yy in c.ylines(xi)]
        y = 0
        while y < len(col):
            if col[y]:
                z = y
                while z + 1 < len(col) and col[z + 1]:
                    z += 1
                yc = ylo + 0.5 * (y + z)
                if z - y + 1 <= 7 and min(abs(yc - g) for g in grid) > 2.5:
                    res.append(round(c.P_of(xi, yc), 4))
                y = z + 1
            else:
                y += 1
    return sorted(set(res))
for M in (1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0):
    r = runs_at(M)
    # cluster runs within 0.002
    cl = []
    for p in r:
        if cl and p - cl[-1][-1] <= 0.002:
            cl[-1].append(p)
        else:
            cl.append([p])
    print('M %.2f: %s' % (M, '  '.join('%.4f' % np.mean(q) for q in cl)))
    # zoom for assignment
    yc = c.y_of(-0.17, 1500)
    xm = c.x_of(M, yc)
    X0, X1 = int(xm - 60), int(xm + 60)
    Y0, Y1 = int(c.y_of(-0.30, xm)), int(c.y_of(-0.08, xm))
    im = Image.open('img/love_fins/p66.png').convert('RGB').crop((X0, Y0, X1, Y1))
    S = 2.5
    im = im.resize((int((X1 - X0) * S), int((Y1 - Y0) * S)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    for i in range(8, 31):
        P = -0.01 * i
        ya = c.y_of(P, X0); yb = c.y_of(P, X1)
        d.line([(0, (ya - Y0) * S), ((X1 - X0) * S, (yb - Y0) * S)], fill=(255, 0, 0) if i % 2 == 0 else (255, 170, 170))
        d.text((2, (ya - Y0) * S - 11), '%.2f' % P, fill=(200, 0, 0))
    xa, xb = c.x_of(M, Y0), c.x_of(M, Y1)
    d.line([((xa - X0) * S, 0), ((xb - X0) * S, (Y1 - Y0) * S)], fill=(0, 0, 255))
    im.save('img/love_fins/f35_M%.1f.png' % M)
