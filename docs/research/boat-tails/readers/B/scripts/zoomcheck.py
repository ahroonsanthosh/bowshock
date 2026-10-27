"""Draw fitted symbols on zoomed crops around each point for checking.
Usage: python3 -I zoomcheck.py SPEC.json OUTDIR VIEWDIR [half] [scale] [ids...]"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import figlib as fl
spec = json.load(open(sys.argv[1])); outdir = sys.argv[2]; viewdir = sys.argv[3]
half = int(sys.argv[4]) if len(sys.argv) > 4 else 40
scale = int(sys.argv[5]) if len(sys.argv) > 5 else 6
ids = set(sys.argv[6:])
img = fl.load_gray(spec['image'])
pts = json.load(open(os.path.join(outdir, f"{spec['name']}_points.json")))
groups = {}
for p in pts:
    key = p['id'] if os.environ.get('EACH') else p.get('group', p['id'])
    groups.setdefault((p['panel'], key), []).append(p)
for (pan, key), g in groups.items():
    if ids and key not in ids and not any(p['id'] in ids for p in g):
        continue
    cu = np.mean([p['u_fit'] for p in g]); cv = np.mean([p['v_fit'] for p in g])
    box = (int(cu) - half, int(cv) - half, int(cu) + half, int(cv) + half)
    marks = [{'u': p['u_fit'], 'v': p['v_fit'], 'label': p['id'], 'shape': p['kind'], 'size': p['size_used'], 'r': 1.5} for p in g]
    fl.overlay(img, box, marks, os.path.join(viewdir, f"chk_{spec['name']}_{pan}_{key}.png"), scale=scale)
    print(f"chk_{spec['name']}_{pan}_{key}.png", box)
