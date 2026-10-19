"""NACA TN 3819 figs. 33 and 35: centres of the tunnel symbols (first reading; second pending). For each symbol
a window of +-26 px about a visual guess is cut; pixels darker than 150 that are not on a grid line (rows or
columns dark over more than 40% of the plot) are labelled into connected components (8-neighbour); the component
nearest the guess with at least 25 pixels is the symbol; its bounding box gives the centre (centroid rule for
circles, squares, diamonds; flags are excluded by taking the box of the main body: rows and columns where the
component is at least 3 px thick). Fig. 35 calibration: love35_cal.py."""
import sys
import os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import love35_cal as c
a = np.array(Image.open('img/love_fins/p66.png').convert('L')).astype(int)
dark = a < 150
gridr = dark[:, 560:2440].mean(axis=1) > 0.4
gridc = dark[350:1760, :].mean(axis=0) > 0.4
def component(x0, y0, h=26):
    win = dark[y0 - h:y0 + h, x0 - h:x0 + h].copy()
    win[gridr[y0 - h:y0 + h], :] = False
    win[:, gridc[x0 - h:x0 + h]] = False
    lab = np.zeros(win.shape, int); n = 0
    for i in range(win.shape[0]):
        for j in range(win.shape[1]):
            if win[i, j] and not lab[i, j]:
                n += 1; st = [(i, j)]; lab[i, j] = n
                while st:
                    p, q = st.pop()
                    for di in (-1, 0, 1):
                        for dj in (-1, 0, 1):
                            u, v = p + di, q + dj
                            if 0 <= u < win.shape[0] and 0 <= v < win.shape[1] and win[u, v] and not lab[u, v]:
                                lab[u, v] = n; st.append((u, v))
    best = None
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(ys) < 25:
            continue
        d = np.hypot(ys.mean() - h, xs.mean() - h)
        if best is None or d < best[0]:
            best = (d, ys, xs)
    if best is None:
        return None
    _, ys, xs = best
    return (x0 - h + xs.min(), x0 - h + xs.max(), y0 - h + ys.min(), y0 - h + ys.max(), len(ys))
sym = [('ref. 26, with fins, circle', 1.50, -0.325), ('ref. 26, no fins, flagged circle', 1.50, -0.193),
       ('ref. 26, with fins, square', 2.00, -0.209), ('ref. 26, no fins, flagged square', 2.00, -0.148),
       ('Langley 9 in, with fins, diamond', 2.41, -0.163), ('Langley 9 in, no fins, flagged diamond', 2.41, -0.119)]
for name, M, P in sym:
    y = c.y_of(P, 1500); x = int(round(c.x_of(M, y))); y = int(round(c.y_of(P, x)))
    r = component(x, y)
    if r is None:
        print(name, 'not found'); continue
    x0, x1, y0, y1, npx = r
    xc, yc = 0.5 * (x0 + x1), 0.5 * (y0 + y1)
    print('%-40s box x %d-%d y %d-%d (%d px): M %.3f  P_B %.4f' % (name, x0, x1, y0, y1, npx, c.M_of(xc, yc), c.P_of(xc, yc)))
