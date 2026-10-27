# usage: python3 -I fitcluster.py <spec.json> <out_prefix>
# spec: {"cal":..., "png": optional, "dark": 128, "shapes": {name: {"shape":..., "size":...}},
#        "clusters": [{"id":..., "x0":..,"y0":..,"x1":..,"y1":.., "want": [shape names]}]}
# For each cluster and each wanted shape, scans every centre (0.5 px grid) in the box for the outline
# (stroke centre line) of that shape at its nominal size and +-8 %, scoring coverage = fraction of outline
# samples that are dark (grey < dark) and taking the centre with the highest coverage (ties: highest
# mean darkness, then nearest the box centre). Shapes: circle, square, diamond, tri_up, rtri (right angle
# at lower left, legs vertical and horizontal), quarter (flat left and bottom edges, arc centred at the
# lower-left corner). size = circle radius, square half side, diamond half diagonal, triangle circumradius,
# rtri/quarter half leg. Writes results JSON and an overlay sheet with each best outline per cluster.
import sys, json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import map_coordinates
S = json.load(open(sys.argv[1])); outp = sys.argv[2]
cal = json.load(open(S['cal'])); png = S.get('png', cal['spec']['png'])
g = np.asarray(Image.open(png).convert('L')).astype(np.float32); D = 255 - g
dk = 255 - S.get('dark', 128)
def outline(shape, s, n=120):
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    if shape == 'circle': return s * np.cos(t), s * np.sin(t)
    if shape in ('square', 'diamond'):
        u = np.linspace(-1, 1, n // 4, endpoint=False)
        px = np.concatenate([u, np.ones_like(u), -u, -np.ones_like(u)]) * s
        py = np.concatenate([-np.ones_like(u), u, np.ones_like(u), -u]) * s
        if shape == 'diamond': px, py = (px - py) / 2, (px + py) / 2
        return px, py
    if shape in ('tri_up', 'tri_down'):
        ang = -90 if shape == 'tri_up' else 90
        V = [(s * math.cos(math.radians(ang + k * 120)), s * math.sin(math.radians(ang + k * 120))) for k in range(3)]
    elif shape == 'rtri':
        V = [(-s, -s), (-s, s), (s, s)]
    elif shape == 'quarter':
        k = n // 3
        u = np.linspace(-1, 1, k, endpoint=False)
        lx = -s * np.ones(k); ly = u * s                     # left edge, top to bottom
        bx = u * s; by = s * np.ones(k)                      # bottom edge, left to right
        th = np.linspace(0, math.pi / 2, k, endpoint=False)  # arc centred at (-s, s), radius 2s, from (s,s) to (-s,-s)
        ax = -s + 2 * s * np.cos(th); ay = s - 2 * s * np.sin(th)
        return np.concatenate([lx, bx, ax]), np.concatenate([ly, by, ay])
    px, py = [], []
    for k in range(3):
        (ax, ay), (bx, by) = V[k], V[(k + 1) % 3]
        for u in np.linspace(0, 1, n // 3, endpoint=False): px.append(ax + u * (bx - ax)); py.append(ay + u * (by - ay))
    px = np.array(px); py = np.array(py)
    if shape in ('rtri',):  # centre = centroid of the triangle
        px -= np.mean([v[0] for v in V]); py -= np.mean([v[1] for v in V])
    return px, py
ax_, ay_ = cal['ax'], cal['ay']
def data(px, py):
    return ax_[0] + ax_[1] * px + ax_[2] * py, ay_[0] + ay_[1] * px + ay_[2] * py
res = []; tiles = []
for C in S['clusters']:
    x0, y0, x1, y1 = C['x0'], C['y0'], C['x1'], C['y1']
    YY, XX = np.mgrid[y0:y1 + 0.01:0.5, x0:x1 + 0.01:0.5].astype(np.float32)
    best_all = []
    for name in C['want']:
        sh = S['shapes'][name]; best = None
        for f in (0.92, 1.0, 1.08):
            ox, oy = outline(sh['shape'], sh['size'] * f)
            Cv = np.zeros(XX.shape, np.float32); M = np.zeros(XX.shape, np.float32)
            for u, v in zip(ox, oy):
                val = map_coordinates(D, [YY + v, XX + u], order=1); Cv += (val > dk); M += val
            Cv /= len(ox); M /= len(ox)
            score = Cv * 1000 + M / 255.0
            j, i = np.unravel_index(np.argmax(score), score.shape)
            if best is None or score[j, i] > best[0]:
                # how many distinct centres reach within 0.03 of the max coverage (uniqueness)
                near = (Cv >= Cv[j, i] - 0.03)
                spread = float(np.hypot(XX[near] - XX[j, i], YY[near] - YY[j, i]).max())
                best = (score[j, i], float(Cv[j, i]), float(XX[j, i]), float(YY[j, i]), sh['size'] * f, spread)
        _, cov, cx, cy, s, spread = best
        X, Y = data(cx, cy)
        r = dict(cluster=C['id'], id=f"{C['id']}_{name}", s=name, shape=sh['shape'], px=cx, py=cy, size=s, coverage=round(cov, 3), score=round(cov, 3), spread=round(spread, 1), X=X, Y=Y)
        res.append(r); best_all.append(r)
        print(f"{r['id']:>14} {sh['shape']:>8} px=({cx:7.1f},{cy:7.1f}) size {s:5.1f} cov {cov:.2f} spread {spread:5.1f}  X={X:.4f} Y={Y:+.4f}")
    # overlay tile
    k = 5; pad = 22
    crop = g[int(y0) - pad:int(y1) + pad, int(x0) - pad:int(x1) + pad]
    im = Image.fromarray(crop.astype(np.uint8)).convert('RGB').resize((crop.shape[1] * k, crop.shape[0] * k), Image.NEAREST)
    plain = im.copy(); d = ImageDraw.Draw(im)
    cols = [(255, 0, 0), (0, 170, 0), (0, 0, 255), (220, 0, 220), (0, 170, 170), (230, 130, 0)]
    for q, r in enumerate(best_all):
        ox, oy = outline(r['shape'], r['size']); c = cols[q % len(cols)]
        X0 = (r['px'] - int(x0) + pad) * k; Y0 = (r['py'] - int(y0) + pad) * k
        d.point([(X0 + u * k, Y0 + v * k) for u, v in zip(ox, oy)], fill=c)
        d.text((X0 + 3, Y0 - 5), r['s'], fill=c)
    W = im.size[0]; t = Image.new('RGB', (W * 2 + 8, im.size[1]), 'white'); t.paste(plain, (0, 0)); t.paste(im, (W + 8, 0)); tiles.append(t)
json.dump(res, open(outp + '.res.json', 'w'), indent=0)
for q, t in enumerate(tiles): t.save(f"{outp}_c{q}.png")
