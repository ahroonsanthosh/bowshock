# usage: python3 -I match.py <points.json> <out_prefix>
# points.json: {"cal": "<cal.out.json>", "templates": {name: {"at":[x,y], "r": half_size, "png": optional}},
#               "points": [{"id":..., "t": template name, "at":[x,y], "search": px (default 8), ...extra}]}
# Template = the symbol as drawn at a clean instance: the page darkness in a (2r+1)^2 window centred on
# the centre of the bounding box of the symbol's own strokes (long gridline strokes removed first).
# Each point is located by normalised cross-correlation of the template against the page darkness
# within +-search px of the approximate position, with parabolic sub-pixel refinement of the peak.
# Output: centre px, score, data coords via the affine calibration, and an overlay image per point.
import sys, json
import numpy as np, cv2
from PIL import Image, ImageDraw
P = json.load(open(sys.argv[1])); outp = sys.argv[2]
cal = json.load(open(P['cal']))
png = P.get('png', cal['spec']['png'])
g = np.asarray(Image.open(png).convert('L')).astype(np.float32)
D = 255 - g
def strip_lines(win):
    b = (win > 255 - 150).astype(np.uint8)
    L = max(25, int(min(win.shape) * 0.8))
    hl = cv2.morphologyEx(b, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (L, 1)))
    vl = cv2.morphologyEx(b, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, L)))
    return b & (1 - cv2.dilate(hl | vl, np.ones((3, 3), np.uint8)))
T = {}
for name, t in P['templates'].items():
    x, y = t['at']; r = t['r']
    if 'centre' in t:
        cx, cy = t['centre']
    else:
        w = D[int(y) - r - 6:int(y) + r + 7, int(x) - r - 6:int(x) + r + 7]
        b = strip_lines(w)
        n, lab, st, _ = cv2.connectedComponentsWithStats(b, 8)
        # component nearest the window centre with symbol size
        best = None
        for i in range(1, n):
            bx, by, bw, bh, a = st[i]
            if max(bw, bh) < r: continue
            dcen = abs(bx + bw / 2 - w.shape[1] / 2) + abs(by + bh / 2 - w.shape[0] / 2)
            if best is None or dcen < best[0]: best = (dcen, i)
        if best is None:
            cx, cy = x, y; print('template', name, 'no component; using given centre')
        else:
            bx, by, bw, bh, a = st[best[1]]
            if 'mask' in t and t['mask'] == 'union':
                # union of all components within window (symbols drawn as separate strokes)
                ys, xs = np.where(b > 0); bx, by, bw, bh = xs.min(), ys.min(), xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
            cx = int(x) - r - 6 + bx + (bw - 1) / 2; cy = int(y) - r - 6 + by + (bh - 1) / 2
            print(f'template {name}: stroke bbox w={bw} h={bh}, centre ({cx:.1f},{cy:.1f})')
    # template window centred on (cx, cy) using sub-pixel shift
    M = np.float32([[1, 0, -(cx - r)], [0, 1, -(cy - r)]])
    tw = cv2.warpAffine(D, M, (2 * r + 1, 2 * r + 1), flags=cv2.INTER_LINEAR)
    if 'blank' in t:  # rectangles (relative to centre) to zero out in the template (foreign strokes)
        for (a0, b0, a1, b1) in t['blank']:
            tw[b0 + r:b1 + r + 1, a0 + r:a1 + r + 1] = 0
    T[name] = dict(img=tw, r=r, centre=(cx, cy))
ax, ay = cal['ax'], cal['ay']
def data(px, py):
    X = ax[0] + ax[1] * px + ax[2] * py; Y = ay[0] + ay[1] * px + ay[2] * py
    if cal['spec'].get('xscale') == 'log': X = 10 ** X
    if cal['spec'].get('yscale') == 'log': Y = 10 ** Y
    return X, Y
out = []
tiles = []
for p in P['points']:
    t = T[p['t']]; r = t['r']; s = p.get('search', 8)
    x, y = p['at']
    if p.get('fixed'):
        cx, cy, score = x, y, float('nan')
    else:
        x0 = int(round(x)) - r - s; y0 = int(round(y)) - r - s
        win = D[y0:y0 + 2 * r + 1 + 2 * s, x0:x0 + 2 * r + 1 + 2 * s]
        res = cv2.matchTemplate(win, t['img'], cv2.TM_CCOEFF_NORMED)
        j, i = np.unravel_index(np.argmax(res), res.shape)
        score = float(res[j, i])
        def para(a, b, c):
            den = a - 2 * b + c
            return 0.0 if den == 0 else 0.5 * (a - c) / den
        di = para(res[j, i - 1], res[j, i], res[j, i + 1]) if 0 < i < res.shape[1] - 1 else 0
        dj = para(res[j - 1, i], res[j, i], res[j + 1, i]) if 0 < j < res.shape[0] - 1 else 0
        edge = not (0 < i < res.shape[1] - 1 and 0 < j < res.shape[0] - 1)
        cx = x0 + i + di + r; cy = y0 + j + dj + r
        if edge: score = -abs(score)
    X, Y = data(cx, cy)
    rec = dict(p); rec.update(px=round(float(cx), 2), py=round(float(cy), 2), score=round(float(score), 3), X=float(X), Y=float(Y))
    out.append(rec)
    # overlay tile
    R = r + 14
    crop = g[int(cy) - R:int(cy) + R + 1, int(cx) - R:int(cx) + R + 1]
    im = Image.fromarray(np.clip(crop, 0, 255).astype(np.uint8)).convert('RGB').resize(((2 * R + 1) * 4, (2 * R + 1) * 4), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    ox = (cx - int(cx) + R) * 4; oy = (cy - int(cy) + R) * 4
    d.line([(ox - 10, oy), (ox + 10, oy)], fill=(255, 0, 0)); d.line([(ox, oy - 10), (ox, oy + 10)], fill=(255, 0, 0))
    d.rectangle([ox - r * 4, oy - r * 4, ox + r * 4, oy + r * 4], outline=(0, 160, 255))
    d.text((3, 3), f"{p['id']} s={score:.2f}", fill=(200, 0, 0))
    tiles.append(im)
    print(f"{p['id']:>8} {p['t']:>6} px=({cx:8.2f},{cy:8.2f}) score={score:+.3f}  X={X:.4f} Y={Y:+.4f}")
json.dump(out, open(outp + '.res.json', 'w'), indent=0)
if tiles:
    W = max(t.size[0] for t in tiles); H = max(t.size[1] for t in tiles); ncol = max(1, min(6, 1800 // W))
    nrow = (len(tiles) + ncol - 1) // ncol
    sheet = Image.new('RGB', (ncol * W, nrow * H), 'white')
    for k, t in enumerate(tiles): sheet.paste(t, ((k % ncol) * W, (k // ncol) * H))
    sheet.save(outp + '_tiles.png')
