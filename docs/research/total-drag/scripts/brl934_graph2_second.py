"""BRL 934 Graph II (yaw drag coefficient vs Mach), second reading by script.
Input image g2r.png: DTIC_AD0068959.pdf page 25 rendered with `pdftoppm -r 400 -gray -f 25 -l 25`
and rotated upright with PIL `Image.rotate(-90, expand=True)` (4011 x 3371 px). The same render,
cropped and passed through brl934_degrid.py and brl934_ruler_crop.py, gave the first reading.
Calibration from the grid (brl934_grid_skew.py) and the axis labels:
  heavy vertical lines every 0.05 M; M = 1.40 at x = 1429.5 when y = 1450; 63.5 px per 0.05 M;
  vertical-line skew dx/dy = -0.0243.
  zero line y = 2528 + 0.031 (x - 700); 64.1 px per unit of CD' (per rad^2).
At each heavy vertical line, the curve's centre is taken from the columns 6 to 16 px either side
of the line: in each column, the dark runs (pixel < 128) of 7 to 30 px inside a +-45 px band
around a guide y (the first reading, linearly interpolated) are candidates; the run nearest the
guide is taken; the median over the columns is the reading.
usage: g2_second.py g2r.png"""
import sys
import numpy as np
from PIL import Image

im = np.asarray(Image.open(sys.argv[1]).convert("L")) < 128

# first reading (visual, pixel coordinates of the curve centre), used only as a guide band
guide = [(1275, 1405), (1300, 1420), (1350, 1462), (1400, 1505), (1450, 1550), (1500, 1583),
         (1550, 1615), (1650, 1677), (1700, 1702), (1750, 1722), (1800, 1745), (1850, 1770),
         (1900, 1790), (1950, 1805), (2000, 1825), (2050, 1840), (2160, 1878), (2200, 1897),
         (2250, 1912), (2300, 1922), (2350, 1940), (2420, 1955), (2495, 1967), (2590, 1985),
         (2700, 1997), (2835, 2006)]
gx = np.array([g[0] for g in guide], float)
gy = np.array([g[1] for g in guide], float)


def x_line(m, y):
    return 1429.5 + (m - 1.40) / 0.05 * 63.5 - 0.0243 * (y - 1450)


def value(x, y):
    return (2528 + 0.031 * (x - 700) - y) / 64.1


def mach(x, y):
    return 1.40 + (x + 0.0243 * (y - 1450) - 1429.5) / 63.5 * 0.05


print("M_line  x      y_curve  n_cols  spread  CD'_per_rad2")
for k in range(0, 25):
    m = 1.30 + 0.05 * k
    y_guess = np.interp(x_line(m, 1800), gx, gy)
    xl = x_line(m, y_guess)
    if xl < gx[0] - 5 or xl > gx[-1] + 5:
        continue
    ys = []
    for off in list(range(-16, -5)) + list(range(6, 17)):
        x = int(round(xl + off))
        yg = np.interp(x, gx, gy)
        lo, hi = int(yg - 45), int(yg + 45)
        col = im[lo:hi, x]
        best = None
        j = 0
        while j < len(col):
            if col[j]:
                e = j
                while e + 1 < len(col) and col[e + 1]:
                    e += 1
                ln = e - j + 1
                c = lo + (j + e) / 2
                if 7 <= ln <= 30:
                    d = abs(c - yg)
                    if best is None or d < best[0]:
                        best = (d, c)
                j = e + 1
            else:
                j += 1
        if best is not None:
            ys.append(best[1])
    if len(ys) < 4:
        print("%.2f   %.0f   (curve not found: %d columns)" % (m, xl, len(ys)))
        continue
    yc = float(np.median(ys))
    print("%.2f   %.0f   %.1f   %d   %.1f   %.2f" % (m, xl, yc, len(ys), float(np.percentile(ys, 75) - np.percentile(ys, 25)), value(xl, yc)))

print()
print("first reading converted with this calibration (skew included):")
for (x, y) in guide:
    print("x %d y %d  M %.3f  CD' %.2f" % (x, y, mach(x, y), value(x, y)))
