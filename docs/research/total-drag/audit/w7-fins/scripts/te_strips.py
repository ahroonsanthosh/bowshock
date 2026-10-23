"""For checking by eye: the trailing-edge strip of each panel of one figure
(x/c about 0.9 to 1.0, p/H 0.1 to 0.9), scaled, with the x/c 0.995
column in red and p/H gridlines every 0.1 in blue from the panel's
calibration (te.jsonl). Usage:
python3 -I te_strips.py <te.jsonl> <dir> <fig> <scale> <out.png>"""
import json
import sys
from PIL import Image, ImageDraw

panels = [json.loads(l) for l in open(sys.argv[1]) if json.loads(l)['fig'] == int(sys.argv[3])]
d, s = sys.argv[2], int(sys.argv[4])
strips = []
for o in panels:
    im = Image.open(f"{d}/p-{o['page']:03d}.png").convert('RGB')
    fr = o['frame_px']
    a = o['p_per_px']
    b = -a * fr['top']  # p = a (y - top) approximately; for the grid marks only
    xl = int(fr['right'] - 0.1 * (fr['right'] - fr['left']))
    xr = int(fr['right'] + 8)
    yt = int(fr['top'] + 0.1 / a)
    yb = int(fr['top'] + 0.9 / a)
    c = im.crop((xl, yt, xr, yb)).resize(((xr - xl) * s, (yb - yt) * s), Image.NEAREST)
    dr = ImageDraw.Draw(c)
    X = (o['column_px'] - xl) * s
    dr.line([(X, 0), (X, c.size[1])], fill=(255, 0, 0))
    for k in range(1, 10):
        Y = (fr['top'] + (0.1 * k) / a - yt) * s
        dr.line([(0, Y), (12, Y)], fill=(0, 0, 255))
        dr.text((14, Y - 6), f'{0.1 * k:.1f}', fill=(0, 0, 255))
    dr.text((2, 2), f"{o['fig']}{o['panel']}", fill=(0, 128, 0))
    strips.append(c)
W = sum(c.size[0] for c in strips) + 10 * len(strips)
H = max(c.size[1] for c in strips)
out = Image.new('RGB', (W, H), 'white')
x = 0
for c in strips:
    out.paste(c, (x, 0))
    x += c.size[0] + 10
out.save(sys.argv[5])
