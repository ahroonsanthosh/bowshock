"""Follow one printed curve and record its ink centre.
mode col: for each column x (x_start..x_end, step), centre y of the curve near the predicted y.
mode row: for each row y, centre x near the predicted x.
Pixels within 1.6 px of a gridline crossing the profile are left out; a profile whose window
holds a gridline within 2 px of the predicted centre is skipped (the curve cannot be told from
the gridline there). Mask boxes (x0,y0,x1,y1) are left out too.
Usage: trace.py page.jpg calib.json mode start_a start_b end_a step halfwin out.json [--mask ...]
start_a/start_b: (x, y) for col mode, (y, x) for row mode."""
import json
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__file__))
from trifit import lpos

a = 255.0 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
cal = json.load(open(sys.argv[2]))
mode = sys.argv[3]
s_a, s_b, e_a = float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
step = int(sys.argv[7]); hw = int(sys.argv[8]); out = sys.argv[9]
rest = sys.argv[10:]
masks = [tuple(map(float, rest[i + 1].split(','))) for i in range(len(rest)) if rest[i] == '--mask']
def masked(x, y):
    return any(m[0] <= x <= m[2] and m[1] <= y <= m[3] for m in masks)
pts = []
pred = s_b
hist = []
rng = range(int(s_a), int(e_a) + (1 if e_a >= s_a else -1), step if e_a >= s_a else -step)
for t in rng:
    # gridlines crossing this profile: for col mode, horizontal lines at this x; for row mode vertical lines at this y
    if mode == 'col':
        cross = [lpos(f, t) for f in cal['horizontal']]
    else:
        cross = [lpos(f, t) for f in cal['vertical']]
    lo, hi = int(round(pred - hw)), int(round(pred + hw))
    near = [c for c in cross if abs(c - pred) <= 2.5]
    idx = np.arange(lo, hi + 1)
    prof = a[idx, t] if mode == 'col' else a[t, idx]
    ok = np.ones_like(idx, bool)
    for c in cross:
        ok &= np.abs(idx - c) > 1.6
    for k, u in enumerate(idx):
        if (mode == 'col' and masked(t, u)) or (mode == 'row' and masked(u, t)):
            ok[k] = False
    if near or ok.sum() < 4:
        # cannot separate from a gridline here; carry the prediction on
        if len(hist) >= 2:
            pred = hist[-1][1] + (hist[-1][1] - hist[-2][1]) / (hist[-1][0] - hist[-2][0]) * (t - hist[-1][0])
        continue
    bg = np.percentile(prof[ok], 20)
    w = np.where(ok, np.clip(prof - bg, 0, None), 0)
    if w.max() < 50:
        if len(hist) >= 2:
            pred = hist[-1][1] + (hist[-1][1] - hist[-2][1]) / (hist[-1][0] - hist[-2][0]) * (t - hist[-1][0])
        continue
    k0 = int(np.argmax(w))
    sel = (np.abs(np.arange(len(idx)) - k0) <= 2) & (w >= 0.3 * w[k0])
    c = (idx[sel] * w[sel]).sum() / w[sel].sum()
    pts.append([t, float(c), float(w[k0])])
    hist.append((t, c))
    if len(hist) >= 3:
        pred = c + (hist[-1][1] - hist[-3][1]) / (hist[-1][0] - hist[-3][0]) * step * (1 if e_a >= s_a else -1)
    else:
        pred = c
json.dump(dict(mode=mode, pts=pts), open(out, 'w'))
print(len(pts), 'points; first', pts[:2], 'last', pts[-2:])
