# usage: python3 -I panelcal.py <png> <x0> <y0> <x1> <y1> <yvals comma list top->bottom> <out_prefix> [labx0 labx1]
# Automatic calibration of one gridded panel. Vertical frame lines: the leftmost and rightmost long
# vertical lines in the box are x = -0.2 and x = 1.0 (TN D-6789 fig. 7 panels share this x range),
# and every 10th gridline between them is checked (0.2 steps). Horizontal: y-axis label glyphs are found
# in the label column (labx0..labx1), grouped into labels top to bottom, matched in order to the given
# values, and each is snapped to the nearest long horizontal line within 10 px. Then writes a calib spec
# (<out_prefix>.json) and runs the same trace-and-fit as calib.py (<out_prefix>.out.json).
import sys, json, subprocess, os
import numpy as np, cv2
from PIL import Image
a = sys.argv; png = a[1]; x0, y0, x1, y1 = map(int, a[2:6]); outp = a[7]
lx0, lx1 = (int(a[8]), int(a[9])) if len(a) > 9 else (x0 - 110, x0 - 5)
g = np.asarray(Image.open(png).convert('L')).astype(float)
def lines(sub, axis, th):
    m = sub < 128
    frac = m.mean(axis=0 if axis == 'v' else 1)
    idx = np.where(frac > th)[0]; runs = []
    for i in idx:
        if runs and i <= runs[-1][-1] + 1: runs[-1].append(i)
        else: runs.append([i])
    return [(np.mean(r), frac[r].max(), len(r)) for r in runs]
VT = float(os.environ.get('VTHR', '0.6')); HT = float(os.environ.get('HTHR', '0.6'))
V = lines(g[y0:y1, x0:x1], 'v', VT); V = [(x0 + c, f, w) for c, f, w in V]
H = lines(g[y0:y1, x0 + int(os.environ.get('HX0', '15')):x0 + int(os.environ.get('HX1', '350'))], 'h', HT); H = [(y0 + c, f, w) for c, f, w in H]
left, right = V[0][0], V[-1][0]
# labels: given as value@approx_y pairs (approx y = label glyph centre read from the page)
hl = []
for item in a[6].split(','):
    v, c = item.split('@'); v = float(v); c = float(c)
    near = [h for h in H if abs(h[0] - c) < 14]
    if not near: print('no line near label', v, c); continue
    h = min(near, key=lambda h: abs(h[0] - c)); hl.append([round(h[0], 1), v]); print(f'label {v} at {c:.1f} -> line {h[0]:.1f}')
# x: frames + bold zero line (widest run between)
inner = [v for v in V if left + 50 < v[0] < right - 50]
zero = max([v for v in inner if v[0] < left + (right - left) * 0.3], key=lambda v: v[2])
vl = [[round(left, 1), -0.2], [round(zero[0], 1), 0.0], [round(right, 1), 1.0]]
step = (right - zero[0]) / 50
for k in (10, 20, 30, 40):
    xp = zero[0] + k * step; near = [v for v in V if abs(v[0] - xp) < 6]
    if near: vl.append([round(min(near, key=lambda v: abs(v[0] - xp))[0], 1), round(k * 0.02, 2)])
print('x lines:', vl, 'zero width', zero[2], 'step', round(step, 2), 'left-zero/10', round((zero[0] - left) / 10, 2))
spec = {"png": png, "dpi": 300, "box": [int(left), int(min(h[0] for h in hl)), int(right), int(max(h[0] for h in hl))], "dark": 128, "halfwin": 5,
        "v": vl, "h": hl}
json.dump(spec, open(outp + '.json', 'w'))
here = os.path.dirname(os.path.abspath(__file__))
print(subprocess.run([sys.executable, '-I', os.path.join(here, 'calib.py'), outp + '.json', outp + '.out.json'], capture_output=True, text=True).stdout)
