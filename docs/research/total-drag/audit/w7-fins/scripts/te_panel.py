"""R&M 3348 figs. 47 to 52: the curves' ink at x/c 0.995 in one panel.
Usage: python3 -I te_panel.py <page.png> x0 y0 x1 y1 [xc]
(x0, y0, x1, y1) is a box a little larger than the panel's frame. The
frame's left (x/c 0) and right (x/c 1.0) lines and its top (p/H 0) and
bottom (p/H 1.0) lines are the strongest lines near the box's edges; the
left axis's ticks (0.2 to 0.8, on its inner side) are found from the row
profile just inside the left line. p/H is a least-squares line through
the top line (0), the ticks and the bottom line (1.0); the column at x/c
xc (default 0.995) is placed between the left and right lines at each
height, and its ink runs are listed with their p/H. Prints JSON."""
import json
import sys
import numpy as np
from PIL import Image

img = 255 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
x0, y0, x1, y1 = map(int, sys.argv[2:6])
xc = float(sys.argv[6]) if len(sys.argv) > 6 else 0.995
box = img[y0:y1, x0:x1] > 100
H, W = box.shape
cols = box.mean(0)
rows = box.mean(1)
q = W // 4
left = int(np.argmax(cols[:q]))
right = 3 * q + int(np.argmax(cols[3 * q:]))
qh = H // 4
top = int(np.argmax(rows[:qh]))
bottom = 3 * qh + int(np.argmax(rows[3 * qh:]))


def centre(profile, i, half=4):
    lo, hi = max(0, i - half), min(len(profile), i + half + 1)
    p = profile[lo:hi]
    return float((np.arange(lo, hi) * p).sum() / p.sum())


left_c, right_c = centre(cols, left), centre(cols, right)
top_c, bottom_c = centre(rows, top), centre(rows, bottom)
# ticks: rows where columns left+3 .. left+12 are mostly dark (a short tick inward)
band = box[:, left + 3:left + 13].mean(1)
ticks = []
i = top + 15
while i < bottom - 15:
    if band[i] > 0.6:
        j = i
        while j < bottom - 15 and band[j] > 0.6:
            j += 1
        ticks.append((i + j - 1) / 2)
        i = j
    i += 1
ys = [top_c] + ticks + [bottom_c]
vals = [0.0] + [0.2 * (k + 1) for k in range(len(ticks))] + [1.0]
ok = len(ticks) == 4
a, b = np.polyfit(ys, vals, 1)
resid = [v - (a * y + b) for y, v in zip(ys, vals)]
xcol = left_c + xc * (right_c - left_c)
xi = int(round(xcol))
col = box[:, xi]
runs, s = [], None
for i in range(top + 3, bottom - 2):
    if col[i] and s is None:
        s = i
    if not col[i] and s is not None:
        runs.append((s, i - 1))
        s = None
out = {
    'frame_px': {'left': left_c + x0, 'right': right_c + x0, 'top': top_c + y0, 'bottom': bottom_c + y0},
    'ticks_px': [t + y0 for t in ticks], 'four_ticks': ok,
    'p_per_px': a, 'tick_residuals': [round(r, 4) for r in resid],
    'column_px': xcol + x0,
    'runs': [{'y_top': r0 + y0, 'y_bottom': r1 + y0, 'p_top': round(a * r0 + b, 4), 'p_bottom': round(a * r1 + b, 4)}
             for r0, r1 in runs],
}
print(json.dumps(out))
