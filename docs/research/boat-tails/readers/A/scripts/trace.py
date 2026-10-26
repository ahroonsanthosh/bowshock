"""Trace a drawn (solid or dashed) curve near a hand-placed guide polyline.

usage: python3 -I trace.py LIB IMG ROT DXEMIT DYEMIT OUTJSON x1,y1 x2,y2 ...
Walks the guide in 1 px steps; at each step samples the line-removed image
along the guide's normal (+-7 px) and records the darkness-weighted centre of
the dark run nearest the guide (none in dash gaps). Emits traced points (actual
ink positions, never interpolated): the first and the last found, every local
extreme of y, and otherwise the next found point once it is at least DXEMIT px
in x or DYEMIT px in y from the last emitted one.
"""
import sys, json
ns = {}
exec(open(sys.argv[1]).read(), ns)
import numpy as np
from scipy.ndimage import map_coordinates
g0 = ns['load_gray'](sys.argv[2], int(sys.argv[3]))
g, _ = ns['remove_lines'](g0)
dxe, dye = float(sys.argv[4]), float(sys.argv[5])
out = sys.argv[6]
wp = [tuple(map(float, a.split(','))) for a in sys.argv[7:]]
HW = 7
pts = []
for (xa, ya), (xb, yb) in zip(wp[:-1], wp[1:]):
    L = np.hypot(xb - xa, yb - ya)
    n = max(int(L), 1)
    tx, ty = (xb - xa) / L, (yb - ya) / L
    nx, ny = -ty, tx
    for k in range(n):
        cx, cy = xa + tx * k, ya + ty * k
        s = np.arange(-HW, HW + 0.01, 0.5)
        xs, ys = cx + nx * s, cy + ny * s
        prof = map_coordinates(g, [ys, xs], order=1)
        dark = 230.0 - prof
        dark[dark < 0] = 0
        if dark.max() < 70:
            continue
        thr = 0.4 * dark.max()
        # runs above threshold
        runs = []
        i = 0
        while i < len(s):
            if dark[i] > thr:
                j = i
                while j < len(s) and dark[j] > thr:
                    j += 1
                w = dark[i:j]
                runs.append(((s[i:j] * w).sum() / w.sum(), j - i))
                i = j
            else:
                i += 1
        runs.sort(key=lambda r: abs(r[0]))
        off, width = runs[0]
        if width > 16:  # wider than 8 px: a crossing, not the stroke
            continue
        pts.append((cx + nx * off, cy + ny * off, k, len(pts)))
pts = [(p[0], p[1]) for p in pts]
# emit
em = [pts[0]]
for i in range(1, len(pts) - 1):
    y_prev, y, y_next = pts[i - 1][1], pts[i][1], pts[i + 1][1]
    ext = (y > y_prev and y >= y_next) or (y < y_prev and y <= y_next)
    lx, ly = em[-1]
    if (ext and abs(y - ly) > 3) or abs(pts[i][0] - lx) >= dxe or abs(y - ly) >= dye:
        em.append(pts[i])
if np.hypot(pts[-1][0] - em[-1][0], pts[-1][1] - em[-1][1]) > 3:
    em.append(pts[-1])
json.dump({'traced': pts, 'emitted': em}, open(out, 'w'))
print('traced %d, emitted %d' % (len(pts), len(em)))
for p in em:
    print('%.1f %.1f' % p)
