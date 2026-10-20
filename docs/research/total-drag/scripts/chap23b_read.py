"""Second reading of NACA TR 1051 fig. 23(b) (PDF p. 21, 300 dpi grey): turbulent base pressure vs
support diameter ratio d/h. Local grid: rows P = -0.32, -0.24, -0.16, -0.08, 0 measured at three x bands,
columns d/h = 0 to 1.0 at three y bands; linear interpolation in both (tilt and lean corrected).
Curves read by column scans (dark runs < 150, <= 6 px) near the expected curve, at given d/h."""
import sys
import numpy as np
from PIL import Image
a = np.array(Image.open(sys.argv[1]).convert('L')).astype(int)
rows = {  # P: [(x, y)]
    -0.32: [(400, 2152.0), (800, 2155.5), (1075, 2158.0)],
    -0.24: [(400, 2349.0), (800, 2352.5), (1075, 2355.0)],
    -0.16: [(400, 2543.5), (800, 2548.0), (1075, 2550.0)],
    -0.08: [(400, 2738.5), (1075, 2744.5)],
    0.00: [(400, 2933.0), (800, 2937.5), (1075, 2939.5)]}
cols = {  # d/h: [(y, x)]
    0.0: [(2225, 219.0), (2650, 214.0), (2850, 212.0)], 0.2: [(2225, 421.5), (2650, 417.0)],
    0.4: [(2225, 620.5), (2650, 615.5)], 0.6: [(2225, 820.0), (2650, 814.5)],
    0.8: [(2225, 1020.5), (2650, 1015.5), (2850, 1012.5)], 1.0: [(2225, 1219.5), (2650, 1214.0), (2850, 1210.0)]}
def fit(pts):
    u, v = np.array(pts).T
    return np.polyfit(u, v, 1)
rf = {P: fit(p) for P, p in rows.items()}
cf = {d: fit(p) for d, p in cols.items()}
def y_of(P, x):
    ks = sorted(rf)
    for lo, hi in zip(ks, ks[1:]):
        if lo <= P <= hi:
            ylo, yhi = np.polyval(rf[lo], x), np.polyval(rf[hi], x)
            return ylo + (P - lo) / (hi - lo) * (yhi - ylo)
def P_of(x, y):
    ks = sorted(rf)
    for lo, hi in zip(ks, ks[1:]):
        ylo, yhi = np.polyval(rf[lo], x), np.polyval(rf[hi], x)
        if ylo <= y <= yhi:
            return lo + (y - ylo) / (yhi - ylo) * (hi - lo)
def x_of(d, y):
    ks = sorted(cf)
    for lo, hi in zip(ks, ks[1:]):
        if lo <= d <= hi:
            xlo, xhi = np.polyval(cf[lo], y), np.polyval(cf[hi], y)
            return xlo + (d - lo) / (hi - lo) * (xhi - xlo)
def d_of(x, y):
    ks = sorted(cf)
    for lo, hi in zip(ks, ks[1:]):
        xlo, xhi = np.polyval(cf[lo], y), np.polyval(cf[hi], y)
        if xlo <= x <= xhi:
            return lo + (x - xlo) / (xhi - xlo) * (hi - lo)
def scan(d, Pexp, win=0.012):
    y0 = y_of(Pexp, 600)
    x = int(round(x_of(d, y0)))
    found = []
    for xx in (x - 3, x - 1, x + 1, x + 3):
        ylo, yhi = int(y_of(Pexp - win, xx)), int(y_of(Pexp + win, xx))
        col = a[:, xx] < 150
        y = ylo
        while y <= yhi:
            if col[y]:
                z = y
                while col[z + 1]: z += 1
                if z - y + 1 <= 6:
                    found.append(P_of(xx, 0.5 * (y + z)))
                y = z + 1
            else:
                y += 1
    return found
if __name__ == '__main__':
    print('check: row fit at x=600 for P=-0.16: y=%.1f; col fit d/h=0.4 at y=2500: x=%.1f' % (np.polyval(rf[-0.16], 600), np.polyval(cf[0.4], 2500)))
    for M, guesses in (('1.5', {0.35: -0.18, 0.40: -0.183, 0.85: -0.236}), ('2.0', {0.35: -0.147, 0.85: -0.188}), ('2.9', {0.35: -0.12, 0.85: -0.143})):
        for d, Pexp in guesses.items():
            v = scan(d, Pexp)
            print('M=%s d/h=%.2f: dark runs at P = %s' % (M, d, ', '.join('%.4f' % p for p in sorted(set(round(q, 4) for q in v)))))
