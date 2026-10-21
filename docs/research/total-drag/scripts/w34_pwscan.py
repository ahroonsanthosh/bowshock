"""Guided column scan with a piecewise-linear calibration (w34_pwruler.py's
cal.json): for each abscissa:guess pair, scan the columns within +-span
(abscissa units) of the abscissa, take in each column the centre of the
dark run nearest the guess (within tol, ordinate units), ignoring runs
longer than maxrun px and rows within 3 px of a horizontal grid line, and
print the median and the spread over the columns.
Usage: python3 -I w34_pwscan.py <image> <cal.json> <span> <tol> a1:g1 a2:g2 ...
Environment: THR (dark threshold, default 150), MAXRUN (default 30)."""
import json
import os
import sys

import numpy as np
from PIL import Image


def interp(grid, v, key_from, key_to):
    a = np.array([g[key_from] for g in grid], float)
    b = np.array([g[key_to] for g in grid], float)
    o = np.argsort(a)
    a, b = a[o], b[o]
    if v <= a[0]:
        i = 0
    elif v >= a[-1]:
        i = len(a) - 2
    else:
        i = int(np.searchsorted(a, v)) - 1
    return b[i] + (v - a[i]) * (b[i + 1] - b[i]) / (a[i + 1] - a[i])


def main():
    im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
    c = json.load(open(sys.argv[2]))
    span, tol = float(sys.argv[3]), float(sys.argv[4])
    thr = float(os.environ.get('THR', '150'))
    maxrun = int(os.environ.get('MAXRUN', '30'))
    xg, yg = c['xgrid'], c['ygrid']
    grid_rows = [g[0] for g in yg]
    for item in sys.argv[5:]:
        a, g = map(float, item.split(':'))
        xa = int(round(interp(xg, a - span, 1, 0)))
        xb = int(round(interp(xg, a + span, 1, 0)))
        found = []
        for x in range(min(xa, xb), max(xa, xb) + 1):
            col = im[:, x] < thr
            y = 0
            best = None
            while y < len(col):
                if col[y]:
                    y0 = y
                    while y < len(col) and col[y]:
                        y += 1
                    y1 = y - 1
                    if y1 - y0 + 1 <= maxrun:
                        ym = 0.5 * (y0 + y1)
                        if all(abs(ym - r) > 3 for r in grid_rows):
                            v = interp(yg, ym, 0, 1)
                            if abs(v - g) <= tol and (best is None or abs(v - g) < abs(best - g)):
                                best = v
                else:
                    y += 1
            if best is not None:
                found.append(best)
        if found:
            f = np.array(found)
            print(f'{a:7.2f} guess {g:+.3f}  median {np.median(f):+.4f}  '
                  f'spread {f.min():+.4f}..{f.max():+.4f}  n {len(f)}')
        else:
            print(f'{a:7.2f} guess {g:+.3f}  nothing within tol')


if __name__ == '__main__':
    main()
