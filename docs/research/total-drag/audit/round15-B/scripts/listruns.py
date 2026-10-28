"""List ink runs along lines of constant X (or Y) for one calibrated panel.

usage: python3 -I listruns.py <render_dir> <cal_json> <panel> <fixed x|y> <start> <stop> <step>
          <var_lo> <var_hi> [thr] [wthr] [minlen_px]
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import calib, trace

rdir, calp, panel, fixed = sys.argv[1:5]
start, stop, step, lo, hi = map(float, sys.argv[5:10])
thr = float(sys.argv[10]) if len(sys.argv) > 10 else 110
wthr = float(sys.argv[11]) if len(sys.argv) > 11 else 140
minlen_px = float(sys.argv[12]) if len(sys.argv) > 12 else 4
C = json.load(open(calp))[panel]
g = calib.load_gray(os.path.join(rdir, C['img']))
cx, cy = C['cx'], C['cy']
sx, sy = C['stats']['sx'], C['stats']['sy']
pxstep = 0.5
vstep = pxstep / (sy if fixed == 'x' else sx)
minlen = int(round(minlen_px / pxstep))
v0 = start
while v0 <= stop + 1e-9:
    v, prof, p = trace.sample(g, cx, cy, fixed, v0, lo, hi, vstep)
    rr = trace.runs(v, prof, thr, wthr, minlen=minlen)
    s = '  '.join(f"{r['c']:+.4f}[{r['lo']:+.3f},{r['hi']:+.3f}]g{int(r['gmin'])}" for r in rr)
    print(f'{v0:.4f}: {s}')
    v0 = round(v0 + step, 6)
