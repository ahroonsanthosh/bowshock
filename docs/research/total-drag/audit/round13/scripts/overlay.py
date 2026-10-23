"""Overlay check: the read symbols drawn back on the page.

usage: python3 -I overlay.py SYMS.json KEY CAL.json READ.json X0 Y0 X1 Y1 SCALE OUT.png

Drawn on the page crop (scaled): cyan crosses at the calibration's gridline
intersections; for each symbol read, its fitted ideal outline in magenta
(green for a manual centre) with its id; orange boxes round merged ink that
was not separated. A reader checks that each outline sits on its glyph.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402
import glyph  # noqa: E402

Image.MAX_IMAGE_PIXELS = None
cfg = json.load(open(sys.argv[1]))[sys.argv[2]]
cal = json.load(open(sys.argv[3]))
rd = {r["id"]: r for r in json.load(open(sys.argv[4]))["rows"]}
x0, y0, x1, y1 = map(int, sys.argv[5:9])
sc = float(sys.argv[9])
im = Image.open(cfg["page"]).convert("L").crop((x0, y0, x1, y1))
im = im.resize((int((x1 - x0) * sc), int((y1 - y0) * sc)), Image.LANCZOS).convert("RGB")
d = ImageDraw.Draw(im)


def P(x, y):
    return ((x - x0 + 0.5) * sc, (y - y0 + 0.5) * sc)


for row in cal["intersections"]:
    for x, y in row:
        X, Y = P(x, y)
        d.line([(X - 5, Y), (X + 5, Y)], fill=(0, 200, 220))
        d.line([(X, Y - 5), (X, Y + 5)], fill=(0, 200, 220))
shapes = cfg["shapes"]
for s in cfg["symbols"]:
    r = rd[s["id"]]
    if "merged" in s:
        a, b, c, e = r["ink_box_px"]
        d.rectangle([P(a, b), P(c, e)], outline=(255, 140, 0))
        X, Y = P(c, b)
        d.text((X + 2, Y - 10), s["id"], fill=(255, 140, 0))
        continue
    cx, cy = float(r["px_x"]), float(r["px_y"])
    sh = tuple([shapes[s["type"]][0]] + [float(t) for t in shapes[s["type"]][1:]])
    col = (0, 160, 0) if r["how"] == "manual" else (230, 0, 200)
    R = int(max(sh[1:]) + 3)
    st = 0.25
    yy, xx = np.mgrid[-R:R + st:st, -R:R + st:st]
    dd = glyph.sdist(sh, xx, yy)
    on = np.abs(dd) < 0.13
    for u, v in zip(xx[on], yy[on]):
        X, Y = P(cx + u, cy + v)
        d.ellipse([X - 0.8, Y - 0.8, X + 0.8, Y + 0.8], fill=col)
    X, Y = P(cx, cy)
    d.line([(X - 3, Y), (X + 3, Y)], fill=col)
    d.line([(X, Y - 3), (X, Y + 3)], fill=col)
    d.text((X + R * sc * 0.7, Y - R * sc), s["id"], fill=col)
im.save(sys.argv[10])
