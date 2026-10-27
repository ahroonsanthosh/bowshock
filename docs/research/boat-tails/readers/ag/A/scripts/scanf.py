# usage: python3 -I scanf.py <png> <x0> <y0> <x1> <y1> <out.json> shape:size[,...] [minfill=150]
# Filled-symbol scan: for every integer centre and shape, fill = mean darkness at sample points inside the
# shape (outline scaled 0.2..0.85), ring = mean darkness on the outline scaled 1.35. score = fill - ring.
# Keeps local maxima (7 px) with fill >= minfill. Also usable to refine: prints all candidates by x.
import sys, json, math
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates, maximum_filter
a = sys.argv
g = np.asarray(Image.open(a[1]).convert('L')).astype(np.float32); D = 255 - g
x0, y0, x1, y1 = map(int, a[2:6]); out = a[6]
shapes = [(s.split(':')[0], float(s.split(':')[1])) for s in a[7].split(',')]
mf = float(a[8]) if len(a) > 8 else 150
def outline(shape, s, n=64):
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    if shape == 'circle': return s * np.cos(t), s * np.sin(t)
    if shape in ('square', 'diamond'):
        u = np.linspace(-1, 1, n // 4, endpoint=False)
        px = np.concatenate([u, np.ones_like(u), -u, -np.ones_like(u)]) * s
        py = np.concatenate([-np.ones_like(u), u, np.ones_like(u), -u]) * s
        if shape == 'diamond': px, py = (px - py) / 2, (px + py) / 2
        return px, py
    ang = {'tri_up': -90, 'tri_down': 90}[shape]
    V = [(s * math.cos(math.radians(ang + k * 120)), s * math.sin(math.radians(ang + k * 120))) for k in range(3)]
    px, py = [], []
    for k in range(3):
        (ax, ay), (bx, by) = V[k], V[(k + 1) % 3]
        for u in np.linspace(0, 1, n // 3, endpoint=False): px.append(ax + u * (bx - ax)); py.append(ay + u * (by - ay))
    return np.array(px), np.array(py)
YY, XX = np.mgrid[y0:y1 + 1, x0:x1 + 1].astype(np.float32)
res = []
for shape, s in shapes:
    ins = [outline(shape, s * f, 32) for f in (0.2, 0.45, 0.65, 0.85)]
    ix = np.concatenate([p[0] for p in ins]); iy = np.concatenate([p[1] for p in ins])
    rx, ry = outline(shape, s * 1.35, 64)
    F = np.zeros(XX.shape, np.float32); R = np.zeros(XX.shape, np.float32)
    for u, v in zip(ix, iy): F += map_coordinates(D, [YY + v, XX + u], order=1)
    for u, v in zip(rx, ry): R += map_coordinates(D, [YY + v, XX + u], order=1)
    F /= len(ix); R /= len(rx); S = F - R
    mx = maximum_filter(S, size=15)
    for j, i in zip(*np.where((S >= mx) & (F >= mf))):
        res.append(dict(shape=shape, size=s, x=float(XX[j, i]), y=float(YY[j, i]), fill=round(float(F[j, i]), 1), ring=round(float(R[j, i]), 1), score=round(float(S[j, i]), 1)))
json.dump(res, open(out, 'w'), indent=0)
for r in sorted(res, key=lambda r: (r['x'], r['y'])):
    print(f"{r['shape']:>8} ({r['x']:.0f},{r['y']:.0f}) fill {r['fill']:.0f} ring {r['ring']:.0f} score {r['score']:.0f}")
