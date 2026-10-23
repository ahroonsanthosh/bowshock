"""Draw detect.py candidates on a page crop, for review by eye.

usage: python3 -I candov.py PAGE.png CANDS.json X0 Y0 X1 Y1 SCALE MINSCORE OUT.png
Each candidate above MINSCORE: a coloured cross by type, with its index in
the list and the type's first letter.
"""
import json
import sys

from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
page = Image.open(sys.argv[1]).convert("L")
cands = json.load(open(sys.argv[2]))
x0, y0, x1, y1 = map(int, sys.argv[3:7])
sc, mn = float(sys.argv[7]), float(sys.argv[8])
im = page.crop((x0, y0, x1, y1)).resize((int((x1 - x0) * sc), int((y1 - y0) * sc)), Image.LANCZOS).convert("RGB")
d = ImageDraw.Draw(im)
col = {"circle": (220, 0, 0), "square": (0, 140, 0), "diamond": (0, 0, 230), "tri_up": (200, 0, 200),
       "rtri": (230, 120, 0)}
for i, c in enumerate(cands):
    if c["score"] < mn or not (x0 <= c["x"] < x1 and y0 <= c["y"] < y1):
        continue
    X, Y = (c["x"] - x0) * sc, (c["y"] - y0) * sc
    k = col.get(c["type"], (0, 150, 150))
    d.line([(X - 6, Y), (X + 6, Y)], fill=k, width=2)
    d.line([(X, Y - 6), (X, Y + 6)], fill=k, width=2)
    d.text((X + 6, Y - 12), "%d%s" % (i, c["type"][0]), fill=k)
im.save(sys.argv[9])
