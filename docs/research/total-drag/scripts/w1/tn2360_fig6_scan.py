"""Scan every station line of TN 2360 fig. 6 for circle and square symbols (first reading, W1); prints each found
symbol's x/c (station), Delta P_b (local interpolation between the fitted grid lines) and match score, and writes
an overlay with the found centres marked. Usage: python3 -I tn2360_fig6_scan.py IMGDIR PAGE PANEL."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cal import Cal, overlay
from sym import scan

IMG, PAGE, PANEL = sys.argv[1], int(sys.argv[2]), sys.argv[3]
G = {
    (24, 'plane'): ([(653, -0.10), (764, -0.05), (874, 0.0), (985, 0.05), (1096, 0.10)], 1307, 570, 1190),
    (24, 'cruciform'): ([(1430, -0.15), (1540, -0.10), (1651, -0.05), (1760, 0.0), (1873, 0.05), (1983, 0.10),
                         (2093, 0.15)], 1307, 1335, 2195),
}
hl, x0line, ylo, yhi = G[(PAGE, PANEL)]
vl = [(x0line + 111 * k, round(-0.2 * k, 1)) for k in range(-4, 5)]
img = '%s/tn2360-%d.png' % (IMG, PAGE)
c = Cal(img, hl, vl, list(range(790, 1840, 50)), list(range(ylo + 20, yhi - 10, 40)))
c.report('fig. 6 p%d %s' % (PAGE, PANEL))
a = np.array(Image.open(img).convert('L')).astype(int)
marks = []
stations = {val: (k, cc) for val, k, cc in c.v}
# the frame lines at x/c 1.0 and -1.0 carry symbols too: extrapolate one spacing
k8, c8 = stations[0.8]; k6, c6 = stations[0.6]
stations[1.0] = (2 * k8 - k6, 2 * c8 - c6)
km8, cm8 = stations[-0.8]; km6, cm6 = stations[-0.6]
stations[-1.0] = (2 * km8 - km6, 2 * cm8 - cm6)
for val in sorted(stations, reverse=True):
    k, cc = stations[val]
    for shape in ('circle', 'square'):
        for (y, x, s) in scan(a, lambda yy: k * yy + cc, ylo, yhi, shape, 21, thr=float(sys.argv[4]) if len(sys.argv) > 4 else 0.42):
            u, v = c.local(x, y)
            print('  x/c %5.1f  %-6s dPb %7.4f  (score %.2f, px %.1f %.1f, local x/c %.3f)' % (val, shape, v, s, x, y, u))
            marks.append((u, v, ('c' if shape == 'circle' else 's') + '%.0f' % (100 * s)))
overlay(c, img, (700, ylo - 20, 1900, yhi + 20), 0.8, '%s/ov_tn2360_%d_%s.png' % (IMG, PAGE, PANEL),
        [(round(0.2 * k, 1), True) for k in range(-5, 6)], [(round(0.01 * k, 2), k % 5 == 0) for k in range(-20, 21)],
        marks=marks)
