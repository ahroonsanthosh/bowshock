"""Read the faired Mach 2.41 curve at x/c = 1.0, 0.9, ..., 0.0 from the traced ink centres.
At each station the traced centres within +-R px (in the curve's running direction) of the
station's vertical gridline are fitted with a straight line or quadratic (y on x where the curve
is flat, x on y where it is steep) and intersected with that gridline's local position. The
gap is the distance from the station to the nearest traced centre on each side (ink hidden by
the gridline, a symbol or another line).
Usage: curve_stations.py calib.json out.json trace1.json [trace2.json ...]"""
import json
import sys
import numpy as np
sys.path.insert(0, __import__('os').path.dirname(__file__))
from mapping import Mapper

m = Mapper(sys.argv[1])
pts = []
for p in sys.argv[3:]:
    d = json.load(open(p))
    for q in d['pts']:
        pts.append((q[0], q[1]) if d['mode'] == 'col' else (q[1], q[0]))
P = np.array(sorted(pts))
out = []
for f in m.V:
    v = f['value']
    if v < -1e-9 or v > 1.0 + 1e-9:
        continue
    # approximate crossing: nearest traced point in x to the line
    xl = m.local(f, 1500)[0]
    d = np.abs(P[:, 0] - xl)
    if d.min() > 40:
        out.append(dict(station=v, note='no traced ink within 40 px'))
        continue
    best = None
    for R in (12, 20, 30):
        sel = np.abs(P[:, 0] - xl) <= R
        Q = P[sel]
        if len(Q) < 6:
            continue
        left = Q[Q[:, 0] < xl]
        right = Q[Q[:, 0] > xl]
        steep = np.ptp(Q[:, 1]) > np.ptp(Q[:, 0])
        deg = 2 if len(Q) >= 12 else 1
        if steep:
            c = np.polyfit(Q[:, 1], Q[:, 0], deg)
            # solve x(y) = Xline(y) by iteration
            y = np.mean(Q[:, 1])
            for _ in range(30):
                Xl = m.local(f, y)[0]
                # Newton on g(y) = x(y) - Xl
                g = np.polyval(c, y) - Xl
                dg = np.polyval(np.polyder(c), y)
                y = y - g / dg
            x = m.local(f, y)[0]
            r = Q[:, 0] - np.polyval(c, Q[:, 1])
        else:
            c = np.polyfit(Q[:, 0], Q[:, 1], deg)
            x = xl
            for _ in range(5):
                y = np.polyval(c, x)
                x = m.local(f, y)[0]
            y = float(np.polyval(c, x))
            r = Q[:, 1] - np.polyval(c, Q[:, 0])
        best = dict(station=v, px=float(x), py=float(y), R=R, n=int(len(Q)), deg=deg, steep=bool(steep),
                    rms=float(np.sqrt((r ** 2).mean())),
                    gap_left=float(xl - left[:, 0].max()) if len(left) else None,
                    gap_right=float(right[:, 0].min() - xl) if len(right) else None)
        if len(left) and len(right):
            break
    out.append(best)
for o in out:
    if o and 'px' in o:
        dd = m.to_data(o['px'], o['py'])
        o.update(x_c=dd['x_c'], y=dd['y'], sx=dd['sx'], sy=dd['sy'], cal_x_px=dd['cal_x_px'], cal_y_px=dd['cal_y_px'],
                 gx=dd['gx'], gy=dd['gy'])
        print(f"x/c {o['station']:.1f}: px ({o['px']:.2f}, {o['py']:.2f}) -> x/c {o['x_c']:.4f}, P_B {o['y']:.4f}  "
              f"n {o['n']} R {o['R']} deg {o['deg']} steep {o['steep']} rms {o['rms']:.2f} gaps L {o['gap_left']} R {o['gap_right']}")
    else:
        print(o)
json.dump(out, open(sys.argv[2], 'w'), indent=1)
