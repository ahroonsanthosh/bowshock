# usage: python3 -I ycal.py <cal.out.json> <out.json> "px,py,val;px,py,val;..."
# Replaces the y calibration of an existing calibration by a least-squares plane fit through gridline
# points measured by hand (vertical grey profiles across each labelled gridline at given x); keeps x.
import sys, json
import numpy as np
c = json.load(open(sys.argv[1])); pts = np.array([[float(v) for v in p.split(',')] for p in sys.argv[3].split(';')])
A = np.vstack([np.ones(len(pts)), pts[:, 0], pts[:, 1]]).T
cy, *_ = np.linalg.lstsq(A, pts[:, 2], rcond=None); r = pts[:, 2] - A @ cy
c['ay'] = list(cy); c['res_y'] = list(r); c['rms_y'] = float(np.sqrt((r ** 2).mean())); c['sy'] = float(np.hypot(cy[1], cy[2]))
c['ticks_y'] = [[float(v), f"({px:.0f},{py:.1f})", float(rr)] for (px, py, v), rr in zip(pts, r)]
c['note'] = 'y calibration from hand-measured gridline crossings: ' + sys.argv[3]
json.dump(c, open(sys.argv[2], 'w'), indent=1)
print('Y = %.6g + %.6g*px + %.6g*py; residual rms %.2g max %.2g' % (cy[0], cy[1], cy[2], c['rms_y'], abs(r).max()))
