# Dash pattern of each traced curve: lengths (render px along the curve) of inked stretches and gaps.
# usage: python3 -I dashes.py cfg.json
# Gaps that coincide with a horizontal grid band (A52) are marked G; real gaps by their length.
import sys, json
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
import numpy as np
from readlib import Cal
cfg = json.load(open(sys.argv[1]))
cal = Cal(cfg['cal'])
tr = json.load(open(cfg['trace_out']))
orient = cfg['orient']
step = cal.u_per_px if orient == 'u' else abs(cal.v_per_px)
grid = cfg.get('grid_iso', []); band = cfg.get('grid_halfband_px', 6)
for name, pts in tr.items():
    if not pts:
        continue
    out = []
    seg_len = 0.0
    prev = None
    for p in pts:
        s, d = p[0], p[1]
        px = cal.to_px(s, d) if orient == 'u' else cal.to_px(d, s)
        if prev is not None:
            ds = (s - prev[0]) / step
            dist = float(np.hypot(px[0] - prev[1][0], px[1] - prev[1][1]))
            if ds > 1.5:
                gb = any(abs(gv - (s + prev[0]) / 2) / step <= band + ds / 2 and min(abs(gv - s), abs(gv - prev[0])) / step <= band + 2 for gv in grid)
                out.append('%d' % round(seg_len))
                out.append('(%s%d)' % ('G' if gb else '', round(dist)))
                seg_len = 0.0
            else:
                seg_len += dist
        prev = (s, px)
    out.append('%d' % round(seg_len))
    print(name, ' '.join(out))
