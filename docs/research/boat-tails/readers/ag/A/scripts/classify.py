# usage: python3 -I classify.py <png> <colscan.json> <out.json> [r_c=9.6] [h_s=8.5] [h_d=12]
# Clusters column-scan candidates (any shape) within 5 px into symbol locations, then classifies each by
# darkness at shape-specific probe points around the cluster centre (best of +-2 px shifts):
#  circle  : 8 points on radius r_c at 22.5+45k deg (between square corners and diamond tips)
#  square  : 4 corners (+-h_s, +-h_s)
#  diamond : 4 tips (0, +-h_d), (+-h_d, 0)
# score = mean darkness of the shape's own probes minus the mean of the other shapes' probes.
import sys, json, math
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates
a = sys.argv
g = np.asarray(Image.open(a[1]).convert('L')).astype(np.float32); D = 255 - g
import cv2
_B = (g < 160).astype(np.uint8)
_hl = cv2.morphologyEx(_B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (61, 1)))
_vl = cv2.morphologyEx(_B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 61)))
D = D * (1 - (cv2.dilate(_hl | _vl, np.ones((3, 3), np.uint8)) > 0)).astype(np.float32)
C = json.load(open(a[2])); out = a[3]
rc = float(a[4]) if len(a) > 4 else 9.6; hs = float(a[5]) if len(a) > 5 else 8.5; hd = float(a[6]) if len(a) > 6 else 12
pr = {'circle': [(rc * math.cos(math.radians(22.5 + 45 * k)), rc * math.sin(math.radians(22.5 + 45 * k))) for k in range(8)],
      'square': [(sx * hs, sy * hs) for sx in (-1, 1) for sy in (-1, 1)],
      'diamond': [(hd, 0), (-hd, 0), (hd * 0.5, hd * 0.5), (-hd * 0.5, hd * 0.5), (hd * 0.5, -hd * 0.5), (-hd * 0.5, -hd * 0.5)]}
cl = []
for c in sorted(C, key=lambda c: -c['cov']):
    for k in cl:
        if abs(k['mach'] - c['mach']) < 1e-6 and math.hypot(k['x'] - c['x'], k['y'] - c['y']) < 5: k['m'].append(c); break
    else: cl.append(dict(mach=c['mach'], x=c['x'], y=c['y'], m=[c]))
res = []
for k in cl:
    best = None
    for dx in np.arange(-2, 2.01, 0.5):
        for dy in np.arange(-2, 2.01, 0.5):
            v = {s: np.mean([map_coordinates(D, [[k['y'] + dy + p[1]], [k['x'] + dx + p[0]]], order=1)[0] for p in P]) for s, P in pr.items()}
            for s in v:
                sc = v[s] - np.mean([v[o] for o in v if o != s])
                if best is None or sc > best[0]: best = (sc, s, k['x'] + dx, k['y'] + dy, v)
    sc, s, x, y, v = best
    res.append(dict(mach=k['mach'], shape=s, x=float(x), y=float(y), score=round(float(sc), 1), probes={q: round(float(w), 1) for q, w in v.items()}, n=len(k['m'])))
res.sort(key=lambda r: (r['mach'], r['y']))
json.dump(res, open(out, 'w'), indent=0)
for r in res: print(f"M {r['mach']:.2f} {r['shape']:>7} ({r['x']:.1f},{r['y']:.1f}) score {r['score']:6.1f} probes {r['probes']}")
