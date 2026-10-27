# usage: python3 -I scan.py <png> <x0> <y0> <x1> <y1> <out.json> shape:size[,shape:size...] [cov=0.85] [dark=60]
# Vectorised outline scan: for every integer centre in the region and each shape, coverage = fraction of
# the stroke-centre outline samples whose darkness exceeds <dark>; mean = mean darkness on the outline;
# inner = mean darkness on a 0.5-scaled outline (filled vs open). Keeps local maxima (5 px) of coverage*mean
# with coverage >= cov. Output: list of candidates with shape, centre, coverage, mean, inner darkness.
import sys, json, math
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates, maximum_filter
a = sys.argv
g = np.asarray(Image.open(a[1]).convert('L')).astype(np.float32); D = 255 - g
x0, y0, x1, y1 = map(int, a[2:6]); out = a[6]
shapes = [(s.split(':')[0], float(s.split(':')[1])) for s in a[7].split(',')]
cov = float(a[8]) if len(a) > 8 else 0.85; dk = float(a[9]) if len(a) > 9 else 60
def outline(shape, s, n=96):
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
    ox, oy = outline(shape, s); ix, iy = outline(shape, s * 0.5, 48)
    C = np.zeros(XX.shape, np.float32); M = np.zeros(XX.shape, np.float32); I = np.zeros(XX.shape, np.float32)
    for u, v in zip(ox, oy):
        val = map_coordinates(D, [YY + v, XX + u], order=1)
        C += (val > dk); M += val
    for u, v in zip(ix, iy):
        I += map_coordinates(D, [YY + v, XX + u], order=1)
    C /= len(ox); M /= len(ox); I /= len(ix)
    S = C * M
    mx = maximum_filter(S, size=11)
    for j, i in zip(*np.where((S >= mx) & (C >= cov))):
        res.append(dict(shape=shape, size=s, x=float(XX[j, i]), y=float(YY[j, i]), cov=round(float(C[j, i]), 3), mean=round(float(M[j, i]), 1), inner=round(float(I[j, i]), 1)))
json.dump(res, open(out, 'w'), indent=0)
for r in sorted(res, key=lambda r: (r['x'], r['y'])):
    print(f"{r['shape']:>8} ({r['x']:.0f},{r['y']:.0f}) cov {r['cov']:.2f} mean {r['mean']:.0f} inner {r['inner']:.0f}")
