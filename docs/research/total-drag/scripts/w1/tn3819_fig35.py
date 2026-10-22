"""NACA TN 3819 fig. 35 (PDF p. 66, 300 dpi greyscale): FIRST READING for W1 of the free-flight line (ref. 12,
dash-dot) at M 1.40 to 1.85 -- a reading made after the round-3 values of this range had been seen in
src/base/tn3819-fig35.ts, so NOT BLIND. Calibration: cal.py on all grid lines (P_B every 0.02, M every 0.1; the
lines tilt about +9.4 px and lean about -14 px per 1000 px, given as starting slopes only). The line: in each pixel
column, the darkness-weighted centre of the dark run nearest the previous column's centre (dash gaps bridged by
carrying the last centre), started by eye at M 1.40; dots of the dash-dot pattern accepted. Usage:
python3 -I tn3819_fig35.py IMGDIR MODE (MODE ov: overlay for identification; read: the column trace)."""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from cal import Cal, overlay
IMG, MODE = sys.argv[1], sys.argv[2]
img = '%s/tn3819-66.png' % IMG
hl = [(1769.2 - 79.0 * k, round(-0.02 * k, 2)) for k in range(0, 19)]
vl = [(620.7 + 78.95 * (k - 1), round(1.0 + 0.1 * k, 1)) for k in range(1, 24)]
c = Cal(img, hl, vl, list(range(620, 2400, 40)), list(range(380, 1740, 40)), htilt=0.0094, vtilt=-0.014,
        xref=1510, yref=1050)
c.report('fig. 35')
if MODE == 'ov':
    x0, y0 = c.pix(1.38, -0.31); x1, y1 = c.pix(1.92, -0.21)
    overlay(c, img, (int(x0), int(y0), int(x1), int(y1)), 2.0, '%s/ov35.png' % IMG,
            [(round(1.4 + 0.05 * k, 2), k % 2 == 0) for k in range(11)],
            [(round(-0.31 + 0.005 * k, 3), k % 2 == 0) for k in range(21)])
else:
    a = np.array(Image.open(img).convert('L')).astype(float)
    m0 = float(sys.argv[3]); p0 = float(sys.argv[4]); m1 = float(sys.argv[5])
    x, y = c.pix(m0, p0)
    xe, _ = c.pix(m1, p0)
    yc = y
    out = []
    for xi in range(int(round(x)), int(round(xe)) + 1):
        col = a[int(yc) - 9:int(yc) + 10, xi]
        ys = np.arange(int(yc) - 9, int(yc) + 10)
        d = (220 - col).clip(0)
        if d.max() > 60:
            # the dark run containing the darkest pixel nearest yc
            k = int(np.argmax(d - 2.0 * np.abs(ys - yc)))
            lo = k
            while lo > 0 and d[lo - 1] > 30:
                lo -= 1
            hi = k
            while hi < len(d) - 1 and d[hi + 1] > 30:
                hi += 1
            if hi - lo <= 7:
                yc = float((d[lo:hi + 1] * ys[lo:hi + 1]).sum() / d[lo:hi + 1].sum())
                out.append((xi, yc, True))
                continue
        out.append((xi, yc, False))
    for mt in [round(m0 + 0.05 * k, 2) for k in range(int(round((m1 - m0) / 0.05)) + 1)]:
        xt, _ = c.pix(mt, p0)
        near = [(abs(xi - xt), xi, yy) for xi, yy, ok in out if ok and abs(xi - xt) <= 6]
        if not near:
            print('M %.2f: no dark pixel within 6 columns' % mt)
            continue
        vals = [c.local(xi, yy) for _, xi, yy in near]
        Ms = [v[0] for v in vals]; Ps = [v[1] for v in vals]
        k = np.polyfit(Ms, Ps, 1) if len(Ms) > 2 else None
        Pm = float(np.polyval(k, mt)) if k is not None else float(np.mean(Ps))
        print('M %.2f: P_B %.4f  (%d columns within 6 px, spread %.4f)' % (mt, Pm, len(near), max(Ps) - min(Ps)))
