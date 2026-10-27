# usage: python3 -I f7emit.py <out.csv> <panel_prefix>...
# Final reading rule for TN D-6789 fig. 7 (jet-off circle buried in merged symbol stacks):
#  stack = lowest symbol run at the station (fig7b.py); x centre = midpoint of the stack's left and right
#  edges (dark columns over the stack rows after removing long vertical/horizontal grid strokes);
#  the jet-off circle (outer half-height 13 px) must lie wholly inside the stack, so its centre lies in
#  [top + 13, bottom - 13]. Range <= 8 px: y = midpoint, flag ambiguous, range ends as alternatives.
#  Range > 8 px: y empty, flag illegible, range in the note. No stack: illegible.
import sys, json, csv, math
import numpy as np, cv2
from PIL import Image
Hh = 13
meta = {'a': ('3 (caption: beta approx. 3 deg)', '1.83', 23), 'b': ('3 (caption: beta approx. 3 deg)', '2.2', 24), 'c': ('5', '1.83', 25),
        'd': ('5', '2.2', 26), 'e': ('10', '1.83', 27), 'f': ('10', '2.2', 28)}
ldm = {1: '0.6', 2: '0.8', 3: '1.0'}
alpha = {'a': {1: '7.2', 2: '5.8', 3: '4.8'}, 'b': {1: '7.2', 2: '5.8', 3: '4.8'}, 'c': {1: '6.0', 2: '4.4', 3: '3.2'},
         'd': {1: '6.0', 2: '4.4', 3: '3.2'}, 'e': {1: '3.0', 2: '0.9', 3: '0.8'}, 'f': {1: '3.0', 2: '0.9', 3: '0.8'}}
rows = []
for pre in sys.argv[2:]:
    pk = pre.split('_f7')[-1]; pg, k = pk[0], int(pk[1])
    Bv = json.load(open(pre + '.bres.json')); sp = json.load(open(pre + '.json')); cal = json.load(open(sp['cal']))
    g = np.asarray(Image.open(cal['spec']['png']).convert('L')); B = (g < 128).astype(np.uint8)
    hl = cv2.morphologyEx(B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (41, 1)))
    vl = cv2.morphologyEx(B, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 41)))
    S = B & (1 - cv2.dilate(hl | vl, np.ones((3, 3), np.uint8)))
    ax, ay = cal['ax'], cal['ay']
    def data(px, py): return ax[0] + ax[1] * px + ax[2] * py, ay[0] + ay[1] * px + ay[2] * py
    beta, mach, page = meta[pg]
    for b in Bv:
        st = b['station']; ch = b['chosen']
        cfg = f"beta = {beta} deg, l/dm = {ldm[k]}, nozzle divergence alpha = {alpha[pg][k]} deg (fig. 4 table, PDF p20)"
        base = f"jet off: legend symbol open circle, 'Jet off'; phi = 0 deg (caption); Table I orifice x/dm {st}"
        if not ch:
            rows.append(['TN D-6789', f'fig. 7({pg}), l/dm = {ldm[k]}', 'open circle, Jet off', cfg, mach, '0', f'{st}', 'x/dm (from boattail corner), ratio of axial boattail distance to model diameter', '', 'Cp,beta, boattail pressure coefficient', '', 'illegible', page,
                         base + '; no symbol stack found at this station; x given is the Table I station, not a reading'])
            continue
        top, bot = ch
        sub = S[top:bot + 1, b['px'] - 18:b['px'] + 19]
        colsum = sub.sum(axis=0); cols = np.where(colsum >= 3)[0]
        xc = b['px'] - 18 + (cols.min() + cols.max()) / 2 if len(cols) else float(b['px'])
        lo, hi = top + Hh, bot - Hh
        if hi < lo: lo = hi = (top + bot) / 2
        X, Y = data(xc, (lo + hi) / 2); _, Yt = data(xc, lo); _, Yb = data(xc, hi); _, Ytop = data(xc, top); _, Ybot = data(xc, bot)
        ex = math.hypot(cal['sx'] * 2.0, cal['rms_x'])
        note = (base + f'; symbols at this station overlap into one stack from Cp {Ytop:+.4f} to {Ybot:+.4f} (px y {top}-{bot}, x centre {xc:.1f} at 300 dpi); '
                f'the jet-off circle cannot be told apart; its centre must lie between Cp {Yt:+.4f} and {Yb:+.4f}')
        if hi - lo <= 8:
            ey = math.hypot(cal['sy'] * max(2.0, (hi - lo) / 2), cal['rms_y'])
            rows.append(['TN D-6789', f'fig. 7({pg}), l/dm = {ldm[k]}', 'open circle, Jet off', cfg, mach, '0', f'{X:.4f}', 'x/dm (from boattail corner), ratio of axial boattail distance to model diameter', f'{(Yt + Yb) / 2:.4f}', 'Cp,beta, boattail pressure coefficient',
                         f'{Yt:.4f}; {Yb:.4f}', 'ambiguous', page, note + f'; y = midpoint of that range; reading error 1-sigma x {ex:.2g}, y {ey:.2g}'])
        else:
            rows.append(['TN D-6789', f'fig. 7({pg}), l/dm = {ldm[k]}', 'open circle, Jet off', cfg, mach, '0', f'{X:.4f}', 'x/dm (from boattail corner), ratio of axial boattail distance to model diameter', '', 'Cp,beta, boattail pressure coefficient',
                         '', 'illegible', page, note + '; range wider than 8 px (0.005 in Cp), so no value is given'])
with open(sys.argv[1], 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['source', 'item', 'series', 'configuration', 'mach', 'meridian', 'x', 'x_quantity', 'y', 'y_quantity', 'alternatives', 'flag', 'page', 'note']); w.writerows(rows)
import collections
print(collections.Counter(r[11] for r in rows))
for r in rows: print(r[1], r[4], r[6], r[8], r[11])
