"""Find candidate plotted symbols of given kinds and sizes on a scanned plot,
as a first pass that a reader then checks and corrects by eye. Usage:
python3 -I symdetect.py <image> x0 y0 x1 y1 <kinds.json> <out.csv> [min_score]
<kinds.json>: {kind: size, ...} with symfit.py's kinds and size meanings,
plus 'rtri' (a right triangle, the right angle at the lower right, s its half
base, its height 2.3 s). The ink (pixels darker than 160) is widened by one pixel each way, so
thin broken outlines still score; for every position in the box the score
is the mean widened ink along the outline less the mean along a ring at 0.45
of the size (an open symbol is white inside). Local maxima over +-8 px above
min_score (default 0.55) are written as kind,x,y,score, strongest first per
kind. Reads the image only."""
import csv
import json
import sys
import numpy as np
from PIL import Image

img = np.asarray(Image.open(sys.argv[1]).convert('L'))
x0, y0, x1, y1 = map(int, sys.argv[2:6])
kinds = json.load(open(sys.argv[6]))
thr = float(sys.argv[8]) if len(sys.argv) > 8 else 0.55
ink = (img < 160).astype(float)
# grid lines (kinds.json "grid_x", "grid_y", pixel positions) blanked over +-2 px, so they do not score
for gx in kinds.pop('grid_x', []):
    ink[:, int(round(gx)) - 2:int(round(gx)) + 3] = 0
for gy in kinds.pop('grid_y', []):
    ink[int(round(gy)) - 2:int(round(gy)) + 3, :] = 0
w = ink.copy()
for dy in (-1, 0, 1):
    for dx in (-1, 0, 1):
        w = np.maximum(w, np.roll(np.roll(ink, dy, 0), dx, 1))


def shape(kind, s):
    if kind == 'circle':
        t = np.linspace(0, 2 * np.pi, 72, endpoint=False)
        return np.c_[s * np.cos(t), s * np.sin(t)]
    if kind == 'square':
        u = np.linspace(-s, s, 19)
        return np.r_[np.c_[u, -s + 0 * u], np.c_[u, s + 0 * u], np.c_[-s + 0 * u, u], np.c_[s + 0 * u, u]]
    if kind == 'diamond':
        P = [np.array(v, float) for v in ((0, -s), (s, 0), (0, s), (-s, 0))]
    elif kind == 'triangle':
        h = 1.8 * s
        P = [np.array(v) for v in ((0, -2 * h / 3), (-s, h / 3), (s, h / 3))]
    elif kind == 'rtri':
        h = 2.3 * s
        P = [np.array(v) for v in ((s, -h / 2), (-s, h / 2), (s, h / 2))]
    u = np.linspace(0, 1, 19)[:, None]
    return np.concatenate([P[i] + u * (P[(i + 1) % len(P)] - P[i]) for i in range(len(P))])


def score_map(pts):
    acc = np.zeros((y1 - y0, x1 - x0))
    for dx, dy in pts:
        ix, iy = int(round(dx)), int(round(dy))
        acc += w[y0 + iy:y1 + iy, x0 + ix:x1 + ix]
    return acc / len(pts)


rows = []
for kind, s in kinds.items():
    o = shape(kind, s)
    sc = score_map(o) - score_map(0.45 * o)
    cand = []
    R = 8
    for y in range(R, sc.shape[0] - R):
        for x in np.where(sc[y, R:-R] > thr)[0] + R:
            v = sc[y, x]
            if v >= sc[y - R:y + R + 1, x - R:x + R + 1].max() and not any(
                    abs(c[1] - x - x0) <= R and abs(c[2] - y - y0) <= R for c in cand):
                cand.append((kind, x + x0, y + y0, round(float(v), 3)))
    cand.sort(key=lambda c: -c[3])
    rows += cand
with open(sys.argv[7], 'w', newline='') as f:
    wr = csv.writer(f)
    wr.writerow(['kind', 'x', 'y', 'score'])
    wr.writerows(rows)
print(len(rows))
