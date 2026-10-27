# usage: python3 -I refine.py <spec.json> <out_prefix>
# spec: {"cal": cal.out.json, "png": optional, "shapes": {name: {"shape": circle|square|diamond|tri_up|tri_down|tri_left|tri_right, "size": s}},
#        "points": [{"id":..., "s": shape name, "at": [x, y], "search": 4, "fixed": false, ...}]}
# Fits the symbol's stroke-centre outline (shape and size from 'shapes', size also searched over +-12 %)
# to the page darkness around the approximate centre: maximises mean outline darkness (coverage weighted)
# over centres within +-search px (0.25 px grid). Reports centre, fitted size, coverage, data coordinates,
# and writes an overlay tile sheet with the fitted outline drawn on each symbol.
import sys, json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import map_coordinates
P = json.load(open(sys.argv[1])); outp = sys.argv[2]
cal = json.load(open(P['cal'])); png = P.get('png', cal['spec']['png'])
g = np.asarray(Image.open(png).convert('L')).astype(np.float32); D = 255 - g
MASK = None
if P.get('gridmask'):
    import cv2
    _B = (g < 160).astype(np.uint8); _L = int(P['gridmask'])
    _hl = cv2.morphologyEx(_B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (_L, 1)))
    _vl = cv2.morphologyEx(_B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, _L)))
    MASK = (cv2.dilate(_hl | _vl, np.ones((3, 3), np.uint8)) > 0).astype(np.float32)
def outline(shape, s, n=120):
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    if shape == 'circle': return s * np.cos(t), s * np.sin(t)
    if shape in ('square', 'diamond'):
        u = np.linspace(-1, 1, n // 4, endpoint=False)
        px = np.concatenate([u, np.ones_like(u), -u, -np.ones_like(u)]) * s
        py = np.concatenate([-np.ones_like(u), u, np.ones_like(u), -u]) * s
        if shape == 'diamond': px, py = (px - py) / 2, (px + py) / 2
        return px, py
    if shape == 'quarter':  # bbox-centred quarter circle: flat left and bottom sides, arc centred at lower-left
        k = n // 3; u = np.linspace(-1, 1, k, endpoint=False)
        th = np.linspace(0, np.pi / 2, k, endpoint=False)
        return (np.concatenate([-s * np.ones(k), u * s, -s + 2 * s * np.cos(th)]),
                np.concatenate([u * s, s * np.ones(k), s - 2 * s * np.sin(th)]))
    if shape == 'rtri_bl':  # bbox-centred right triangle, right angle at lower-left
        k = n // 3; u = np.linspace(0, 1, k, endpoint=False)
        return (np.concatenate([-s * np.ones(k), -s + 2 * s * u, s - 2 * s * u]),
                np.concatenate([-s + 2 * s * u, s * np.ones(k), s - 2 * s * u]))
    ang = {'tri_up': -90, 'tri_down': 90, 'tri_left': 180, 'tri_right': 0}[shape]
    V = [(s * math.cos(math.radians(ang + k * 120)), s * math.sin(math.radians(ang + k * 120))) for k in range(3)]
    px, py = [], []
    for k in range(3):
        (ax, ay), (bx, by) = V[k], V[(k + 1) % 3]
        for u in np.linspace(0, 1, n // 3, endpoint=False): px.append(ax + u * (bx - ax)); py.append(ay + u * (by - ay))
    return np.array(px), np.array(py)
ax_, ay_ = cal['ax'], cal['ay']
def data(px, py):
    X = ax_[0] + ax_[1] * px + ax_[2] * py; Y = ay_[0] + ay_[1] * px + ay_[2] * py
    if cal['spec'].get('xscale') == 'log': X = 10 ** X
    if cal['spec'].get('yscale') == 'log': Y = 10 ** Y
    return X, Y
dk = P.get('dark', 60)
res = []; tiles = []
for p in P['points']:
    sh = P['shapes'][p['s']]; shape = sh['shape']; s0 = sh['size']
    x, y = p['at']; srch = p.get('search', 4)
    best = None
    if p.get('fixed'):
        best = (float('nan'), float('nan'), x, y, s0)
    else:
        sizes = [s0] if p.get('fixsize', P.get('fixsize')) else np.arange(s0 * 0.88, s0 * 1.12 + 1e-9, 0.25)
        for s in sizes:
            ox, oy = outline(shape, s)
            for yy in np.arange(y - srch, y + srch + 1e-9, 0.25):
                for xx in np.arange(x - srch, x + srch + 1e-9, 0.25):
                    if P.get('filled') or p.get('filled'):
                        fi = np.mean([map_coordinates(D, [yy + oy * f_, xx + ox * f_], order=1).mean() for f_ in (0.25, 0.5, 0.75, 0.95)])
                        ri = map_coordinates(D, [yy + oy * 1.3, xx + ox * 1.3], order=1).mean()
                        c = float((map_coordinates(D, [yy + oy * 0.9, xx + ox * 0.9], order=1) > dk).mean()); sc = fi - ri
                    elif MASK is not None:
                        v = map_coordinates(D, [yy + oy, xx + ox], order=1)
                        m = map_coordinates(MASK, [yy + oy, xx + ox], order=0) < 0.5
                        if m.sum() < len(v) * 0.4: continue
                        c = (v[m] > dk).mean(); sc = c * v[m].mean() * (0.9 + 0.1 * m.mean())
                    else:
                        v = map_coordinates(D, [yy + oy, xx + ox], order=1)
                        c = (v > dk).mean(); sc = c * v.mean()
                    if best is None or sc > best[0]: best = (sc, c, xx, yy, s)
    sc, c, cx, cy, s = best
    X, Y = data(cx, cy)
    r = dict(p); r.update(px=round(float(cx), 2), py=round(float(cy), 2), size=round(float(s), 2), coverage=round(float(c), 3), score=round(float(c), 3), X=float(X), Y=float(Y))
    res.append(r)
    print(f"{p['id']:>10} {shape:>8} px=({cx:8.2f},{cy:8.2f}) size {s:5.2f} cov {c:.2f}  X={X:.4f} Y={Y:+.4f}")
    R = int(s0) + 10; k = 6
    crop = g[int(cy) - R:int(cy) + R + 1, int(cx) - R:int(cx) + R + 1]
    im = Image.fromarray(crop.astype(np.uint8)).convert('RGB').resize(((2 * R + 1) * k, (2 * R + 1) * k), Image.LANCZOS)
    d = ImageDraw.Draw(im); ox, oy = outline(shape, s)
    oxc = (cx - int(cx) + R) * k; oyc = (cy - int(cy) + R) * k
    d.point([(oxc + u * k, oyc + v * k) for u, v in zip(ox, oy)], fill=(255, 0, 0))
    d.line([(oxc - 5, oyc), (oxc + 5, oyc)], fill=(255, 0, 0)); d.line([(oxc, oyc - 5), (oxc, oyc + 5)], fill=(255, 0, 0))
    d.text((2, 2), f"{p['id']} c={c:.2f}", fill=(0, 0, 255)); tiles.append(im)
json.dump(res, open(outp + '.res.json', 'w'), indent=0)
if tiles:
    W = max(t.size[0] for t in tiles); H = max(t.size[1] for t in tiles); ncol = max(1, min(8, 1600 // W))
    sheet = Image.new('RGB', (ncol * W, ((len(tiles) + ncol - 1) // ncol) * H), 'white')
    for i, t in enumerate(tiles): sheet.paste(t, ((i % ncol) * W, (i // ncol) * H))
    sheet.save(outp + '_tiles.png')
