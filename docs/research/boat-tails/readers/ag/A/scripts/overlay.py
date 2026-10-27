# usage: python3 -I overlay.py <png> <res.json> <x0> <y0> <x1> <y1> <scale> <out.png> [id_prefix]
# draws every fitted outline (from refine.py results) inside the region, each in its own colour with its id,
# beside the plain enlarged crop, to check that each visible stroke is explained by one fitted symbol
import sys, json, math
import numpy as np
from PIL import Image, ImageDraw
a = sys.argv; png = a[1]; R = json.load(open(a[2])); x0, y0, x1, y1 = map(int, a[3:7]); sc = float(a[7]); out = a[8]
pre = a[9] if len(a) > 9 else ''
g = Image.open(png).convert('L').crop((x0, y0, x1, y1))
big = g.resize((int((x1 - x0) * sc), int((y1 - y0) * sc)), Image.LANCZOS)
ov = big.convert('RGB'); d = ImageDraw.Draw(ov)
cols = [(255, 0, 0), (0, 170, 0), (0, 0, 255), (220, 0, 220), (0, 170, 170), (230, 130, 0), (120, 60, 0)]
k = 0
for r in R:
    if not r['id'].startswith(pre): continue
    cx, cy = r['px'], r['py']
    if not (x0 <= cx <= x1 and y0 <= cy <= y1): continue
    s = r['size']; c = cols[k % len(cols)]; k += 1
    X = (cx - x0) * sc; Y = (cy - y0) * sc; S = s * sc
    sh = r.get('shape') or ('circle' if r['s'] in ('c',) else 'square')
    if r['s'].startswith('c'): d.ellipse([X - S, Y - S, X + S, Y + S], outline=c)
    elif r['s'].startswith('s'): d.rectangle([X - S, Y - S, X + S, Y + S], outline=c)
    elif r['s'].startswith('t'): d.polygon([(X, Y - S), (X + S * 0.866, Y + S / 2), (X - S * 0.866, Y + S / 2)], outline=c)
    elif r['s'].startswith('d'): d.polygon([(X, Y - S), (X + S, Y), (X, Y + S), (X - S, Y)], outline=c)
    d.line([(X - 4, Y), (X + 4, Y)], fill=c); d.line([(X, Y - 4), (X, Y + 4)], fill=c)
    d.text((X + S + 3, Y - 6), r['id'], fill=c)
W = big.size[0]
o = Image.new('RGB', (W * 2 + 120, big.size[1]), 'white'); o.paste(big.convert('RGB'), (0, 0)); o.paste(ov, (W + 10, 0))
o.save(out); print(out)
