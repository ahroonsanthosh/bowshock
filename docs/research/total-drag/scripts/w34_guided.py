"""Guided column scan: for each (abscissa, guess) pair, scan the columns within
+-span of the abscissa, take the dark run nearest the guess (within tol, in
ordinate units) in each column, and report the median and the spread.
Usage: python3 -I guided.py <image> <cal.json> <span> <tol> a1:g1 a2:g2 ...
Runs longer than cal['maxrun'] px (default 30) and grid rows in cal['skip']
are ignored."""
import json
import sys
import numpy as np
from PIL import Image

im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
c = json.load(open(sys.argv[2]))
span, tol = float(sys.argv[3]), float(sys.argv[4])
thr = c.get('thr', 150)
maxrun = c.get('maxrun', 30)
skip = c.get('skip', [])
xpx = lambda a: c['x0'] + (a - c['xa']) * (c['x1'] - c['x0']) / (c['xb'] - c['xa'])
val = lambda y: c['v0'] + (y - c['y0']) * (c['v1'] - c['v0']) / (c['y1'] - c['y0'])
for item in sys.argv[5:]:
    a, g = map(float, item.split(':'))
    found = []
    for x in range(int(round(xpx(a - span))), int(round(xpx(a + span))) + 1):
        col = im[c['ylo']:c['yhi'], x] < thr
        best = None
        y = 0
        while y < len(col):
            if col[y]:
                s = y
                while y < len(col) and col[y]:
                    y += 1
                lo, hi = s + c['ylo'], y - 1 + c['ylo']
                mid = (lo + hi) / 2
                if hi - lo + 1 <= maxrun and not any(abs(mid - k) <= 3 for k in skip):
                    v = val(mid)
                    if abs(v - g) <= tol and (best is None or abs(v - g) < abs(best - g)):
                        best = v
            else:
                y += 1
        if best is not None:
            found.append(best)
    if found:
        f = np.array(found)
        print(f'{a:g}: {np.median(f):+.3f} (n {len(f)}, {f.min():+.3f} to {f.max():+.3f})')
    else:
        print(f'{a:g}: none near {g}')
