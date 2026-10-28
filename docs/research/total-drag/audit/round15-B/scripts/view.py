"""Make a zoomed check image of a plot region with traces and/or readings drawn on it.

usage: python3 -I view.py <render_dir> <cal_json> <panel> <x0> <x1> <y0> <y1> <scale> <out.png>
          [--trace tr.json] [--read readings.json]
x0..y1 in plot units. scale: output px per render px.
Trace points: small dots per curve (shared points in black). Readings: open circles + cross.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import trace

args = sys.argv[1:]
rdir, calp, panel = args[:3]
x0, x1, y0, y1, scale = map(float, args[3:8])
outp = args[8]
trp = rdp = None
if '--trace' in args:
    trp = args[args.index('--trace') + 1]
if '--read' in args:
    rdp = args[args.index('--read') + 1]
fixed = 'x'
if '--fixed' in args:
    fixed = args[args.index('--fixed') + 1]
C = json.load(open(calp))[panel]
cx, cy = C['cx'], C['cy']
im = Image.open(os.path.join(rdir, C['img'])).convert('RGB')
corners = trace.inv(cx, cy, [x0, x1, x0, x1], [y0, y0, y1, y1])
L, R = int(corners[0].min()) - 5, int(corners[0].max()) + 5
T, Bm = int(corners[1].min()) - 5, int(corners[1].max()) + 5
crop = im.crop((L, T, R, Bm))
crop = crop.resize((int((R - L) * scale), int((Bm - T) * scale)), Image.LANCZOS)
d = ImageDraw.Draw(crop)
COL = [(230, 0, 0), (0, 0, 255), (0, 170, 0), (210, 0, 210), (0, 180, 180), (240, 130, 0),
       (130, 70, 0), (100, 100, 100), (160, 160, 0)]


def topix(X, Y):
    p = trace.inv(cx, cy, [X], [Y])
    return (p[0][0] - L) * scale, (p[1][0] - T) * scale


if trp:
    tr = json.load(open(trp))
    for k, (name, t) in enumerate(tr.items()):
        col = COL[k % len(COL)]
        for q in t:
            X, Y = (q['s'], q['c']) if fixed == 'x' else (q['c'], q['s'])
            if not (min(x0, x1) <= X <= max(x0, x1) and min(y0, y1) <= Y <= max(y0, y1)):
                continue
            u, v = topix(X, Y)
            c = (0, 0, 0) if q['shared'] else col
            d.rectangle((u - 1, v - 1, u + 1, v + 1), fill=c)
if rdp:
    rd = json.load(open(rdp))
    names = []
    for r in rd:
        if r.get('pkey', r.get('panel', panel)) == panel and r['curve'] not in names:
            names.append(r['curve'])
    for r in rd:
        if r.get('pkey', r.get('panel', panel)) != panel or r['y'] is None or r['x'] is None or not (min(x0, x1) <= r['x'] <= max(x0, x1) and min(y0, y1) <= r['y'] <= max(y0, y1)):
            continue
        k = names.index(r['curve'])
        col = COL[k % len(COL)]
        u, v = topix(r['x'], r['y'])
        rr = max(6, 3 * scale)
        d.ellipse((u - rr, v - rr, u + rr, v + rr), outline=col, width=2)
        d.line((u - 2 * rr, v, u + 2 * rr, v), fill=col, width=1)
        d.line((u, v - 2 * rr, u, v + 2 * rr), fill=col, width=1)
crop.save(outp)
print(outp, crop.size)
