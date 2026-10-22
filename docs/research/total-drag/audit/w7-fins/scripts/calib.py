"""Convert symbol centres (pixels) to plot values by local calibration
between traced grid lines. Usage:
python3 -I calib.py <image> <grid.json> <fit.csv> <out.csv>
<grid.json>: {"x": [[value, approx_px], ...], "y": [[value, approx_px], ...],
"band": 60} lists the vertical (x) and horizontal (y) grid lines with their
plot values and approximate pixel positions. Each line is traced along its
length (gridtrace.py's method, in bands of "band" px), and a point's value
is interpolated linearly between the two lines either side of it, at the
lines' positions where they pass the point (so skew and bow of the scan are
followed); beyond the outermost lines it is extrapolated from the last two.
<fit.csv> is symfit.py's output; <out.csv> adds x_value, y_value and, for a
check of the calibration, the spacing of the two lines used (px per unit)."""
import csv
import json
import sys
import numpy as np
from PIL import Image

img = 255 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
grid = json.load(open(sys.argv[2]))
band = int(grid.get('band', 60))
H, W = img.shape


def trace(kind, approx, half=6, dark=100):
    a = int(round(approx))
    length = H if kind == 'v' else W
    pts = []
    for s in range(0, length - band, band):
        if kind == 'v':
            box = img[s:s + band, a - half:a + half + 1]
        else:
            box = img[a - half:a + half + 1, s:s + band].T
        cover = (box > dark).mean(axis=0)
        w = box.mean(axis=0) * (cover > 0.8)
        if w.sum() > 0:
            pts.append((s + band / 2, (w * np.arange(-half, half + 1)).sum() / w.sum() + a))
    pts = np.array(pts)
    # keep the samples within 1.5 px of the line's median course (drop crossings)
    med = np.median(pts[:, 1])
    pts = pts[np.abs(pts[:, 1] - med) < 3]
    return pts


lines = {k: [(v, trace('v' if k == 'x' else 'h', p)) for v, p in grid[k]] for k in ('x', 'y')}


def value(k, along, across):
    """Plot value on axis k for a point at `across` (the coordinate normal to
    the lines) and `along` (the coordinate along them)."""
    pos = [(v, float(np.interp(along, t[:, 0], t[:, 1]))) for v, t in lines[k]]
    pos.sort(key=lambda q: q[1])
    for i in range(len(pos) - 1):
        if pos[i][1] <= across <= pos[i + 1][1] or i == 0 and across < pos[0][1] or i == len(pos) - 2:
            (v0, p0), (v1, p1) = pos[i], pos[i + 1]
            if pos[i][1] <= across <= pos[i + 1][1] or i == 0 and across < p0 or i == len(pos) - 2 and across > p1:
                return v0 + (v1 - v0) * (across - p0) / (p1 - p0), abs(p1 - p0) / abs(v1 - v0)
    raise ValueError


rows = list(csv.DictReader(open(sys.argv[3])))
for r in rows:
    x, y = float(r['x']), float(r['y'])
    r['x_value'], r['x_px_per_unit'] = (round(q, 5) for q in value('x', y, x))
    r['y_value'], r['y_px_per_unit'] = (round(q, 5) for q in value('y', x, y))
with open(sys.argv[4], 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)
for k in ('x', 'y'):
    for v, t in lines[k]:
        print(k, v, 'samples', len(t), 'course', round(t[:, 1].min(), 2), 'to', round(t[:, 1].max(), 2))
