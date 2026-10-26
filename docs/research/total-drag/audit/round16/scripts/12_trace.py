# Trace the faired curve through the Mach 2.41 measurements.
# Part A (steep, near x/c 1.0): scan rows, x centroid in a window around the predicted x.
# Part B (flat, x/c 0.8 to 0): scan columns, y centroid in a window around anchor-interpolated y.
# The prediction is the running extrapolation of the last good points. Rows/columns within
# 3 px of a gridline, inside a symbol box, or on the dashed line are marked 'skip' and not
# used. Output: CSV of (x, y, kind) for every good scan line.
import sys, json
import numpy as np
from PIL import Image
src, gf, out = sys.argv[1], sys.argv[2], sys.argv[3]
D = 255 - np.asarray(Image.open(src).convert('L')).astype(float)
G = json.load(open(gf))
def vx(l, y): return l['a'] + l['b'] * (y - 1500)
def hy(l, x): return l['a'] + l['b'] * (x - 1200)
def near_v(x, y, d=3.5): return any(abs(x - vx(l, y)) < d for l in G['vertical'])
def near_h(x, y, d=3.5): return any(abs(y - hy(l, x)) < d for l in G['horizontal'])
# symbol boxes (x0, y0, x1, y1): the triangles at each station, legend not needed here
BOX = [(398, 1762, 422, 1786), (398, 1803, 421, 1831), (527, 1494, 549, 1524), (654, 1488, 676, 1528),
       (782, 1455, 805, 1489), (910, 1468, 933, 1502), (1038, 1476, 1060, 1505)]
def in_box(x, y, pad=1):
    return any(a - pad <= x <= c + pad and b - pad <= y <= d + pad for a, b, c, d in BOX)
FLOOR = 40
def centroid(prof, lo):
    w = np.clip(prof - FLOOR, 0, None)
    if w.sum() < 30: return None, 0
    return lo + (np.arange(len(prof)) * w).sum() / w.sum(), w.max()
pts = []
# Part A: rows from 1786 (just below the upper 1.0 triangle) up to 1530, x predicted
# seed: two points read by eye on the raw dump: (413.3, 1786), (418.3, 1758)
hist = [(1800, 409.8), (1786, 413.3)]
for y in range(1786, 1528, -1):
    (y1, x1), (y2, x2) = hist[-2], hist[-1]
    pred = x2 + (x2 - x1) / (y2 - y1) * (y - y2)
    if near_h(pred, y) or in_box(pred, y) or (1558 <= y <= 1567):
        pts.append((pred, y, 'skipA')); continue
    lo = int(np.floor(pred - 4)); hi = int(np.ceil(pred + 4))
    c, pk = centroid(D[y, lo:hi + 1], lo)
    if c is None or near_v(c, y):
        pts.append((pred, y, 'skipA')); continue
    pts.append((c, y, 'A'))
    hist.append((y, c))
    if len(hist) > 6: hist = hist[-6:]
    # refit prediction from last few points
    if len(hist) >= 4:
        ys = np.array([h[0] for h in hist[-4:]]); xs = np.array([h[1] for h in hist[-4:]])
        b, a = np.polyfit(ys, xs, 1)
        hist = hist[:-2] + [(ys[-2], a + b * ys[-2]), (ys[-1], a + b * ys[-1])]
# Part B: columns, in segments between the symbol boxes. Each segment has rough anchor
# points read by eye from zoomed crops; they only place the search window (+-3.5 px), the
# value is the ink centroid. A centroid more than 2 px from the window centre is marked
# 'checkB' and not used.
SEG = [
  [(500, 1528.0), (512, 1523.7), (527, 1515.0)],
  [(549, 1507.5), (560, 1505.5), (600, 1504.5), (640, 1507.0), (654, 1509.0)],
  [(676, 1509.5), (700, 1508.0), (740, 1498.0), (770, 1483.0), (782, 1477.0)],
  [(805, 1476.0), (840, 1481.0), (880, 1486.0), (910, 1489.0)],
  [(933, 1492.0), (960, 1494.0), (1000, 1495.5), (1046, 1495.5)],
]
for seg in SEG:
    ax = np.array([a[0] for a in seg], float); ay = np.array([a[1] for a in seg], float)
    for x in range(int(ax[0]), int(ax[-1]) + 1):
        pred = float(np.interp(x, ax, ay))
        if near_v(x, pred) or in_box(x, pred, pad=0):
            pts.append((x, pred, 'skipB')); continue
        lo = int(np.floor(pred - 3.5)); hi = int(np.ceil(pred + 3.5))
        c, pk = centroid(D[lo:hi + 1, x], lo)
        if c is None or near_h(x, c):
            pts.append((x, pred, 'skipB')); continue
        if abs(c - pred) > 2.0:
            pts.append((x, c, 'checkB')); continue
        pts.append((x, c, 'B'))
with open(out, 'w') as f:
    f.write('x,y,kind\n')
    for x, y, k in pts:
        f.write('%.2f,%.2f,%s\n' % (x, y, k))
good = [p for p in pts if p[2] in ('A', 'B')]
print('good points', len(good), 'skipped', len(pts) - len(good))
