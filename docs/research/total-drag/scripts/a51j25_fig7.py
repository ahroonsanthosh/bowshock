"""NACA RM A51J25 (Chapman 1951, "Base pressure on wings and bodies with turbulent boundary layers"; NTRS
20030067332) fig. 7, PDF p. 14 (report p. 26) at 300 dpi: airfoils, p_b/p' against M' (p', M' the inviscid static
pressure and Mach number just ahead of the base), turbulent boundary layers thin relative to the base. FIRST READING
(second pending). Calibration from tick profiles: left axis at x 671, ticks p_b/p' 1.0, 0.8, 0.6, 0.4, 0.2, 0 at
y 599.0, 732.0, 862.5, 994.5, 1126.5, 1256.5 (right-hand ticks); M' 2, 3, 4 at x 947.5, 1220.0, 1492.5 (lower ticks).
Mode 'curve': dark runs (grey < 140, at most 14 px) in single columns at the listed M'. Mode 'ruler OUT': ruler zoom
(lines every 0.02 in p_b/p', red every 0.1; every 0.1 in M') of the data region for reading the symbols by eye."""
import sys
import numpy as np
from PIL import Image, ImageDraw
im = Image.open('img/n2003/p14.png').convert('L')
a = np.array(im).astype(int)
YT = {1.0: 599.0, 0.8: 732.0, 0.6: 862.5, 0.4: 994.5, 0.2: 1126.5, 0.0: 1256.5}
fy = np.polyfit(list(YT.values()), list(YT.keys()), 1)
gy = np.polyfit(list(YT.keys()), list(YT.values()), 1)
def p_of(y):
    return float(np.polyval(fy, y))
def y_of(p):
    return float(np.polyval(gy, p))
def M_of(x):
    return 2.0 + (x - 947.5) / 272.5
def x_of(M):
    return 947.5 + (M - 2.0) * 272.5
print('fit residuals (px):', ' '.join('%.1f' % (y_of(p) - y) for p, y in YT.items()))
if sys.argv[1] == 'curve':
    for M in [float(s) for s in sys.argv[2:]]:
        x = int(round(x_of(M)))
        col = a[600:1250, x] < 140
        out = []
        y = 0
        while y < len(col):
            if col[y]:
                z = y
                while z + 1 < len(col) and col[z + 1]:
                    z += 1
                if z - y + 1 <= 14:
                    out.append('%.3f[%d]' % (p_of(600 + 0.5 * (y + z)), z - y + 1))
                y = z + 1
            else:
                y += 1
        print("M' %.2f (x %d): %s" % (M, x, '  '.join(out)))
else:
    out = sys.argv[2]
    M0, M1, P0, P1, S = 1.1, 4.1, 0.10, 0.65, 3.0
    X0, X1, Y0, Y1 = int(x_of(M0)), int(x_of(M1)), int(y_of(P1)), int(y_of(P0))
    z = im.convert('RGB').crop((X0, Y0, X1, Y1)).resize((int((X1 - X0) * S), int((Y1 - Y0) * S)), Image.LANCZOS)
    d = ImageDraw.Draw(z)
    for k in range(0, 28):
        p = round(P0 + 0.02 * k, 2)
        if p > P1 + 1e-9:
            break
        y = (y_of(p) - Y0) * S
        d.line([(0, y), (z.size[0], y)], fill=(255, 0, 0) if round(p * 100) % 10 == 0 else (255, 190, 190))
        d.text((2, y - 11), '%.2f' % p, fill=(200, 0, 0))
    for k in range(0, 31):
        M = round(M0 + 0.1 * k, 2)
        x = (x_of(M) - X0) * S
        d.line([(x, 0), (x, z.size[1])], fill=(0, 0, 255) if round(M * 10) % 5 == 0 else (190, 190, 255))
        if round(M * 10) % 5 == 0:
            d.text((x + 2, 2), '%.1f' % M, fill=(0, 0, 255))
    z.save(out)
    print(z.size)
