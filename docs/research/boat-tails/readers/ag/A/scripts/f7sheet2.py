# usage: python3 -I f7sheet2.py <out.png> <panel_prefix>...  per panel a row of station tiles (x +-25 px,
# y from 35 px above to 35 px below the runs), scale 3, ruler every 10 px (labels every 20), all runs in
# green, the chosen run's top and bottom in red, solid-line y estimates in blue
import sys, json
import numpy as np
from PIL import Image, ImageDraw
rows = []
for pre in sys.argv[2:]:
    R = json.load(open(pre + '.bres.json')); sp = json.load(open(pre + '.json')); cal = json.load(open(sp['cal']))
    g = np.asarray(Image.open(cal['spec']['png']).convert('L'))
    tiles = []
    for k, r in enumerate(R):
        ys = [v for rn in r['runs'] for v in rn] or sp['panel_y']
        ya, yb = int(min(ys)) - 35, int(max(ys)) + 35; xa = r['px'] - 25; sc = 3
        im = Image.fromarray(g[ya:yb, xa:xa + 50]).convert('RGB').resize((150, (yb - ya) * sc), Image.NEAREST); d = ImageDraw.Draw(im)
        for yy in range((ya // 10 + 1) * 10, yb, 10):
            d.line([(0, (yy - ya) * sc), (6 if yy % 50 else 12, (yy - ya) * sc)], fill=(255, 0, 255))
            if yy % 20 == 0: d.text((14, (yy - ya) * sc - 5), str(yy), fill=(255, 0, 255))
        for rn in r['runs']: d.line([(140, (rn[0] - ya) * sc), (140, (rn[1] - ya) * sc)], fill=(0, 170, 0), width=3)
        if r['chosen']:
            for v in r['chosen']: d.line([(30, (v - ya) * sc), (150, (v - ya) * sc)], fill=(255, 0, 0))
        for s in r['solid']: d.line([(0, (s - ya) * sc), (25, (s - ya) * sc)], fill=(0, 0, 255), width=2)
        d.text((40, 2), f"{k}:{r['station']}", fill=(0, 0, 255))
        tiles.append(im)
    W = sum(t.size[0] for t in tiles) + 4 * len(tiles); H = max(t.size[1] for t in tiles)
    row = Image.new('RGB', (W, H), 'white'); x = 0
    for t in tiles: row.paste(t, (x, 0)); x += t.size[0] + 4
    rows.append(row)
W = max(r.size[0] for r in rows); H = sum(r.size[1] for r in rows) + 10 * len(rows)
out = Image.new('RGB', (W, H), (200, 200, 200)); y = 0
for r in rows: out.paste(r, (0, y)); y += r.size[1] + 10
out.save(sys.argv[1]); print(out.size)
