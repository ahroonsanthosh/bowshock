"""NACA RM L52J21a figs. 31 to 33 (PDF pp. 58 to 60, 300 dpi greyscale), panel (d), cylindrical base: P_B of the
unfinned body (sting-supported) against R at M 1.62, 1.93 and 2.41, for the conical (square), ogive (triangle) and
radome (circle) noses. FIRST READING (W1, for the zero member: fig. 8's finned P_B minus these at R = 8.06e6, as
fig. 38 is formed, RM L52J21a p. 17). Read: every symbol at R 7.0 to 9.5 x 10^6, the plateau around R = 8.06e6.
Grid lines found as dark-row and dark-column peaks; values from the printed labels (checked on axis strips): P_B
every 0.02, R every 1e6. Symbols: sym.find (20 px templates) from points picked by eye on 3x overlays; a triangle's
value is taken one third of its height above its base (0008's rule), 2 px below the template centre. The symbols
overlap in pairs and the template scores are low (0.2 to 0.6): error +-0.002. Used as a check of fig. 38(c) only
(0015 section 7), not to set a band. Usage: python3 -I l52j21a_fig31_33d.py IMGDIR [OUTDIR for overlays]."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cal import Cal, overlay
from sym import find
IMG = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else None
MAKE_OVERLAY = OUT is not None

PANELS = {
    # page: (M, hlines [(y, P_B)], vlines [(x, R/1e6)], htilt, picks [(shape, x, y)])
    '58': (1.62, [(1700 + 66.7 * k, round(-0.18 + 0.02 * k, 2)) for k in range(10)],
           [(1081 + 66.0 * k, k) for k in range(11)], 0.015, []),
    '59': (1.93, [(1686, -0.18), (1753, -0.16), (1823, -0.14), (1894, -0.12), (1963, -0.10), (2029, -0.08),
                  (2097, -0.06), (2166, -0.04), (2235, -0.02), (2306, 0.0)],
           [(1246 + 68.4 * k, k) for k in range(10)], 0.0, []),
    '60': (2.41, [(1744, -0.12), (1813, -0.10), (1879, -0.08), (1943, -0.06), (2011, -0.04), (2079, -0.02),
                  (2146, 0.0), (2210, 0.02), (2277, 0.04)],
           [(1079, 0), (1144, 1), (1211, 2), (1277, 3), (1344, 4), (1410, 5), (1475, 6), (1543, 7), (1611, 8)], 0.0,
           []),
}
# Points picked by eye on the overlays (page: [(shape, x, y)]); squares conical, triangles ogive, circles radome.
PICKS = {
    '58': [('triangle', 1566, 1808), ('square', 1592, 1810), ('triangle', 1619, 1811), ('square', 1670, 1814),
           ('circle', 1556, 1856), ('circle', 1621, 1863), ('circle', 1677, 1862)],
    '59': [('square', 1749, 1792), ('triangle', 1744, 1783), ('square', 1797, 1792), ('triangle', 1806, 1786),
           ('square', 1865, 1791), ('triangle', 1861, 1794), ('circle', 1752, 1831), ('circle', 1808, 1832),
           ('circle', 1867, 1826)],
    '60': [('triangle', 1555, 1732), ('triangle', 1580, 1737), ('square', 1583, 1752), ('square', 1551, 1750),
           ('circle', 1568, 1765), ('circle', 1583, 1753), ('square', 1623, 1747), ('triangle', 1623, 1745),
           ('circle', 1620, 1773)],
}
NOSE = {'square': 'conical', 'triangle': 'ogive', 'circle': 'radome'}
for page, (M, hl, vl, tilt, _) in PANELS.items():
    img = '%s/l52j-%s.png' % (IMG, page)
    c = Cal(img, hl, vl, list(range(1120, 1850, 40)), list(range(1720, 2250, 40)), htilt=tilt, xref=1100)
    c.report('fig. %s(d), M %.2f' % ({'58': 31, '59': 32, '60': 33}[page], M))
    if MAKE_OVERLAY:
        x7, _ = c.pix(6.8, -0.1)
        x95, _ = c.pix(9.6, -0.1)
        _, ytop = c.pix(8, -0.175 if M < 2 else -0.135)
        _, ybot = c.pix(8, -0.12 if M < 2 else -0.095)
        overlay(c, img, (int(x7), int(ytop), int(x95), int(ybot)), 3.0, '%s/fig%sd.png' % (OUT, page),
                [(r / 10, r % 10 == 0) for r in range(68, 97, 2)],
                [(round(v, 3), abs(v * 100 - round(v * 100)) < 1e-9) for v in np.arange(-0.18, -0.09, 0.002)])
        print('overlay box', int(x7), int(ytop), int(x95), int(ybot))
    a = np.array(Image.open(img).convert('L')).astype(int)
    for shape, x, y in PICKS.get(page, []):
        xf, yf, s = find(a, x, y, shape, 20, R=8)
        u, v = c.local(xf, yf + (2 if shape == 'triangle' else 0))
        print('  %-8s %-7s R %.2f  P_B %.4f  (score %.2f, px %.1f %.1f)' % (shape, NOSE[shape], u, v, s, xf, yf))
