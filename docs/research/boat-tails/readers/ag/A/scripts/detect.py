# usage: python3 -I detect.py <cal.out.json> <x0> <y0> <x1> <y1> <out_prefix> [smin=14] [smax=60] [dark=150] [linelen=45] [scale=2]
# Finds candidate plotted symbols inside the region: thresholds the page, removes long horizontal and
# vertical strokes (gridlines, axes, step lines) by morphological opening, labels connected components
# whose bounding box is symbol sized, and reports for each its bbox, bbox centre, dark-pixel centroid
# and the data coordinates of the bbox centre from the affine calibration. Writes an annotated,
# enlarged crop <out_prefix>.png with ids, and <out_prefix>.json.
import sys, json
import numpy as np, cv2
from PIL import Image, ImageDraw
cal = json.load(open(sys.argv[1])); x0, y0, x1, y1 = map(int, sys.argv[2:6]); outp = sys.argv[6]
smin = int(sys.argv[7]) if len(sys.argv) > 7 else 14; smax = int(sys.argv[8]) if len(sys.argv) > 8 else 60
dk = int(sys.argv[9]) if len(sys.argv) > 9 else 150; L = int(sys.argv[10]) if len(sys.argv) > 10 else 45
sc = float(sys.argv[11]) if len(sys.argv) > 11 else 2
g = np.asarray(Image.open(cal['spec']['png']).convert('L'))
sub = g[y0:y1, x0:x1]
b = (sub < dk).astype(np.uint8)
hl = cv2.morphologyEx(b, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (L, 1)))
vl = cv2.morphologyEx(b, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, L)))
lines = cv2.dilate(hl | vl, np.ones((3, 3), np.uint8))
rem = b & (1 - lines)
n, lab, st, cen = cv2.connectedComponentsWithStats(rem, 8)
ax, ay = cal['ax'], cal['ay']
def data(px, py):
    X = ax[0] + ax[1] * px + ax[2] * py; Y = ay[0] + ay[1] * px + ay[2] * py
    if cal['spec'].get('xscale') == 'log': X = 10 ** X
    if cal['spec'].get('yscale') == 'log': Y = 10 ** Y
    return X, Y
res = []
for i in range(1, n):
    x, y, w, h, a = st[i]
    if not (smin <= max(w, h) <= smax and min(w, h) >= smin * 0.5): continue
    ys, xs = np.where(lab == i)
    bx = x0 + x + (w - 1) / 2; by = y0 + y + (h - 1) / 2
    X, Y = data(bx, by)
    res.append(dict(id=len(res), bbox=[int(x0 + x), int(y0 + y), int(w), int(h)], area=int(a), fill=round(a / (w * h), 2),
                    cbox=[round(float(bx), 2), round(float(by), 2)], cmass=[round(float(x0 + xs.mean()), 2), round(float(y0 + ys.mean()), 2)],
                    X=round(float(X), 5), Y=round(float(Y), 5)))
im = Image.fromarray(np.stack([sub] * 3, -1)).resize((int((x1 - x0) * sc), int((y1 - y0) * sc)), Image.LANCZOS)
d = ImageDraw.Draw(im)
for r in res:
    x, y, w, h = r['bbox']
    d.rectangle([(x - x0) * sc, (y - y0) * sc, (x - x0 + w) * sc, (y - y0 + h) * sc], outline=(255, 0, 0))
    d.text(((x - x0 + w) * sc + 2, (y - y0) * sc - 4), str(r['id']), fill=(220, 0, 0))
im.save(outp + '.png'); json.dump(res, open(outp + '.json', 'w'), indent=0)
for r in res:
    print(r['id'], 'bbox', r['bbox'], 'area', r['area'], 'fill', r['fill'], 'cbox', r['cbox'], 'cmass', r['cmass'], '-> X %.4f Y %.4f' % (r['X'], r['Y']))
