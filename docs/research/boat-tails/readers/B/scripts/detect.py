"""Detect candidate symbols in a panel to seed the reading (verified by eye).
Usage: python3 -I detect.py SPEC.json PANEL OUTDIR kind:size[:filled] ... [--thr 0.75] [--box u0,v0,u1,v1]"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import figlib as fl
a = sys.argv[1:]
spec = json.load(open(a[0])); pname = a[1]; outdir = a[2]
thr = 0.75
box = None
kinds = []
i = 3
while i < len(a):
    if a[i] == '--thr':
        thr = float(a[i + 1]); i += 2
    elif a[i] == '--box':
        box = [int(x) for x in a[i + 1].split(',')]; i += 2
    else:
        kinds.append(a[i]); i += 1
img = fl.load_gray(spec['image'])
cal = json.load(open(os.path.join(outdir, f"{spec['name']}_{pname}_cal.json")))
panel = spec['panels'][pname]
grid = [dict(orient='h', a=h['a'], b=h['b']) for h in cal['hl']] + [dict(orient='v', a=v['a'], b=v['b']) for v in cal['vl']]
grid += panel.get('extra_lines', [])
if box is None:
    box = [panel['uspan'][0], panel['vspan'][0], panel['uspan'][1], panel['vspan'][1]]
f = fl.SymbolFitter(img, thr=spec.get('thr', 150), gridlines=grid, gridmask_halfwidth=panel.get('gridmask', 2.2),
                    extra_masks=panel.get('extra_masks', []), box=box)
f.method = 'dist'
for k in kinds:
    parts = k.split(':')
    kind, size = parts[0], float(parts[1])
    fil = len(parts) > 2 and parts[2] == 'filled'
    S = fl.score_map(f, kind, size, box, filled_sym=fil)
    for u, v, s in fl.peaks(S, box, thr):
        x, y = fl.apply_xform(cal, u, v)
        print(f"{k:14s} u {u:5d} v {v:5d} score {s:.3f}  x {x:.3f} y {y:.4f}")
