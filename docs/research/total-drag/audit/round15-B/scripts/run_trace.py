"""Trace all curves of the panels in a config module; save traces (json) and check overlays.

usage: python3 -I run_trace.py <render_dir> <cal_json> <cfg_module> <out_dir> [panel ...]
"""
import sys, os, json, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import calib, curves, trace

rdir, calp, cfgname, outd = sys.argv[1:5]
only = sys.argv[5:]
cfg = importlib.import_module(cfgname)
CAL = json.load(open(calp))
COL = [(220, 0, 0), (0, 0, 230), (0, 160, 0), (200, 0, 200), (0, 170, 170), (230, 120, 0),
       (120, 60, 0), (90, 90, 90), (150, 150, 0)]
os.makedirs(outd, exist_ok=True)
for pname, P in cfg.PANELS.items():
    if only and pname not in only:
        continue
    cal = CAL[P.get('cal', pname)]
    g = calib.load_gray(os.path.join(rdir, cal['img']))
    tr = curves.scan_panel(g, cal, P)
    json.dump(tr, open(os.path.join(outd, f'trace_{pname}.json'), 'w'))
    for k, t in tr.items():
        nsh = sum(1 for q in t if q['shared'])
        if t:
            print(pname, k, 'pts', len(t), 'shared', nsh, 'extent', curves.extent(t))
        else:
            print(pname, k, 'NO POINTS')
