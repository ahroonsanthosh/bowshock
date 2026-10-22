"""NACA TN 3819 (Love 1957; NTRS 19930084517) PDF p. 65 (report p. 63), 300 dpi greyscale, landscape: fig. 33 (P_B
against fin t/c in percent at x/c = 0, zero sweep; circles M 1.50 ref. 26, squares M 2.00 ref. 26, diamonds M
2.41 Langley 9 in) and fig. 34 (the NACA RM-10, t/c 0.10, 60 deg sweep; circles with fins, squares without, ref. 36,
against M). FIRST READING (W1). Grid: P_B every 0.02 (both figures share the rows, -0.36 to -0.12 on fig. 33 and
-0.24 to 0 on fig. 34), t/c every 2% (fig. 33), M every 0.1 (fig. 34). Calibration cal.py; symbols sym.find from
starting points placed by eye on 0.6x crops. Usage: python3 -I tn3819_fig33_34.py IMGDIR."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cal import Cal
from sym import find
IMG = sys.argv[1]
img = '%s/tn3819-65.png' % IMG
a = np.array(Image.open(img).convert('L')).astype(int)
rows = [474 + 95.6 * k for k in range(13)]
c33 = Cal(img, [(y, round(-0.36 + 0.02 * k, 2)) for k, y in enumerate(rows)],
          [(700 + 95.3 * k, 2.0 * k) for k in range(7)], list(range(720, 1260, 30)), list(range(500, 1600, 40)))
c33.report('fig. 33')
c34 = Cal(img, [(y, round(-0.24 + 0.02 * k, 2)) for k, y in enumerate(rows)],
          [(1650 + 95.9 * k, round(1.4 + 0.1 * k, 1)) for k in range(9)], list(range(1670, 2400, 30)),
          list(range(500, 1600, 40)))
c34.report('fig. 34')
p = lambda X, Y: (1600 + X / 0.6, 400 + Y / 0.6)
S = [
    ('33', 'M 1.50 circle', 'circle', (700, 1265)), ('33', 'M 1.50 circle', 'circle', (933, 903)),
    ('33', 'M 1.50 circle', 'circle', (1175, 638)),
    ('33', 'M 2.00 square', 'square', (700, 1475)), ('33', 'M 2.00 square', 'square', (933, 1312)),
    ('33', 'M 2.00 square', 'square', (1175, 1195)),
    ('33', 'M 2.41 diamond', 'diamond', (700, 1615)), ('33', 'M 2.41 diamond', 'diamond', (1175, 1405)),
    ('34', 'with fins', 'circle', p(84, 408)), ('34', 'with fins', 'circle', p(142, 419)),
    ('34', 'with fins', 'circle', p(249, 422)), ('34', 'with fins', 'circle', p(363, 428)),
    ('34', 'without fins', 'square', p(84, 468)), ('34', 'without fins', 'square', p(141, 457)),
    ('34', 'without fins', 'square', p(248, 467)), ('34', 'without fins', 'square', p(363, 466)),
]
print('fig,series,abscissa,PB,score,px,py')
for fig, series, shape, (x, y) in S:
    c = c33 if fig == '33' else c34
    xf, yf, s = find(a, x, y, shape, 24, R=8)
    u, v = c.local(xf, yf)
    print('%s,%s,%.3f,%.4f,%.2f,%.1f,%.1f' % (fig, series, u, v, s, xf, yf))
