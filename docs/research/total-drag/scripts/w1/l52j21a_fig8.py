"""NACA RM L52J21a fig. 8 (PDF p. 28, 300 dpi greyscale), panel R = 8.06e6, cylindrical base: P_B of the finned
body (fin-supported) at M 1.62, 1.93, 2.41 for the conical (circle), ogive (square) and radome (diamond) noses.
FIRST READING (W1), used only to turn fig. 38's Delta P_B into a factor; the conical base's symbols (the lower
curves) are read too, recorded and not used. Grid: P_B every 0.02 (-0.20 at y 2023,
61.7 px per 0.02), M every 0.1 (M 1.6 at x 1133, 61.8 px per 0.1). Symbols sym.find from points by eye.
Usage: python3 -I l52j21a_fig8.py IMGDIR."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cal import Cal
from sym import find
IMG = sys.argv[1]
img = '%s/l52j-28.png' % IMG
c = Cal(img, [(2023 + 61.7 * k, round(-0.20 + 0.02 * k, 2)) for k in range(10)],
        [(1133 + 61.8 * k, round(1.6 + 0.1 * k, 1)) for k in range(10)], list(range(1090, 1800, 30)),
        list(range(2040, 2600, 30)))
c.report('fig. 8 (R 8.06e6, right panel)')
a = np.array(Image.open(img).convert('L')).astype(int)
for shape, x, y in [('square', 1143, 2147), ('circle', 1143, 2183), ('diamond', 1143, 2183),
                    ('square', 1336, 2170), ('circle', 1336, 2190), ('diamond', 1336, 2195),
                    ('square', 1629, 2280), ('circle', 1629, 2295), ('diamond', 1629, 2305)]:
    xf, yf, s = find(a, x, y, shape, 20, R=8)
    u, v = c.local(xf, yf)
    print('%-8s M %.3f  P_B %.4f  (score %.2f, px %.1f %.1f)' % (shape, u, v, s, xf, yf))
print('conical base (the lower curves of the same panel): recorded, not used')
for shape, x, y in [('square', 1336, 2436), ('circle', 1336, 2446), ('diamond', 1336, 2452),
                    ('square', 1629, 2440), ('circle', 1629, 2450), ('diamond', 1629, 2455),
                    ('circle', 1143, 2530), ('square', 1143, 2535)]:
    xf, yf, s = find(a, x, y, shape, 20, R=8)
    u, v = c.local(xf, yf)
    print('%-8s M %.3f  P_B %.4f  (score %.2f, px %.1f %.1f)' % (shape, u, v, s, xf, yf))
