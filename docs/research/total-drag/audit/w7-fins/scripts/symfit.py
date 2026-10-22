"""Refine plotted-symbol centres on a scanned plot by fitting an outline
template, and draw the fits for checking by eye. Usage:
python3 -I symfit.py <image> <points.csv> <out.csv> [<overlay.png> x0 y0 x1 y1 scale]
<points.csv> has columns id,kind,x,y (kind circle, square, triangle, diamond or
cross; x, y
a rough centre in image pixels, placed by eye). For each point the centre
is searched over +-search px in steps of 0.25 px, with the template's size
over a small range, maximising the mean ink along the outline less the
mean ink inside it (an open symbol is white inside). The triangle points
up and its centre is its centroid. <out.csv> gets id,kind,x,y,size,score,
shift (the distance moved from the rough centre). Reads the image; writes
only the two outputs."""
import csv
import sys
import numpy as np
from PIL import Image, ImageDraw

SEARCH = 3.0
img = 255 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)


def sample(xs, ys):
    x0 = np.floor(xs).astype(int)
    y0 = np.floor(ys).astype(int)
    fx, fy = xs - x0, ys - y0
    g = img
    return (g[y0, x0] * (1 - fx) * (1 - fy) + g[y0, x0 + 1] * fx * (1 - fy)
            + g[y0 + 1, x0] * (1 - fx) * fy + g[y0 + 1, x0 + 1] * fx * fy)


def outline(kind, s):
    """Outline and interior sample offsets for a symbol of size s."""
    if kind == 'circle':
        t = np.linspace(0, 2 * np.pi, 64, endpoint=False)
        o = np.c_[s * np.cos(t), s * np.sin(t)]
        i = np.c_[0.45 * s * np.cos(t[::4]), 0.45 * s * np.sin(t[::4])]
    elif kind == 'square':
        u = np.linspace(-s, s, 17)
        o = np.r_[np.c_[u, -s + 0 * u], np.c_[u, s + 0 * u], np.c_[-s + 0 * u, u], np.c_[s + 0 * u, u]]
        v = np.linspace(-0.45 * s, 0.45 * s, 4)
        i = np.array([(a, b) for a in v for b in v])
    elif kind == 'triangle':
        # s is the half base; height 2 s * 0.9 (as drawn on these figures)
        h = 1.8 * s
        A, B, C = np.array([0, -2 * h / 3]), np.array([-s, h / 3]), np.array([s, h / 3])
        u = np.linspace(0, 1, 17)[:, None]
        o = np.r_[A + u * (B - A), B + u * (C - B), C + u * (A - C)]
        i = np.array([(a, b) for a in np.linspace(-0.3 * s, 0.3 * s, 3) for b in np.linspace(-0.3 * h, 0.05 * h, 3)])
    elif kind == 'diamond':
        # a square turned 45 deg; s is the half-diagonal
        A, B, C, D = (np.array(v, float) for v in ((0, -s), (s, 0), (0, s), (-s, 0)))
        u = np.linspace(0, 1, 13)[:, None]
        o = np.r_[A + u * (B - A), B + u * (C - B), C + u * (D - C), D + u * (A - D)]
        v = np.linspace(-0.3 * s, 0.3 * s, 3)
        i = np.array([(a, b) for a in v for b in v])
    elif kind == 'cross':
        # an x: two diagonals of half-length s; no interior test (it is open)
        u = np.linspace(-s, s, 17)
        o = np.r_[np.c_[u, u], np.c_[u, -u]]
        i = np.array([(s * 0.7, 0), (-s * 0.7, 0), (0, s * 0.7), (0, -s * 0.7)])
    else:
        raise SystemExit('unknown kind ' + kind)
    return o, i


SIZES = {'circle': np.arange(3.5, 5.51, 0.25), 'square': np.arange(4.0, 6.01, 0.25),
         'triangle': np.arange(5.0, 7.01, 0.25), 'diamond': np.arange(4.5, 7.01, 0.25),
         'cross': np.arange(3.0, 6.01, 0.25)}
rows = list(csv.DictReader(open(sys.argv[2])))
out = []
for r in rows:
    kind, rx, ry = r['kind'], float(r['x']), float(r['y'])
    best = None
    for s in SIZES[kind]:
        o, i = outline(kind, s)
        for dx in np.arange(-SEARCH, SEARCH + 0.01, 0.25):
            for dy in np.arange(-SEARCH, SEARCH + 0.01, 0.25):
                cx, cy = rx + dx, ry + dy
                sc = sample(o[:, 0] + cx, o[:, 1] + cy).mean() - sample(i[:, 0] + cx, i[:, 1] + cy).mean()
                if best is None or sc > best[0]:
                    best = (sc, cx, cy, s)
    sc, cx, cy, s = best
    out.append({'id': r['id'], 'kind': kind, 'x': round(cx, 2), 'y': round(cy, 2), 'size': s,
                'score': round(sc, 1), 'shift': round(float(np.hypot(cx - rx, cy - ry)), 2)})
with open(sys.argv[3], 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
    w.writeheader()
    w.writerows(out)
if len(sys.argv) > 4:
    x0, y0, x1, y1, k = map(int, sys.argv[5:10])
    im = Image.open(sys.argv[1]).convert('RGB').crop((x0, y0, x1, y1))
    im = im.resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for p in out:
        o, _ = outline(p['kind'], p['size'])
        pts = [((a + p['x'] - x0) * k, (b + p['y'] - y0) * k) for a, b in o]
        d.line(pts + [pts[0]], fill=(255, 0, 0), width=1)
        X, Y = (p['x'] - x0) * k, (p['y'] - y0) * k
        d.line([(X - 3, Y), (X + 3, Y)], fill=(0, 160, 0))
        d.line([(X, Y - 3), (X, Y + 3)], fill=(0, 160, 0))
        d.text((X + p['size'] * k + 2, Y - 6), p['id'], fill=(0, 0, 255))
    im.save(sys.argv[4])
