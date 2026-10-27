# usage: python3 -I fig7.py <spec.json> <out_prefix>
# spec: {"cal": cal.out.json, "stations": [x/dm...], "panel_y": [ytop, ybot], "r": 12, "id": "..."}
# For each station: (1) solid blobs: pixels darker than 128, morphologically opened with a 9x9 square,
# components whose centroid lies within 16 px of the station's x: their y extent (= merged symbols);
# (2) open circle search: centres on a 0.5 px grid within +-8 px of the station x over the panel height;
# outline coverage (radius r, samples darker than 128) and inner darkness (mean darkness at 0.5 r,
# excluding the centre 2 px); a visible open circle has coverage >= 0.9 and inner darkness < 60;
# reports the best such circle, its centre-dot (small dark blob near the centre) and its spread.
# Writes JSON and a tile image per station.
import sys, json, math
import numpy as np, cv2
from PIL import Image, ImageDraw
from scipy.ndimage import map_coordinates
S = json.load(open(sys.argv[1])); outp = sys.argv[2]
cal = json.load(open(S['cal'])); png = cal['spec']['png']
g = np.asarray(Image.open(png).convert('L')).astype(np.float32); D = 255 - g
B = (g < 128).astype(np.uint8)
_hl = cv2.morphologyEx(B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (41, 1)))
_vl = cv2.morphologyEx(B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 41)))
Dc = D * (1 - cv2.dilate(_hl | _vl, np.ones((3, 3), np.uint8))).astype(np.float32)  # darkness with long lines removed
ax, ay = cal['ax'], cal['ay']
def data(px, py): return ax[0] + ax[1] * px + ax[2] * py, ay[0] + ay[1] * px + ay[2] * py
def topx(X, py):  # solve ax0 + ax1 px + ax2 py = X
    return (X - ax[0] - ax[2] * py) / ax[1]
