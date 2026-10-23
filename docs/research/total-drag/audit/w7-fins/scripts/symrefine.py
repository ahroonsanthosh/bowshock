"""Refine symbol centres placed by eye, for symbols drawn larger and thinner
than symfit.py's templates cover (about 24 px across at 300 dpi). Usage:
python3 -I symrefine.py <image> <rough.csv> <kinds.json> <out.csv> [<overlay.png> x0 y0 x1 y1 k]
<rough.csv>: id,kind,x,y[,...]; kinds as symdetect.py (circle, square,
diamond, triangle, rtri) with sizes from <kinds.json>, each tried at its
size -2 to +2 px in 0.5 px steps, the centre searched over +-4 px in 0.25 px
steps; the score is symdetect.py's (widened ink on the outline less a ring
inside), with the grid lines in <kinds.json> blanked. Kinds 'manual' and
'eye' keep the rough centre. Writes the rough columns plus fx, fy (refined), size,
score and shift. The overlay draws each fitted outline in red."""
import csv
import json
import sys
import numpy as np
from PIL import Image, ImageDraw

img = np.asarray(Image.open(sys.argv[1]).convert('L'))
kinds = json.load(open(sys.argv[3]))
ink = (img < 160).astype(float)
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


def sample(pts):
    xs, ys = pts[:, 0], pts[:, 1]
    x0, y0 = np.floor(xs).astype(int), np.floor(ys).astype(int)
    fx, fy = xs - x0, ys - y0
    return (w[y0, x0] * (1 - fx) * (1 - fy) + w[y0, x0 + 1] * fx * (1 - fy)
            + w[y0 + 1, x0] * (1 - fx) * fy + w[y0 + 1, x0 + 1] * fx * fy)


rows = list(csv.DictReader(open(sys.argv[2])))
out = []
for r in rows:
    kind, rx, ry = r['kind'], float(r['x']), float(r['y'])
    if kind in ('manual', 'eye'):
        out.append(dict(r, fx=rx, fy=ry, size='', score='', shift=0))
        continue
    best = None
    for s in np.arange(kinds[kind] - 2, kinds[kind] + 2.01, 0.5):
        o = shape(kind, s)
        for dx in np.arange(-4, 4.01, 0.25):
            for dy in np.arange(-4, 4.01, 0.25):
                c = np.array([rx + dx, ry + dy])
                sc = sample(o + c).mean() - sample(0.45 * o + c).mean()
                if best is None or sc > best[0]:
                    best = (sc, c[0], c[1], s)
    sc, cx, cy, s = best
    out.append(dict(r, fx=round(cx, 2), fy=round(cy, 2), size=s, score=round(sc, 3),
                    shift=round(float(np.hypot(cx - rx, cy - ry)), 2)))
with open(sys.argv[4], 'w', newline='') as f:
    wr = csv.DictWriter(f, fieldnames=list(out[0].keys()))
    wr.writeheader()
    wr.writerows(out)
if len(sys.argv) > 5:
    x0, y0, x1, y1, k = map(int, sys.argv[6:11])
    im = Image.open(sys.argv[1]).convert('RGB').crop((x0, y0, x1, y1))
    im = im.resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for p in out:
        X, Y = (float(p['fx']) - x0) * k, (float(p['fy']) - y0) * k
        if p['kind'] not in ('manual', 'eye'):
            o = shape(p['kind'], float(p['size']))
            pts = [((a + float(p['fx']) - x0) * k, (b + float(p['fy']) - y0) * k) for a, b in o]
            d.line(pts + [pts[0]], fill=(255, 0, 0), width=1)
        d.line([(X - 4, Y), (X + 4, Y)], fill=(0, 160, 0))
        d.line([(X, Y - 4), (X, Y + 4)], fill=(0, 160, 0))
        d.text((X + 14 * k, Y - 6), p['id'], fill=(0, 0, 255))
    im.save(sys.argv[5])
