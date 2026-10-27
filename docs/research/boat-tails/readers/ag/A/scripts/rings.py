# usage: python3 -I rings.py <png> <shape> <size> <x0> <y0> <x1> <y1> <out.png> [cov=0.8] [step=0.5] [nms=4] [dark=110]
# Outline detector for overlapping symbols. For each candidate centre on a sub-pixel grid it samples the
# page darkness along the symbol's stroke-centre outline (shape circle: radius=size; square: half-side=size;
# diamond: half-diagonal=size; tri_up / tri_down: circumradius=size, centroid at centre) and scores
#   coverage = fraction of outline samples darker than <dark> (grey < 255-dark... i.e. grey < 255-dark)
#   ring = mean outline darkness - mean darkness on a contour at 0.55*size (penalises filled blobs)
# Peaks: local maxima of coverage*ring with coverage >= cov. Overlapping symbols keep their own full
# outlines, so each still scores high. Writes an overlay with the fitted outlines drawn.
import sys, math
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import map_coordinates, maximum_filter
a = sys.argv
g = np.asarray(Image.open(a[1]).convert('L')).astype(np.float32); D = 255 - g
shape = a[2]; s = float(a[3]); x0, y0, x1, y1 = map(int, a[4:8]); out = a[8]
cov = float(a[9]) if len(a) > 9 else 0.8; step = float(a[10]) if len(a) > 10 else 0.5
nms = float(a[11]) if len(a) > 11 else 4; dk = float(a[12]) if len(a) > 12 else 110
def outline(shape, s, n=96):
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    if shape == 'circle':
        return s * np.cos(t), s * np.sin(t)
    if shape in ('square', 'diamond'):
        u = np.linspace(-1, 1, n // 4, endpoint=False)
        px = np.concatenate([u, np.ones_like(u), -u, -np.ones_like(u)]) * s
        py = np.concatenate([-np.ones_like(u), u, np.ones_like(u), -u]) * s
        if shape == 'diamond':
            px, py = (px - py) / math.sqrt(2) * 1.0, (px + py) / math.sqrt(2) * 1.0
            # rotate square by 45 deg: half-diagonal = s*sqrt2 -> rescale so half-diagonal = s
            px, py = px / math.sqrt(2), py / math.sqrt(2)
        return px, py
    if shape in ('tri_up', 'tri_down', 'tri_left', 'tri_right'):
        ang = {'tri_up': -90, 'tri_down': 90, 'tri_left': 180, 'tri_right': 0}[shape]
        V = [(s * math.cos(math.radians(ang + k * 120)), s * math.sin(math.radians(ang + k * 120))) for k in range(3)]
        px = []; py = []
        for k in range(3):
            (ax, ay), (bx, by) = V[k], V[(k + 1) % 3]
            for u in np.linspace(0, 1, n // 3, endpoint=False):
                px.append(ax + u * (bx - ax)); py.append(ay + u * (by - ay))
        return np.array(px), np.array(py)
    raise SystemExit('unknown shape')
ox, oy = outline(shape, s); ix, iy = outline(shape, s * 0.55)
xs = np.arange(x0, x1 + 1e-9, step); ys = np.arange(y0, y1 + 1e-9, step)
S = np.zeros((len(ys), len(xs))); C = np.zeros_like(S)
for j, y in enumerate(ys):
    for i, x in enumerate(xs):
        v = map_coordinates(D, [y + oy, x + ox], order=1)
        w = map_coordinates(D, [y + iy, x + ix], order=1)
        c = (v > dk).mean(); C[j, i] = c; S[j, i] = c * (v.mean() - w.mean())
M = maximum_filter(S, size=int(2 * nms / step) + 1)
pk = [(S[j, i], C[j, i], xs[i], ys[j]) for j, i in zip(*np.where((S >= M) & (C >= cov)))]
pk.sort(key=lambda p: (p[3], p[2]))
sc = 6; pad = int(s) + 6
X0, Y0 = int(x0) - pad, int(y0) - pad
im = Image.fromarray(g[Y0:int(y1) + pad, X0:int(x1) + pad].astype(np.uint8)).convert('RGB')
im = im.resize((im.size[0] * sc, im.size[1] * sc), Image.LANCZOS); d = ImageDraw.Draw(im)
cols = [(255, 0, 0), (0, 160, 0), (0, 0, 255), (200, 0, 200), (0, 150, 150), (220, 120, 0)]
for k, (sv, cv, x, y) in enumerate(pk):
    c = cols[k % len(cols)]
    pts = [((x + u - X0) * sc, (y + v - Y0) * sc) for u, v in zip(ox, oy)]
    d.point(pts, fill=c)
    d.line([((x - X0) * sc - 6, (y - Y0) * sc), ((x - X0) * sc + 6, (y - Y0) * sc)], fill=c, width=2)
    d.text(((x - X0) * sc + 8, (y - Y0) * sc - 5), str(k), fill=c)
    print(f"{shape} peak {k}: ({x:.2f},{y:.2f}) coverage {cv:.2f} score {sv:.1f}")
im.save(out)
