"""Draw a trace result for checking: raw ink, grid grey, assigned pixels per
curve in colour, guides as thin lines, readings as crosses.

usage: python3 -I check_overlay.py SCRIPTS_DIR SPEC.json TRACE_PREFIX OUT.png X0 Y0 X1 Y1 SCALE
"""
import sys
sys.path.insert(0, sys.argv[1])
import json
import numpy as np
from PIL import Image, ImageDraw
from common import load, grid_mask

spec = json.load(open(sys.argv[2]))
pref = sys.argv[3]
out = sys.argv[4]
x0, y0, x1, y1, sc = map(int, sys.argv[5:10])
ink, cal = load(spec['page'], spec['cal'], spec['panel'])
gm, _ = grid_mask(ink, cal)
res = json.load(open(pref + '.json'))
asg = np.load(pref + '_assign.npy')
RX0, RY0 = res['region'][0], res['region'][1]
cols = [(220, 0, 0), (0, 140, 0), (0, 0, 230), (200, 0, 200), (0, 150, 150), (230, 120, 0),
        (120, 60, 0), (90, 0, 160), (0, 90, 60)]
img = np.full((y1 - y0, x1 - x0, 3), 255, np.uint8)
sub = ink[y0:y1, x0:x1] == 1
img[sub] = (0, 0, 0)
img[sub & gm[y0:y1, x0:x1]] = (190, 190, 190)
A = np.zeros((y1 - y0, x1 - x0), np.int16)
ys, xs = np.nonzero(asg)
ys2, xs2 = ys + RY0, xs + RX0
m = (ys2 >= y0) & (ys2 < y1) & (xs2 >= x0) & (xs2 < x1)
A[ys2[m] - y0, xs2[m] - x0] = asg[ys[m], xs[m]]
for k in range(1, A.max() + 1):
    img[A == k] = cols[(k - 1) % len(cols)]
im = Image.fromarray(img).resize(((x1 - x0) * sc, (y1 - y0) * sc), Image.NEAREST)
d = ImageDraw.Draw(im)


def P(x, y):
    return ((x - x0 + 0.5) * sc, (y - y0 + 0.5) * sc)


for ci, c in enumerate(spec['curves']):
    col = cols[ci % len(cols)]
    g = [P(*p) for p in c['guide']]
    d.line(g, fill=tuple(int(v * 0.5 + 127) for v in col), width=1)
    d.text((g[0][0] + 4, g[0][1] - 10), c['name'], fill=col)
for ci, c in enumerate(res['curves']):
    if c.get('empty'):
        continue
    col = cols[ci % len(cols)]
    for r in c['readings']:
        if 'px' not in r:
            continue
        X, Y = P(*r['px'])
        d.line([(X - 5, Y), (X + 5, Y)], fill=(255, 140, 0) if r['mode'] != 'row' else (0, 0, 0), width=1)
        d.line([(X, Y - 5), (X, Y + 5)], fill=(255, 140, 0) if r['mode'] != 'row' else (0, 0, 0), width=1)
    for e in (c['start_px'], c['end_px']):
        X, Y = P(*e)
        d.ellipse([X - 6, Y - 6, X + 6, Y + 6], outline=col, width=2)
for x in range(x0 - x0 % 10, x1, 10):
    if x < x0:
        continue
    X = (x - x0) * sc
    L = 10 if x % 50 == 0 else 4
    d.line([(X, 0), (X, L)], fill=(255, 0, 0))
    if x % 50 == 0:
        d.text((X + 2, 10), str(x), fill=(255, 0, 0))
for y in range(y0 - y0 % 10, y1, 10):
    if y < y0:
        continue
    Y = (y - y0) * sc
    L = 10 if y % 50 == 0 else 4
    d.line([(0, Y), (L, Y)], fill=(0, 0, 255))
    if y % 50 == 0:
        d.text((12, Y + 1), str(y), fill=(0, 0, 255))
im.save(out)
print(out, im.size)
