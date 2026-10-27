"""Find small isolated dark dots (symbol centre dots) in a box.
usage: python3 -I dots.py LIB IMG ROT X0 Y0 X1 Y1 [THR] [OUTPNG]
Prints the weighted centroid, area and peak darkness of each component whose
bounding box is at most 6 x 6 px, after removal of long grid lines."""
import sys
ns = {}
exec(open(sys.argv[1]).read(), ns)
import numpy as np, cv2
g0 = ns['load_gray'](sys.argv[2], int(sys.argv[3]))
g, _ = ns['remove_lines'](g0)
x0, y0, x1, y1 = map(int, sys.argv[4:8])
thr = float(sys.argv[8]) if len(sys.argv) > 8 else 150
win = g[y0:y1, x0:x1]
bg = np.percentile(win, 70)
dark = (win < thr).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(dark, 8)
out = []
for k in range(1, n):
    x, y, w, h, a = st[k]
    if w <= 6 and h <= 6 and a >= 2:
        ys, xs = np.nonzero(lab == k)
        # weight over a 7x7 neighbourhood for sub-pixel centroid
        cx, cy = xs.mean(), ys.mean()
        X0, Y0 = int(cx) - 3, int(cy) - 3
        sub = np.clip(bg - win[Y0:Y0 + 7, X0:X0 + 7], 0, None)
        yy, xx = np.mgrid[0:sub.shape[0], 0:sub.shape[1]]
        mx = (xx * sub).sum() / sub.sum() + X0 + x0
        my = (yy * sub).sum() / sub.sum() + Y0 + y0
        out.append((mx, my, a, float(win[ys, xs].min())))
out.sort()
for i, (mx, my, a, mn) in enumerate(out):
    print('%3d dot x=%8.2f y=%8.2f area=%2d min=%3.0f' % (i, mx, my, a, mn))
if len(sys.argv) > 9:
    S = 3
    ov = cv2.cvtColor(g0[y0:y1, x0:x1].astype(np.uint8), cv2.COLOR_GRAY2BGR)
    ov = cv2.resize(ov, None, fx=S, fy=S, interpolation=cv2.INTER_NEAREST)
    for i, (mx, my, a, mn) in enumerate(out):
        X, Y = int((mx - x0 + 0.5) * S), int((my - y0 + 0.5) * S)
        cv2.drawMarker(ov, (X, Y), (0, 0, 255), cv2.MARKER_CROSS, 8, 1)
        cv2.putText(ov, str(i), (X + 5, Y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
    cv2.imwrite(sys.argv[9], ov)
