"""NACA TN 2360 fig. 6 (PDF pp. 24, 25; 300 dpi greyscale): FIRST READING for W1 of the symbols at x/c = 1.0 to 0
(trailing edge at or ahead of the base). Each symbol: its station, shape (circle t/c 0.05, square t/c 0.10) and a
starting pixel (the template scan's candidate, or placed by eye on the 1.5x tiles where the scan missed it), refined
by sym.find (template match, +-6 px); Delta P_b by local interpolation between the fitted grid lines (cal.py).
Writes the rows as CSV to stdout. Usage: python3 -I tn2360_fig6_read.py IMGDIR."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cal import Cal
from sym import find
exec(open(__file__.rsplit('/', 1)[0] + '/fig6_grids.py').read())
IMG = sys.argv[1]
# (page, panel, station, shape, x, y, note)
S = [
    (24, 'plane', 1.0, 'square!', 752, 848.5, 'centre by eye (outline 843 to 858 px; the circle overlaps its lower edge), not refined'),
    (24, 'plane', 1.0, 'circle', 754, 862, ''),
    (24, 'plane', 0.8, 'square', 866, 848, ''),
    (24, 'plane', 0.6, 'square', 980, 793, ''),
    (24, 'plane', 0.4, 'square', 1092, 781, 'a second outline 4 px above (two runs within 0.002)'),
    (24, 'plane', 0.4, 'circle', 1090, 850, ''),
    (24, 'plane', 0.2, 'square', 1205, 756, ''),
    (24, 'plane', 0.0, 'square', 1316, 724, ''),
    (24, 'plane', 0.0, 'circle', 1314, 801, ''),
    (24, 'cruciform', 1.0, 'circle', 748, 1774, ''),
    (24, 'cruciform', 1.0, 'square', 747, 1792, ''),
    (24, 'cruciform', 0.8, 'square', 859, 1765, 'no circle found at 0.8'),
    (24, 'cruciform', 0.6, 'square', 970, 1731, ''),
    (24, 'cruciform', 0.6, 'circle', 970, 1767, ''),
    (24, 'cruciform', 0.4, 'square', 1083, 1718, ''),
    (24, 'cruciform', 0.4, 'circle', 1083, 1747, ''),
    (24, 'cruciform', 0.2, 'square', 1196, 1628, ''),
    (24, 'cruciform', 0.2, 'circle', 1194, 1708, ''),
    (24, 'cruciform', 0.0, 'square', 1309, 1453, 'three squares stacked at x/c 0 (repeat runs)'),
    (24, 'cruciform', 0.0, 'square', 1309, 1473, ''),
    (24, 'cruciform', 0.0, 'square', 1309, 1494, ''),
    (24, 'cruciform', 0.0, 'circle', 1308, 1597, ''),
    (25, 'plane', 1.0, 'square', 596, 930, 'no circles on the M 2.0 plane panel'),
    (25, 'plane', 0.6, 'square', 870, 912, ''),
    (25, 'plane', 0.4, 'square', 1008, 881, ''),
    (25, 'plane', 0.2, 'square', 1152, 868, ''),
    (25, 'plane', 0.0, 'square', 1290, 860, ''),
    (25, 'cruciform', 1.0, 'square', 597, 1904, ''),
    (25, 'cruciform', 1.0, 'circle', 596, 1949, ''),
    (25, 'cruciform', 0.8, 'square', 734, 1896, ''),
    (25, 'cruciform', 0.6, 'square', 870, 1836, 'a second square about 0.004 lower, by eye'),
    (25, 'cruciform', 0.6, 'square', 871, 1846, 'the second square at 0.6, by eye'),
    (25, 'cruciform', 0.4, 'square', 1011, 1758, 'by eye'),
    (25, 'cruciform', 0.4, 'circle', 1012, 1870, ''),
    (25, 'cruciform', 0.2, 'square', 1151, 1754, ''),
    (25, 'cruciform', 0.2, 'square', 1150, 1774, ''),
    (25, 'cruciform', 0.0, 'square', 1288, 1757, 'three squares stacked at x/c 0, by eye for the top one'),
    (25, 'cruciform', 0.0, 'square', 1285, 1773, ''),
    (25, 'cruciform', 0.0, 'square', 1289, 1790, ''),
    (25, 'cruciform', 0.0, 'circle', 1289, 1845, 'by eye'),
]
cals = {}
print('page,panel,M,x_c,t_c,dPb,score,px,py,note')
for page, panel, st, shape, x, y, note in S:
    key = (page, panel)
    if key not in cals:
        hl, x0line, ylo, yhi, sp = G[key]
        vl = [(x0line + sp * k, round(-0.2 * k, 1)) for k in range(-4, 5)]
        img = '%s/tn2360-%d.png' % (IMG, page)
        cals[key] = (Cal(img, hl, vl, list(range(640, 1950, 50)), list(range(ylo + 20, yhi - 10, 40))),
                     np.array(Image.open(img).convert('L')).astype(int))
        cals[key][0].report('p%d %s' % key)
    c, a = cals[key]
    if shape.endswith('!'):
        shape = shape[:-1]; xf, yf, s = x, y, float('nan')
    else:
        xf, yf, s = find(a, x, y, shape, 21, R=6)
    u, v = c.local(xf, yf)
    print('%d,%s,%s,%.1f,%s,%.4f,%.2f,%.1f,%.1f,%s' % (page, panel, '1.5' if page == 24 else '2.0', st,
          '0.05' if shape == 'circle' else '0.10', v, s, xf, yf, note), file=sys.stdout)
    if abs(u - st) > 0.03:
        print('   WARNING station %.1f read at x/c %.3f' % (st, u))
