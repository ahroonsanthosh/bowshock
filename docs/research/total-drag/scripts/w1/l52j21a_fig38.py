"""NACA RM L52J21a (Love and O'Donnell 1952; NTRS 19930087533) fig. 38 (PDF p. 65, report p. 64; 300 dpi greyscale,
rotated 90 deg clockwise to upright): fin effect on base pressure, Delta P_B = P_B with fins minus P_B without,
against M, for the body with cylindrical centre section and various noses and bases. FIRST READING (W1) of panel
(c), R = 8.06e6, the bases with cylindrical afterbodies (right panel: cylindrical base, plain symbols; left panel:
boattail base, plain symbols); the flagged symbols (conical and cusp bases) are not read. Grid: Delta P_B every 0.02,
M every 0.1. Calibration cal.py; symbols sym.find from starting points by eye on 2.5x overlays.
Usage: python3 -I l52j21a_fig38.py IMGDIR MODE [ov|read]."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cal import Cal, overlay
from sym import find
IMG, MODE = sys.argv[1], sys.argv[2]
img = '%s/l52j-65r.png' % IMG
cR = Cal(img, [(1515, -0.02), (1589, 0.0), (1664, 0.02)], [(1694 + 75.25 * k, round(1.6 + 0.1 * k, 1)) for k in range(9)],
         list(range(1640, 2360, 30)), list(range(1450, 1730, 25)))
cL = Cal(img, [(1517, -0.02), (1590, 0.0), (1665, 0.02)], [(644 + 74.9 * k, round(1.5 + 0.1 * k, 1)) for k in range(10)],
         list(range(660, 1370, 30)), list(range(1450, 1730, 25)))
cR.report('fig. 38(c) right'); cL.report('fig. 38(c) left')
if MODE == 'ov':
    for c, nm in ((cR, 'R'), (cL, 'L')):
        x0, y0 = c.pix(1.52, -0.03); x1, y1 = c.pix(2.48, 0.025)
        overlay(c, img, (int(x0), int(y0), int(x1), int(y1)), 2.5, '%s/ov38%s.png' % (IMG, nm),
                [(round(1.5 + 0.1 * k, 1), True) for k in range(11)], [(round(-0.03 + 0.002 * k, 3), k % 5 == 0) for k in range(28)])
else:
    a = np.array(Image.open(img).convert('L')).astype(int)
    S = [l.split(';') for l in sys.argv[3:]]
    print('panel,series,shape,M,dPB,score,px,py')
    for panel, series, shape, x, y in S:
        c = cR if panel == 'R' else cL
        xf, yf, s = find(a, float(x), float(y), shape, 20, R=6)
        u, v = c.local(xf, yf)
        print('%s,%s,%s,%.3f,%.4f,%.2f,%.1f,%.1f' % (panel, series, shape, u, v, s, xf, yf))
