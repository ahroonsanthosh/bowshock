"""NACA TN 3819 fig. 35: track individual curves leftwards from a seed by continuity (linear prediction from
the last tracked points, tolerance 3 px, gaps of the dash patterns bridged by carrying the prediction),
using thin dark runs (grey < 150, at most 6 px, off the 0.02 grid lines). Calibration love35_cal.py.
Seeds from love35_cols.py (data/love_fig35_cols_output.txt), lines identified on img/love_fins/f35_hiM.png:
at M 2.85 the upper fin line (dash-dot pattern, the free-flight curve) -0.1338 and the lower long line -0.1243;
the short line ending near M 2.56, -0.1320 at M 2.55; the no-fin estimate -0.0980 at M 2.95. Output: P_B at round Mach numbers from a local linear fit of the
tracked points within +-0.04 in M (n = points used)."""
import sys
import os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import love35_cal as c
a = np.array(Image.open('img/love_fins/p66.png').convert('L')).astype(int)
# vertical grid-line columns (dark over more than 40% of the plot height) are skipped
gridcol = (a[350:1760, :] < 150).mean(axis=0) > 0.4
def runs(x, ylo, yhi):
    if gridcol[x] or gridcol[x - 1] or gridcol[x + 1]:
        return None
    col = a[ylo:yhi, x] < 150
    grid = [yy for _, yy in c.ylines(x)]
    out = []
    y = 0
    while y < len(col):
        if col[y]:
            z = y
            while z + 1 < len(col) and col[z + 1]:
                z += 1
            yc = ylo + 0.5 * (y + z)
            if z - y + 1 <= 6 and min(abs(yc - g) for g in grid) > 2.0:
                out.append(yc)
            y = z + 1
        else:
            y += 1
    return out
def track(M0, P0, Mend, tol=3.0):
    y = c.y_of(P0, 1500)
    x = int(round(c.x_of(M0, y)))
    y = c.y_of(P0, x)
    hist = [(x, y)]
    pts = []
    xend = int(round(c.x_of(Mend, y)))
    while x > xend:
        x -= 1
        if len(hist) >= 6:
            xs, ys = np.array(hist[-25:]).T
            yp = np.polyval(np.polyfit(xs, ys, 1), x)
        else:
            yp = hist[-1][1]
        rr = runs(x, int(yp - 10), int(yp + 10))
        cand = [] if rr is None else [r for r in rr if abs(r - yp) <= tol]
        if len(cand) == 1:
            hist.append((x, cand[0]))
            pts.append((c.M_of(x, cand[0]), c.P_of(x, cand[0])))
        else:
            hist.append((x, yp))
    return pts
def at(pts, M):
    sel = [(m, p) for m, p in pts if abs(m - M) <= 0.04]
    if len(sel) < 5:
        return None, len(sel)
    m, p = np.array(sel).T
    return float(np.polyval(np.polyfit(m - M, p, 1), 0.0)), len(sel)
curves = {'upper fin line (dash-dot, free flight)': (2.85, -0.1338, 1.75),
          'lower long fin line (estimate A)': (2.85, -0.1243, 1.75),
          'short fin line (estimate B)': (2.55, -0.1320, 1.75),
          'no-fin estimate': (2.95, -0.0980, 1.75)}
Ms = (1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9)
res = {}
for name, (m0, p0, mend) in curves.items():
    pts = track(m0, p0, mend)
    res[name] = pts
    print('%s: %d tracked columns, M %.3f to %.3f' % (name, len(pts), min(p[0] for p in pts), max(p[0] for p in pts)))
print('M     ' + '   '.join('%-22s' % k[:22] for k in curves))
for M in Ms:
    row = []
    for name in curves:
        v, n = at(res[name], M)
        row.append('%-22s' % ('n/a (n %d)' % n if v is None else '%.4f (n %d)' % (v, n)))
    print('%.1f   ' % M + '   '.join(row))
