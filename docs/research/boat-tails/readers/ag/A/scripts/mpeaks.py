# usage: python3 -I mpeaks.py <png> <tx> <ty> <r> <x0> <y0> <x1> <y1> <thr> <out.png> [nms=4] [tcx tcy]
# Template = page darkness in a (2r+1)^2 window centred on (tcx,tcy) (default tx,ty) of a clean symbol.
# Lists all local maxima of normalised cross-correlation above thr inside the region (NMS radius nms px),
# with sub-pixel centres, and writes an enlarged overlay with each peak marked and numbered.
import sys
import numpy as np, cv2
from PIL import Image, ImageDraw
a = sys.argv
g = np.asarray(Image.open(a[1]).convert('L')).astype(np.float32); D = 255 - g
tx, ty = float(a[2]), float(a[3]); r = int(a[4]); x0, y0, x1, y1 = map(int, a[5:9]); thr = float(a[9]); out = a[10]
nms = int(a[11]) if len(a) > 11 else 4
if len(a) > 13: tx, ty = float(a[12]), float(a[13])
M = np.float32([[1, 0, -(tx - r)], [0, 1, -(ty - r)]])
T = cv2.warpAffine(D, M, (2 * r + 1, 2 * r + 1), flags=cv2.INTER_LINEAR)
W = D[y0 - r:y1 + r + 1, x0 - r:x1 + r + 1]
R = cv2.matchTemplate(W, T, cv2.TM_CCOEFF_NORMED)
pk = []
Rd = cv2.dilate(R, np.ones((2 * nms + 1, 2 * nms + 1), np.uint8))
ys, xs = np.where((R >= Rd) & (R > thr))
for j, i in zip(ys, xs):
    def para(p, q, s):
        d = p - 2 * q + s; return 0.0 if d == 0 else 0.5 * (p - s) / d
    di = para(R[j, i - 1], R[j, i], R[j, i + 1]) if 0 < i < R.shape[1] - 1 else 0
    dj = para(R[j - 1, i], R[j, i], R[j + 1, i]) if 0 < j < R.shape[0] - 1 else 0
    pk.append((float(R[j, i]), x0 + i + di, y0 + j + dj))
pk.sort(key=lambda p: (p[2], p[1]))
sc = 6
im = Image.fromarray(np.clip(g[y0 - r:y1 + r + 1, x0 - r:x1 + r + 1], 0, 255).astype(np.uint8)).convert('RGB')
im = im.resize((im.size[0] * sc, im.size[1] * sc), Image.LANCZOS); d = ImageDraw.Draw(im)
cols = [(255, 0, 0), (0, 150, 0), (0, 0, 255), (200, 0, 200), (0, 150, 150), (200, 120, 0)]
for k, (s, x, y) in enumerate(pk):
    X = (x - x0 + r) * sc; Y = (y - y0 + r) * sc; c = cols[k % len(cols)]
    d.line([(X - 8, Y), (X + 8, Y)], fill=c, width=2); d.line([(X, Y - 8), (X, Y + 8)], fill=c, width=2)
    d.text((X + 10, Y - 6), str(k), fill=c)
    print(f"peak {k}: ({x:.2f},{y:.2f}) score {s:.3f}")
im.save(out)
