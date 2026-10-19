"""NACA RM A53D02 (James and Carros 1953; NTRS 19930087740) fig. 17, PDF p. 38 at 300 dpi: zero-lift total drag
coefficient (body base area) against Mach number for the basic fin leading edge (faired line), the symmetric 40 deg
bevel (squares) and the blunt leading edge (circles; elements of the surface of revolution of the fin planform
about the body axis, fig. 1(c)). FIRST READING (second pending). Calibration from row and column darkness profiles
(grey < 170): CD 0.6 to 0 every 0.1 at y 220.0, 423.5, 627.0, 829.0, 1033.5, 1234.5, 1435.0 (x 900) and 234.0,
443.5, 641.0, 844.0, 1049.0, 1250.5, 1453.5 (x 2200); M 0 to 10 every 1 at x 642.0 ... 2649.5 (y 1300) and 646.0,
842.0, 1045.5, 1245.5, 1449.5, 1648.5 ... 2654.0 (y 800). Mode 'ruler M0 M1 C0 C1 S OUT': zoom with lines every
0.01 in CD (red every 0.05) and 0.1 in M, to read symbol centres (bounding-box centre) and the line by eye.
Mode 'curve M...': dark runs (grey < 150, at most 8 px) in the column at each M, for the faired line."""
import sys
import numpy as np
from PIL import Image, ImageDraw
HY = {900: [220.0, 423.5, 627.0, 829.0, 1033.5, 1234.5, 1435.0], 2200: [234.0, 443.5, 641.0, 844.0, 1049.0, 1250.5, 1453.5]}
VX = {1300: [642.0, 837.0, 1041.0, 1240.5, 1444.0, 1643.0, 1844.0, 2044.0, 2243.0, 2444.0, 2649.5],
      800: [646.0, 842.0, 1045.5, 1245.5, 1449.5, 1648.5, 1850.0, 2048.0, 2249.5, 2448.0, 2654.0]}
CDS = [0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0]
def y_of(C, x):
    f = (x - 900) / 1300.0
    ys = [a + f * (b - a) for a, b in zip(HY[900], HY[2200])]
    return float(np.interp(-C, [-c for c in CDS], ys))
def x_of(M, y):
    f = (y - 1300) / -500.0
    xs = [a + f * (b - a) for a, b in zip(VX[1300], VX[800])]
    return float(np.interp(M, range(11), xs))
def C_of(x, y):
    f = (x - 900) / 1300.0
    ys = [a + f * (b - a) for a, b in zip(HY[900], HY[2200])]
    return float(np.interp(y, ys, CDS))
def M_of(x, y):
    f = (y - 1300) / -500.0
    xs = [a + f * (b - a) for a, b in zip(VX[1300], VX[800])]
    return float(np.interp(x, xs, range(11)))
im = Image.open('img/a53/p38.png')
if sys.argv[1] == 'ruler':
    M0, M1, C0, C1, S = map(float, sys.argv[2:7])
    X0, X1 = int(x_of(M0, 1000)), int(x_of(M1, 1000))
    Y0, Y1 = int(y_of(C1, X0)), int(y_of(C0, X0))
    z = im.convert('RGB').crop((X0, Y0, X1, Y1)).resize((int((X1 - X0) * S), int((Y1 - Y0) * S)), Image.LANCZOS)
    d = ImageDraw.Draw(z)
    k = 0
    while True:
        C = round(C0 + 0.01 * k, 3)
        if C > C1 + 1e-9:
            break
        ya, yb = (y_of(C, X0) - Y0) * S, (y_of(C, X1) - Y0) * S
        d.line([(0, ya), (z.size[0], yb)], fill=(255, 0, 0) if round(C * 100) % 5 == 0 else (255, 195, 195))
        if round(C * 100) % 5 == 0:
            d.text((2, ya - 11), '%.2f' % C, fill=(200, 0, 0))
        k += 1
    k = 0
    while True:
        M = round(M0 + 0.1 * k, 2)
        if M > M1 + 1e-9:
            break
        xa, xb = (x_of(M, Y0) - X0) * S, (x_of(M, Y1) - X0) * S
        d.line([(xa, 0), (xb, z.size[1])], fill=(0, 0, 255) if round(M * 10) % 5 == 0 else (195, 195, 255))
        if round(M * 10) % 5 == 0:
            d.text((xa + 2, 2), '%.1f' % M, fill=(0, 0, 255))
        k += 1
    z.save(sys.argv[7])
    print(z.size)
else:
    a = np.array(im).astype(int)
    for M in [float(s) for s in sys.argv[2:]]:
        x = int(round(x_of(M, 1000)))
        y0, y1 = int(y_of(0.58, x)), int(y_of(0.02, x))
        col = a[y0:y1, x] < 150
        grid = [y_of(c, x) for c in CDS]
        out = []
        y = 0
        while y < len(col):
            if col[y]:
                z = y
                while z + 1 < len(col) and col[z + 1]:
                    z += 1
                yc = y0 + 0.5 * (y + z)
                if z - y + 1 <= 8 and min(abs(yc - g) for g in grid) > 2.5:
                    out.append('%.4f[%d]' % (C_of(x, yc), z - y + 1))
                y = z + 1
            else:
                y += 1
        print('M %.2f (x %d): %s' % (M, x, '  '.join(out)))
