"""For reading by eye: x/c 0.80 to 1.0 of each panel of one figure, p/H
0.3 to 0.9, scaled, with page-pixel rulers every 10 px (red, x labelled
every 50; blue, y labelled every 50) and the x/c 0.995 column in green.
Usage: python3 -I te_view.py <te.jsonl> <dir> <fig> <scale> <out.png> [panel]"""
import json
import sys
from PIL import Image, ImageDraw

sel = sys.argv[6] if len(sys.argv) > 6 else None
panels = [json.loads(l) for l in open(sys.argv[1])]
panels = [o for o in panels if o['fig'] == int(sys.argv[3]) and (sel is None or o['panel'] == sel)]
d, s = sys.argv[2], int(sys.argv[4])
tiles = []
for o in panels:
    im = Image.open(f"{d}/p-{o['page']:03d}.png").convert('RGB')
    fr = o['frame_px']
    a = o['p_per_px']
    xl = int(fr['left'] + 0.80 * (fr['right'] - fr['left']))
    xr = int(fr['right'] + 6)
    yt = int(fr['top'] + 0.3 / a)
    yb = int(fr['top'] + 0.9 / a)
    c = im.crop((xl, yt, xr, yb)).resize(((xr - xl) * s, (yb - yt) * s), Image.NEAREST)
    dr = ImageDraw.Draw(c)
    for x in range((xl // 10 + 1) * 10, xr, 10):
        X = (x - xl) * s
        dr.line([(X, 0), (X, 6 if x % 50 else 14)], fill=(255, 0, 0))
        if x % 50 == 0:
            dr.text((X + 2, 14), str(x), fill=(255, 0, 0))
    for y in range((yt // 10 + 1) * 10, yb, 10):
        Y = (y - yt) * s
        dr.line([(0, Y), (6 if y % 50 else 14, Y)], fill=(0, 0, 255))
        if y % 50 == 0:
            dr.text((16, Y - 6), str(y), fill=(0, 0, 255))
    X = (o['column_px'] - xl) * s
    dr.line([(X, 0), (X, c.size[1])], fill=(0, 170, 0))
    dr.text((30, 30), f"{o['fig']}{o['panel']}", fill=(0, 128, 0))
    tiles.append(c)
W = sum(c.size[0] for c in tiles) + 10 * len(tiles)
H = max(c.size[1] for c in tiles)
out = Image.new('RGB', (W, H), 'white')
x = 0
for c in tiles:
    out.paste(c, (x, 0))
    x += c.size[0] + 10
out.save(sys.argv[5])
