# usage: python3 -I ovstations.py <png> <res.json> <out.png> <half> <scale> <group_prefix_len>
# groups fitted points by id prefix (station), draws each group's outlines on a crop centred on the group,
# plain crop above overlay, groups side by side
import sys, json, math
from PIL import Image, ImageDraw
src, rf, out = sys.argv[1], sys.argv[2], sys.argv[3]; half = int(sys.argv[4]); sc = float(sys.argv[5])
R = json.load(open(rf)); g = Image.open(src).convert('RGB')
groups = {}
import os
GK = os.environ.get('GROUPBY', 'prefix')
for r in R: groups.setdefault(r['id'] if GK == 'id' else r['id'].rsplit('_', 1)[0], []).append(r)
cols = {'c': (230, 0, 0), 's': (0, 150, 0), 'd': (0, 0, 230), 'tu': (200, 0, 200), 'td': (0, 160, 160)}
tiles = []
for key, L in groups.items():
    cx = sum(r['px'] for r in L) / len(L); cy = sum(r['py'] for r in L) / len(L)
    x0, y0 = int(cx - half), int(cy - half)
    crop = g.crop((x0, y0, x0 + 2 * half, y0 + 2 * half)).resize((int(2 * half * sc), int(2 * half * sc)), Image.LANCZOS)
    ov = crop.copy(); d = ImageDraw.Draw(ov)
    for r in L:
        X, Y, S = (r['px'] - x0) * sc, (r['py'] - y0) * sc, r['size'] * sc; c = cols.get(r['s'], (0, 0, 0))
        if r['s'] == 'c': d.ellipse([X - S, Y - S, X + S, Y + S], outline=c)
        elif r['s'] == 's': d.rectangle([X - S, Y - S, X + S, Y + S], outline=c)
        elif r['s'] == 't': d.polygon([(X, Y - S), (X + S * .866, Y + S / 2), (X - S * .866, Y + S / 2)], outline=c)
        elif r['s'] == 'q':
            d.line([(X - S, Y - S), (X - S, Y + S), (X + S, Y + S)], fill=c); d.arc([X - 3 * S, Y - S, X + S, Y + 3 * S], 270, 360, fill=c)
        elif r['s'] == 'r': d.polygon([(X - S, Y - S), (X - S, Y + S), (X + S, Y + S)], outline=c)
        elif r['s'] == 'd': d.polygon([(X, Y - S), (X + S, Y), (X, Y + S), (X - S, Y)], outline=c)
        elif r['s'] == 'tu': d.polygon([(X, Y - S), (X + S * .866, Y + S / 2), (X - S * .866, Y + S / 2)], outline=c)
        elif r['s'] == 'td': d.polygon([(X, Y + S), (X + S * .866, Y - S / 2), (X - S * .866, Y - S / 2)], outline=c)
        d.text((X + S + 2, Y - 5), f"{r['s']} {r.get('coverage', 0):.2f}", fill=c)
    t = Image.new('RGB', (crop.size[0], crop.size[1] * 2 + 4), 'white'); t.paste(crop, (0, 0)); t.paste(ov, (0, crop.size[1] + 4))
    ImageDraw.Draw(t).text((2, 2), key, fill=(255, 0, 255)); tiles.append(t)
per = max(1, 1600 // (tiles[0].size[0] + 6)); rows = [tiles[i:i + per] for i in range(0, len(tiles), per)]
W = per * (tiles[0].size[0] + 6); H = len(rows) * (tiles[0].size[1] + 6)
o = Image.new('RGB', (W, H), (150, 150, 150))
for j, row in enumerate(rows):
    for i, t in enumerate(row): o.paste(t, (i * (t.size[0] + 6), j * (t.size[1] + 6)))
o.save(out); print(out, o.size)
