"""R&M 3348 figs. 47 to 52: the envelope of the curves' ink just ahead of
the trailing edge in each panel, from te.jsonl's frames and calibrations.
For each column from x/c X0 to X1 (default 0.980 to 0.995), the dark
pixels between p/H PMIN and PMAX (default 0.1 and 0.88, above the hatched
model) are taken, less the rows of the axis ticks (within 3 px of the
left axis's tick rows, which the right axis repeats); the envelope is the
least and greatest p/H over the band, and the column x/c 0.995's runs are
listed too. Usage: python3 -I te_band.py <te.jsonl> <dir> <out.json> [X0 X1 PMIN PMAX]"""
import json
import sys
import numpy as np
from PIL import Image

args = sys.argv[4:8]
X0, X1, PMIN, PMAX = (float(v) for v in args) if len(args) == 4 else (0.980, 0.995, 0.1, 0.88)
cache = {}
out = []
for line in open(sys.argv[1]):
    o = json.loads(line)
    if o['page'] not in cache:
        cache[o['page']] = 255 - np.asarray(Image.open(f"{sys.argv[2]}/p-{o['page']:03d}.png").convert('L')).astype(float)
    img = cache[o['page']] > 100
    fr = o['frame_px']
    a = o['p_per_px']
    ys = [fr['top']] + o['ticks_px'] + [fr['bottom']]
    vals = [0.0] + [0.2 * (k + 1) for k in range(len(o['ticks_px']))] + [1.0]
    sl, ic = np.polyfit(ys, vals, 1)
    p = lambda y: sl * y + ic
    ticks = o['ticks_px']
    rows_all = []
    for xc in np.arange(X0, X1 + 1e-9, 0.0025):
        x = int(round(fr['left'] + xc * (fr['right'] - fr['left'])))
        ys_ = [y for y in range(int(fr['top']) + 3, int(fr['bottom']) - 2)
               if img[y, x] and PMIN <= p(y) <= PMAX and not any(abs(y - t) <= 3 for t in ticks)]
        rows_all += ys_
    env = (round(p(min(rows_all)), 4), round(p(max(rows_all)), 4)) if rows_all else None
    out.append({'fig': o['fig'], 'mach': o['mach'], 'panel': o['panel'], 'sweep': o['sweep'],
                'envelope_p': env, 'envelope_px': (min(rows_all), max(rows_all)) if rows_all else None,
                'p_per_px': sl, 'column_runs_0995': [(r['p_top'], r['p_bottom']) for r in o['runs']
                                                     if PMIN <= r['p_top'] <= PMAX and
                                                     not any(abs((r['y_top'] + r['y_bottom']) / 2 - t) <= 3 for t in ticks)]})
json.dump(out, open(sys.argv[3], 'w'), indent=1)
for r in out:
    print(r['fig'], r['panel'], r['envelope_p'], r['column_runs_0995'])
