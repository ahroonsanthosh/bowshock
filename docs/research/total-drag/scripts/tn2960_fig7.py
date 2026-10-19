"""NACA TN 2960 (Gowen and Perkins 1953; NTRS 19930084018) fig. 7, PDF p. 24 at 300 dpi (rotated to landscape):
circular-cylinder drag coefficient (pressure drag from measured distributions, two-dimensional flow) against Mach
number. FIRST READING (second pending): the supersonic symbols near M 1.49, 1.98 and 2.9 (1 in diameter, Ames 1 by
3 ft supersonic tunnel, diamonds; ref. 15, triangle). Calibration from row and column darkness profiles
(grey < 170): CD 2.4 at y 315.0 (x 900), 319.0 (x 1700), 322.0 (x 2500); CD 0 at 1851.0, 1856.0, 1859.0
(128.0 px per 0.2); M 0 at x 661.0 and M 3.2 at 2713.0 (y 400), 2710.0 (y 1000), 2709.0 (y 1700).
Symbols: connected dark components (grey < 150, 8-neighbour) in windows about each cluster, grid rows and
columns (dark over more than 40% of the plot) removed; bounding-box centres (centroid rule for diamonds).
Overlapping symbols merge into one component, whose box is reported with its pixel count."""
import numpy as np
from PIL import Image
a = np.array(Image.open('img/tn2960/p24.png').convert('L')).astype(int)
dark = a < 150
gr = dark[:, 700:2700].mean(axis=1) > 0.4
gc = dark[330:1840, :].mean(axis=0) > 0.4
def CD(x, y):
    y24 = 315.0 + (x - 900) * (7.0 / 1600)
    y0 = 1851.0 + (x - 900) * (8.0 / 1600)
    return 2.4 * (y0 - y) / (y0 - y24)
def M(x, y):
    x0 = 661.0
    x32 = 2713.0 + (y - 400) * (-4.0 / 1300)
    return 3.2 * (x - x0) / (x32 - x0)
for name, (X0, X1, Y0, Y1) in (('M 1.5 cluster', (1570, 1660, 860, 960)), ('M 2.0 cluster', (1880, 1970, 870, 1000)),
                               ('M 2.9 symbol', (2460, 2560, 940, 1010))):
    w = dark[Y0:Y1, X0:X1].copy()
    w[gr[Y0:Y1], :] = False
    w[:, gc[X0:X1]] = False
    lab = np.zeros(w.shape, int); n = 0
    for i in range(w.shape[0]):
        for j in range(w.shape[1]):
            if w[i, j] and not lab[i, j]:
                n += 1; st = [(i, j)]; lab[i, j] = n
                while st:
                    p, q = st.pop()
                    for di in (-1, 0, 1):
                        for dj in (-1, 0, 1):
                            u, v = p + di, q + dj
                            if 0 <= u < w.shape[0] and 0 <= v < w.shape[1] and w[u, v] and not lab[u, v]:
                                lab[u, v] = n; st.append((u, v))
    print(name)
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(ys) < 30:
            continue
        xc, yc = X0 + 0.5 * (xs.min() + xs.max()), Y0 + 0.5 * (ys.min() + ys.max())
        print('   box x %d-%d y %d-%d (%d px): M %.3f  CD %.3f' % (X0 + xs.min(), X0 + xs.max(), Y0 + ys.min(), Y0 + ys.max(), len(ys), M(xc, yc), CD(xc, yc)))
