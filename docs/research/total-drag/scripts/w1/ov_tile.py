"""Zoomed overlay tile of TN 2360 fig. 6 (first reading, W1): data ticks every 0.005 in Delta P_b (labels every
0.01), station ticks, and numbered candidate centres from the template scan, for identification by eye.
Usage: python3 -I ov_tile.py IMGDIR PAGE PANEL X0 X1 YLO YHI SCALE OUT THR"""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cal import Cal, overlay
from sym import scan
IMG, PAGE, PANEL = sys.argv[1], int(sys.argv[2]), sys.argv[3]
X0, X1, YLO, YHI = map(int, sys.argv[4:8]); S = float(sys.argv[8]); OUT = sys.argv[9]; THR = float(sys.argv[10])
exec(open(__file__.rsplit('/', 1)[0] + '/fig6_grids.py').read())
hl, x0line, ylo, yhi, spacing = G[(PAGE, PANEL)]
vl = [(x0line + spacing * k, round(-0.2 * k, 1)) for k in range(-4, 5)]
img = '%s/tn2360-%d.png' % (IMG, PAGE)
c = Cal(img, hl, vl, list(range(640, 1950, 50)), list(range(ylo + 20, yhi - 10, 40)))
a = np.array(Image.open(img).convert('L')).astype(int)
st = {val: (k, cc) for val, k, cc in c.v}
k8, c8 = st[0.8]; k6, c6 = st[0.6]; st[1.0] = (2 * k8 - k6, 2 * c8 - c6)
marks = []; n = 0
for val in sorted(st, reverse=True):
    k, cc = st[val]
    x_mid = k * (0.5 * (YLO + YHI)) + cc
    if not (X0 < x_mid < X1):
        continue
    found = []
    for shape in ('circle', 'square'):
        for (y, x, s) in scan(a, lambda yy: k * yy + cc, YLO, YHI, shape, 21, thr=THR):
            found.append((y, x, s, shape))
    found.sort()
    merged = []
    for f in found:
        if merged and abs(f[0] - merged[-1][0]) < 4:
            if f[2] > merged[-1][2]:
                merged[-1] = f
            continue
        merged.append(f)
    for (y, x, s, shape) in merged:
        n += 1
        u, v = c.local(x, y)
        print('  #%d  x/c %4.1f  dPb %7.4f  (%s %.2f, px %.1f %.1f)' % (n, val, v, shape, s, x, y))
        marks.append((u, v, '%d' % n))
overlay(c, img, (X0, YLO, X1, YHI), S, OUT, [(round(0.2 * k, 1), True) for k in range(-5, 6)],
        [(round(0.005 * k, 3), k % 2 == 0) for k in range(-50, 51)], marks=marks)