def topy(Y, px): return (Y - ay[0] - ay[1] * px) / ay[2]
y0, y1 = S['panel_y']; r = S.get('r', 12)
t = np.linspace(0, 2 * np.pi, 72, endpoint=False); ox, oy = r * np.cos(t), r * np.sin(t); ix, iy = 0.5 * r * np.cos(t), 0.5 * r * np.sin(t)
out = []; tiles = []
for st in S['stations']:
    pxs = topx(st, (y0 + y1) / 2)
    xa, xb = int(pxs - 30), int(pxs + 30)
    sub = B[y0 - 25:y1 + 25, xa - 30:xb + 30]
    M = cv2.morphologyEx(sub, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    M = cv2.morphologyEx(M, cv2.MORPH_OPEN, np.ones((11, 11), np.uint8))[25:-25, 30:-30]
    n, lab, stt, cen = cv2.connectedComponentsWithStats(M, 8)
    comps = []
    for i in range(1, n):
        x, y, w, h, a = stt[i]
        if a >= 60 and w <= 50 and abs(xa + cen[i][0] - pxs) < 16:
            comps.append([int(y0 + y), int(y0 + y + h - 1), int(xa + x), int(xa + x + w - 1), int(a)])
    comps.sort()
    blobs = []
    for c in comps:
        if blobs and c[0] <= blobs[-1]['y_bot'] + 3:
            b = blobs[-1]; b['y_bot'] = max(b['y_bot'], c[1]); b['x_l'] = min(b['x_l'], c[2]); b['x_r'] = max(b['x_r'], c[3]); b['area'] += c[4]
        else:
            blobs.append(dict(y_top=c[0], y_bot=c[1], x_l=c[2], x_r=c[3], area=c[4]))
    for b in blobs: b['cx'] = (b['x_l'] + b['x_r']) / 2; b['cy'] = (b['y_top'] + b['y_bot']) / 2
    # open circle scan
    YY, XX = np.mgrid[y0 + r:y1 - r:0.5, pxs - 8:pxs + 8.01:0.5].astype(np.float32)
    C = np.zeros(XX.shape, np.float32); I = np.zeros(XX.shape, np.float32)
    for u, v in zip(ox, oy): C += (map_coordinates(D, [YY + v, XX + u], order=1) > 127)
    for u, v in zip(ix, iy): I += map_coordinates(Dc, [YY + v, XX + u], order=1)
    C /= len(ox); I /= len(ix)
    ok = (C >= 0.9) & (I < 50)
    circ = None
    if ok.any():
        sc = np.where(ok, C * 100 - I / 10, -1e9)
        j, i = np.unravel_index(np.argmax(sc), sc.shape)
        near = ok & (C >= C[j, i] - 0.03)
        spread = float(np.hypot(XX[near] - XX[j, i], YY[near] - YY[j, i]).max())
        cx, cy = float(XX[j, i]), float(YY[j, i])
        # other separate open-circle candidates (> 10 px away)
        others = []
        for jj, ii in zip(*np.where(ok)):
            if math.hypot(XX[jj, ii] - cx, YY[jj, ii] - cy) > 10 and not any(math.hypot(XX[jj, ii] - o[0], YY[jj, ii] - o[1]) < 10 for o in others):
                others.append((float(XX[jj, ii]), float(YY[jj, ii]), float(C[jj, ii]), float(I[jj, ii])))
        # dot inside
        w = B[int(cy) - 6:int(cy) + 7, int(cx) - 6:int(cx) + 7]
        nn, ll, ss, cc = cv2.connectedComponentsWithStats(w, 8)
        dot = None
        for k in range(1, nn):
            if 3 <= ss[k][4] <= 40 and ss[k][2] <= 8 and ss[k][3] <= 8:
                dot = (int(cx) - 6 + cc[k][0], int(cy) - 6 + cc[k][1])
        circ = dict(px=cx, py=cy, cov=float(C[j, i]), inner=float(I[j, i]), spread=spread, dot=dot, others=others)
    rec = dict(station=st, px_station=pxs, blobs=blobs, circle=circ)
    for b in blobs:
        b['Y_top'] = data(b['cx'], b['y_top'])[1]; b['Y_bot'] = data(b['cx'], b['y_bot'])[1]; b['Y_c'] = data(b['cx'], (b['y_top'] + b['y_bot']) / 2)[1]
    if circ:
        circ['X'], circ['Y'] = data(circ['px'], circ['py'])
        if circ['dot']: circ['Xd'], circ['Yd'] = data(*circ['dot'])
    out.append(rec)
    s = f"st {st:5.2f} px {pxs:7.1f}: blobs " + "; ".join(f"y {b['y_top']}-{b['y_bot']} (Y {b['Y_top']:+.4f}..{b['Y_bot']:+.4f}) x {b['x_l']}-{b['x_r']}" for b in blobs)
    if circ: s += f" | circle ({circ['px']:.1f},{circ['py']:.1f}) cov {circ['cov']:.2f} inner {circ['inner']:.0f} spread {circ['spread']:.1f} dot {circ['dot']} Y {circ['Y']:+.4f} others {[(round(o[0]),round(o[1])) for o in circ['others']]}"
    print(s)
    # tile
    k = 4; ty0 = y0; ty1 = y1
    crop = g[ty0:ty1, xa:xb]
    im = Image.fromarray(crop.astype(np.uint8)).convert('RGB').resize(((xb - xa) * k, (ty1 - ty0) * k), Image.NEAREST); d = ImageDraw.Draw(im)
    for b in blobs: d.rectangle([(b['x_l'] - xa) * k, (b['y_top'] - ty0) * k, (b['x_r'] - xa) * k, (b['y_bot'] - ty0) * k], outline=(0, 160, 0))
    if circ: d.ellipse([(circ['px'] - xa - r) * k, (circ['py'] - ty0 - r) * k, (circ['px'] - xa + r) * k, (circ['py'] - ty0 + r) * k], outline=(255, 0, 0))
    d.text((2, 2), f"{st}", fill=(0, 0, 255)); tiles.append(im)
json.dump(out, open(outp + '.res.json', 'w'), indent=0, default=float)
W = sum(t.size[0] for t in tiles) + 6 * len(tiles); H = max(t.size[1] for t in tiles)
sheet = Image.new('RGB', (W, H), 'white'); x = 0
for t in tiles: sheet.paste(t, (x, 0)); x += t.size[0] + 6
sheet.save(outp + '_tiles.png')
