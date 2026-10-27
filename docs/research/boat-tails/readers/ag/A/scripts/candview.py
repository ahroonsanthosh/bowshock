# usage: python3 -I candview.py <png> <cands.json> <x0> <y0> <x1> <y1> <scale> <out.png> [ids=all]
# draws candidate outlines (scan/merge output, or refine results with 's'/'size') on an enlarged crop,
# coloured by shape, labelled with their list index (or 'id'); the plain crop is placed above for comparison
import sys, json, math
import numpy as np
from PIL import Image, ImageDraw
a = sys.argv; png = a[1]; C = json.load(open(a[2])); x0, y0, x1, y1 = map(int, a[3:7]); sc = float(a[7]); out = a[8]
ids = None if len(a) <= 9 or a[9] == 'all' else set(a[9].split(','))
g = Image.open(png).convert('L').crop((x0, y0, x1, y1)).resize((int((x1 - x0) * sc), int((y1 - y0) * sc)), Image.LANCZOS)
ov = g.convert('RGB'); d = ImageDraw.Draw(ov)
col = {'circle': (230, 0, 0), 'square': (0, 150, 0), 'diamond': (0, 0, 230), 'tri_up': (200, 0, 200), 'tri_down': (0, 160, 160)}
smap = {'c': 'circle', 's': 'square', 'd': 'diamond', 'tu': 'tri_up', 'td': 'tri_down'}
for k, r in enumerate(C):
    lab = str(r.get('id', k))
    if ids and lab not in ids: continue
    sh = r.get('shape') or smap.get(r.get('s'), 'circle'); s = r['size']
    x = r.get('px', r.get('x')); y = r.get('py', r.get('y'))
    if not (x0 - 20 <= x <= x1 + 20 and y0 - 20 <= y <= y1 + 20): continue
    X, Y, S = (x - x0) * sc, (y - y0) * sc, s * sc; c = col[sh]
    if sh == 'circle': d.ellipse([X - S, Y - S, X + S, Y + S], outline=c, width=1)
    elif sh == 'square': d.rectangle([X - S, Y - S, X + S, Y + S], outline=c, width=1)
    elif sh == 'diamond': d.polygon([(X, Y - S), (X + S, Y), (X, Y + S), (X - S, Y)], outline=c)
    elif sh == 'tri_up': d.polygon([(X, Y - S), (X + S * .866, Y + S / 2), (X - S * .866, Y + S / 2)], outline=c)
    else: d.polygon([(X, Y + S), (X + S * .866, Y - S / 2), (X - S * .866, Y - S / 2)], outline=c)
    d.line([(X - 3, Y), (X + 3, Y)], fill=c); d.line([(X, Y - 3), (X, Y + 3)], fill=c)
    d.text((X + 4, Y + 2), lab, fill=c)
o = Image.new('RGB', (ov.size[0], ov.size[1] * 2 + 6), 'white'); o.paste(g.convert('RGB'), (0, 0)); o.paste(ov, (0, ov.size[1] + 6)); o.save(out); print(out, o.size)
