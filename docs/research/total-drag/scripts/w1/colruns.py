"""Dark runs along a vertical column band (first readings, W1): at a data abscissa u, the pixel columns within
+-W px of the calibrated u, each column's dark runs (grey < T, at most L px tall, grid rows excluded) as data
ordinates, merged over the band: prints each run's ordinate range and centre, so dashed curves are caught in any
column of the band. Used as a module: runs_at(cal, a, u, v_lo, v_hi, W, T, L, gridrows)."""
import numpy as np


def runs_at(cal, a, u, v_lo, v_hi, W=4, T=150, L=8, gridrows=()):
    x, y1 = cal.pix(u, v_lo)
    _, y2 = cal.pix(u, v_hi)
    ya, yb = int(min(y1, y2)), int(max(y1, y2))
    hits = []
    for xi in range(int(round(x)) - W, int(round(x)) + W + 1):
        col = a[ya:yb, xi] < T
        for g in gridrows:
            gy = int(round(g(xi))) - ya
            col[max(gy - 2, 0):gy + 3] = False
        i = 0
        while i < len(col):
            if col[i]:
                j = i
                while j + 1 < len(col) and col[j + 1]:
                    j += 1
                if j - i + 1 <= L:
                    hits.append((ya + 0.5 * (i + j), xi))
                i = j + 1
            else:
                i += 1
    hits.sort()
    groups = []
    for y, xi in hits:
        if groups and y - groups[-1][-1][0] <= 3:
            groups[-1].append((y, xi))
        else:
            groups.append([(y, xi)])
    out = []
    for g in groups:
        ys = [p[0] for p in g]
        vs = [cal.local(xi, y)[1] for y, xi in g]
        out.append((float(np.median(vs)), min(vs), max(vs), len(g)))
    return out
