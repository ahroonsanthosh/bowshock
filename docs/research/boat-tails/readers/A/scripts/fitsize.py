"""Find the template size that best matches a clean symbol.

usage: python3 -I fitsize.py LIB IMG ROT X Y KIND HMIN HMAX [T ...]
"""
import sys
ns = {}
exec(open(sys.argv[1]).read(), ns)
import numpy as np

img, rot = sys.argv[2], int(sys.argv[3])
x, y = float(sys.argv[4]), float(sys.argv[5])
kind = sys.argv[6]
hmin, hmax = float(sys.argv[7]), float(sys.argv[8])
ts = [float(t) for t in sys.argv[9:]] or [2.0, 2.5, 3.0]
g = ns['load_gray'](img, rot)
best = []
for t in ts:
    for h in np.arange(hmin, hmax + 0.01, 0.5):
        tpl = ns['template'](kind, h, t)
        xc, yc, s, e = ns['match_near'](g, tpl, x, y, 6)
        best.append((s, h, t, xc, yc))
best.sort(reverse=True)
for b in best[:6]:
    print('score %.3f h %.1f t %.1f at (%.2f, %.2f)' % b)
