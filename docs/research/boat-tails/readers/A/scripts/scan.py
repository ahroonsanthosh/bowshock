"""Find candidate symbols in a box by template matching.

usage: python3 -I scan.py LIB IMG ROT X0 Y0 X1 Y1 THR OUTPNG SPEC [SPEC ...]
SPEC = kind:h:t  (see symlib.template). LIB is the path of symlib.py.
Prints candidates (x, y, score) per spec and writes an overlay (2x) of the
box with each candidate marked and numbered, for review.
"""
import sys
ns = {}
exec(open(sys.argv[1]).read(), ns)
import numpy as np
import cv2

img, rot = sys.argv[2], int(sys.argv[3])
box = tuple(map(int, sys.argv[4:8]))
thr = float(sys.argv[8])
outpng = sys.argv[9]
specs = sys.argv[10:]
g0 = ns['load_gray'](img, rot)
g, _ = ns['remove_lines'](g0)
x0, y0, x1, y1 = box
ov = cv2.cvtColor(g0[y0:y1, x0:x1].astype(np.uint8), cv2.COLOR_GRAY2BGR)
S = 2
ov = cv2.resize(ov, None, fx=S, fy=S, interpolation=cv2.INTER_NEAREST)
cols = [(0, 0, 255), (0, 160, 0), (255, 0, 0), (200, 0, 200), (0, 140, 255), (128, 128, 0)]
k = 0
for si, sp in enumerate(specs):
    kind, h, t = sp.split(':')
    tpl = ns['template'](kind, float(h), float(t))
    cands = ns['scan'](g, tpl, box, thr)
    cands.sort(key=lambda c: (c[0], c[1]))
    print('##', sp, len(cands))
    for (x, y, s) in cands:
        xc, yc, s2, edge = ns['match_near'](g, tpl, x, y, 3)
        k += 1
        print('%3d %-12s x=%8.2f y=%8.2f score=%.3f' % (k, kind, xc, yc, s2))
        c = cols[si % len(cols)]
        X, Y = int((xc - x0) * S), int((yc - y0) * S)
        cv2.drawMarker(ov, (X, Y), c, cv2.MARKER_CROSS, 10, 1)
        cv2.putText(ov, str(k), (X + 6 + 10 * si, Y - 6 - 10 * si), cv2.FONT_HERSHEY_SIMPLEX, 0.5, c, 1)
cv2.imwrite(outpng, ov)
