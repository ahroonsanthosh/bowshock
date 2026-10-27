# usage: python3 -I f7read.py <out.json> <review_prefix> <panel_prefix>...
# Combines fig7.py (open-circle detection) and fig7b.py (stack extents) per station into a reading of the
# jet-off circle:
#  A) 'circle': a detected open circle (coverage >= 0.95, centre spread <= 4 px) whose centre lies inside the
#     chosen stack (the run through the solid fairing) -> centre of that circle;
#  B) 'stack': otherwise, if a chosen stack exists, the circle (outer half-height H = 13 px) must lie wholly
#     inside it: centre range [top + H, bottom - H]. If that range is <= 8 px wide -> midpoint, with the
#     range ends as alternatives; if wider -> illegible (range in the note);
#  C) 'none': no stack identified -> illegible.
# Writes readings and a review sheet per panel with the reading (red cross) and range (red bar).
import sys, json, math
import numpy as np
from PIL import Image, ImageDraw
H = 13
out = []
for pre in sys.argv[3:]:
    A = json.load(open(pre + '.res.json')); Bv = json.load(open(pre + '.bres.json')); sp = json.load(open(pre + '.json'))
    cal = json.load(open(sp['cal'])); ax, ay = cal['ax'], cal['ay']
    g = np.asarray(Image.open(cal['spec']['png']).convert('L'))
    def data(px, py): return ax[0] + ax[1] * px + ax[2] * py, ay[0] + ay[1] * px + ay[2] * py
    tiles = []
    for a, b in zip(A, Bv):
        st = a['station']; ch = b['chosen']; c = a['circle']; rec = dict(panel=pre.split('_f7')[-1], station=st, px_station=b['px'])
        if c and c['cov'] >= 0.95 and c['spread'] <= 4 and ch and ch[0] - 3 <= c['py'] <= ch[1] + 3:
            X, Y = data(c['px'], c['py']); rec.update(kind='circle', px=c['px'], py=c['py'], X=X, Y=Y, stack=ch, spread=c['spread'], dot=c['dot'])
        elif ch:
            lo, hi = ch[0] + H, ch[1] - H
            if hi < lo: lo = hi = (ch[0] + ch[1]) / 2
            mid = (lo + hi) / 2
            X, Y = data(b['px'], mid); _, Ylo = data(b['px'], lo); _, Yhi = data(b['px'], hi)
            rec.update(kind='stack' if hi - lo <= 8 else 'wide', px=float(b['px']), py=mid, X=X, Y=Y, Ytop=Ylo, Ybot=Yhi, stack=ch, width=hi - lo)
        else:
            rec.update(kind='none', runs=b['runs'])
        out.append(rec)
        ys = (list(b['chosen']) if b['chosen'] else [v for rn in b['runs'] for v in rn]) or sp['panel_y']
        ya, yb = int(min(ys)) - 35, int(max(ys)) + 35; xa = b['px'] - 25; s = 3
        im = Image.fromarray(g[ya:yb, xa:xa + 50]).convert('RGB').resize((150, (yb - ya) * s), Image.LANCZOS); d = ImageDraw.Draw(im)
        if rec['kind'] in ('circle', 'stack', 'wide'):
            X0 = (rec['px'] - xa) * s; Y0 = (rec['py'] - ya) * s; col = (255, 0, 0) if rec['kind'] != 'wide' else (255, 150, 0)
            d.line([(X0 - 12, Y0), (X0 + 12, Y0)], fill=col, width=2); d.line([(X0, Y0 - 12), (X0, Y0 + 12)], fill=col, width=2)
            if rec['kind'] == 'circle': d.ellipse([X0 - 31, Y0 - 31, X0 + 31, Y0 + 31], outline=(255, 0, 0))
            d.line([(145, (rec['stack'][0] - ya) * s), (145, (rec['stack'][1] - ya) * s)], fill=(0, 170, 0), width=3)
        d.text((2, 2), f"{rec['panel']} {st} {rec['kind']}", fill=(0, 0, 255))
        tiles.append(im)
    W = sum(t.size[0] for t in tiles) + 4 * len(tiles); Hh = max(t.size[1] for t in tiles)
    row = Image.new('RGB', (W, Hh), 'white'); x = 0
    for t in tiles: row.paste(t, (x, 0)); x += t.size[0] + 4
    row.save(sys.argv[2] + '_' + pre.split('_f7')[-1] + '.png')
json.dump(out, open(sys.argv[1], 'w'), indent=0, default=float)
import collections
print(collections.Counter(r['kind'] for r in out))
for r in out:
    s = f"{r['panel']} {r['station']:5.2f} {r['kind']:6}"
    if 'Y' in r: s += f" X {r['X']:.4f} Y {r['Y']:+.4f}"
    if r['kind'] in ('stack', 'wide'): s += f" range {r['Ytop']:+.4f}..{r['Ybot']:+.4f} w {r['width']:.0f}"
    print(s)
