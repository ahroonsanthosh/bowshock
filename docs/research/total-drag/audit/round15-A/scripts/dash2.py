# Row-by-row ink presence along a traced near-vertical curve (A52 fig. 8), to read its dash pattern.
# usage: python3 -I dash2.py cfg.json curve_name [alpha_lo alpha_hi]
# Prints runs as ink length / gap length in render rows; rows inside a horizontal grid band shown as '|'.
import sys, json
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
import numpy as np
from readlib import Cal, load_gray
cfg = json.load(open(sys.argv[1])); name = sys.argv[2]
cal = Cal(cfg['cal']); g = load_gray(cfg['img'])
tr = json.load(open(cfg['trace_out']))[name]
S = np.array([p[0] for p in tr]); V = np.array([p[1] for p in tr])
lo = float(sys.argv[3]) if len(sys.argv) > 3 else S.min()
hi = float(sys.argv[4]) if len(sys.argv) > 4 else S.max()
step = abs(cal.v_per_px)
grid = cfg['grid_iso']
seq = []
s = lo
prevp = None
while s <= hi:
    v = float(np.interp(s, S, V))
    px, py = cal.to_px(v, s)
    dl = 1.0 if prevp is None else float(np.hypot(px - prevp[0], py - prevp[1]))
    prevp = (px, py)
    if any(abs(s - gv) / step <= 6 for gv in grid):
        seq.append(('|', dl))
    else:
        x = int(round(px)); y = int(round(py))
        seq.append(('#' if (g[y, x - 2:x + 3] < 128).sum() >= 2 else '.', dl))
    s += step
# compress
out = []
cur = seq[0][0]; n = 0.0
for ch, dl in seq:
    if ch == cur:
        n += dl
    else:
        out.append('%s%d' % (cur, round(n))); cur = ch; n = dl
out.append('%s%d' % (cur, round(n)))
print(name, ' '.join(out))
