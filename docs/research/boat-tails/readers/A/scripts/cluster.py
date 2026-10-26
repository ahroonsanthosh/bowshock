"""Draw given circle/shape outlines on a zoomed crop for checking a cluster.
usage: python3 -I cluster.py LIB IMG ROT CX CY HALF SCALE OUT kind:h:x:y [...]"""
import sys
ns = {}
exec(open(sys.argv[1]).read(), ns)
import numpy as np, cv2
g = ns['load_gray'](sys.argv[2], int(sys.argv[3]))
cx, cy, half, sc = int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]), int(sys.argv[7])
out = sys.argv[8]
x0, y0 = cx - half, cy - half
crop = g[y0:y0 + 2 * half, x0:x0 + 2 * half].astype(np.uint8)
t = cv2.cvtColor(crop, cv2.COLOR_GRAY2BGR)
t = cv2.resize(t, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST)
cols = [(0, 0, 255), (0, 170, 0), (255, 0, 0), (200, 0, 200), (0, 140, 255), (160, 120, 0)]
for k, spec in enumerate(sys.argv[9:]):
    kind, h, x, y = spec.split(':')
    h, x, y = float(h), float(x), float(y)
    c = cols[k % len(cols)]
    X, Y = (x - x0 + 0.5) * sc, (y - y0 + 0.5) * sc
    if kind == 'circle':
        cv2.circle(t, (int(X * 16), int(Y * 16)), int(h * sc * 16), c, 1, cv2.LINE_AA, 4)
    cv2.drawMarker(t, (int(X), int(Y)), c, cv2.MARKER_CROSS, 10, 1)
    cv2.putText(t, str(k), (int(X) + 4, int(Y) - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, c, 1)
for v in range((x0 // 10 + 1) * 10, x0 + 2 * half, 10):
    cv2.putText(t, str(v), (int((v - x0) * sc), 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 0, 0), 1)
    cv2.line(t, (int((v - x0) * sc), 14), (int((v - x0) * sc), 22), (255, 0, 0), 1)
for v in range((y0 // 10 + 1) * 10, y0 + 2 * half, 10):
    cv2.putText(t, str(v), (2, int((v - y0) * sc)), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 200), 1)
cv2.imwrite(out, t)
