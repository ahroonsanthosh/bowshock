# usage: python3 -I f7sheet.py <out.png> <res.json>...  compact sheet: per panel one row of station tiles,
# each tile = +-30 px around the station x, from 45 px above the highest blob/circle to 45 px below the
# lowest, scale 4, blobs boxed green, detected open circle red, station label and tile index
import sys, json
import numpy as np
from PIL import Image, ImageDraw
rows = []
for rf in sys.argv[2:]:
    R = json.load(open(rf)); cal = json.load(open(rf.replace('.res.json', '.json').replace('pts/', 'pts/')))
    cal = json.load(open(cal['cal'])); g = np.asarray(Image.open(cal['spec']['png']).convert('L'))
    tiles = []
    for k, r in enumerate(R):
        ys = [b['y_top'] for b in r['blobs']] + [b['y_bot'] for b in r['blobs']]
        if r['circle']: ys += [r['circle']['py'] - 12, r['circle']['py'] + 12]
        if not ys: ys = [cal['spec']['box'][1], cal['spec']['box'][3]]
        ya, yb = int(min(ys)) - 30, int(max(ys)) + 30; xa = int(r['px_station']) - 25; xb = xa + 50
        sc = 3
        im = Image.fromarray(g[ya:yb, xa:xb]).convert('RGB').resize((50 * sc, (yb - ya) * sc), Image.NEAREST); d = ImageDraw.Draw(im)
        for yy in range((ya // 10 + 1) * 10, yb, 10):
            d.line([(0, (yy - ya) * sc), (8 if yy % 50 else 16, (yy - ya) * sc)], fill=(255, 0, 255)); d.text((18, (yy - ya) * sc - 5), str(yy), fill=(255, 0, 255)) if yy % 20 == 0 else None
        for b in r['blobs']: d.rectangle([(b['x_l'] - xa) * sc, (b['y_top'] - ya) * sc, (b['x_r'] - xa) * sc, (b['y_bot'] - ya) * sc], outline=(0, 170, 0))
        c = r['circle']
        if c: d.ellipse([(c['px'] - xa - 12) * sc, (c['py'] - ya - 12) * sc, (c['px'] - xa + 12) * sc, (c['py'] - ya + 12) * sc], outline=(255, 0, 0), width=2)
        d.text((2, 2), f"{k}:{r['station']}", fill=(0, 0, 255)); d.text((2, 14), f"y{ya}", fill=(0, 0, 255))
        tiles.append(im)
    W = sum(t.size[0] for t in tiles) + 4 * len(tiles); H = max(t.size[1] for t in tiles)
    row = Image.new('RGB', (W, H), 'white'); x = 0
    for t in tiles: row.paste(t, (x, 0)); x += t.size[0] + 4
    rows.append(row)
W = max(r.size[0] for r in rows); H = sum(r.size[1] for r in rows) + 10 * len(rows)
out = Image.new('RGB', (W, H), (200, 200, 200)); y = 0
for r in rows: out.paste(r, (0, y)); y += r.size[1] + 10
out.save(sys.argv[1]); print(out.size)
