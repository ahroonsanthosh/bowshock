"""Enlarged sheet of chosen table cells, one per line, labelled.
usage: python3 -I cellsheet.py page.png rows.json x0 x1 scale out.png n1 n2 ...
Row n is the n-th text row (1-based) of rows.json from tabglyph.py.
"""
import json
import sys
from PIL import Image, ImageDraw

page = Image.open(sys.argv[1]).convert("L")
rows = json.load(open(sys.argv[2]))["rows"]
x0, x1 = int(sys.argv[3]), int(sys.argv[4])
s = int(sys.argv[5])
out = sys.argv[6]
ns = [int(v) for v in sys.argv[7:]]
tiles = []
for n in ns:
    a, b = rows[n - 1]["y"]
    t = page.crop((x0, a - 4, x1, b + 5))
    t = t.resize((t.width * s, t.height * s), Image.NEAREST)
    tiles.append((n, t))
W = max(t.width for _, t in tiles) + 70
H = sum(t.height + 6 for _, t in tiles)
im = Image.new("L", (W, H), 255)
d = ImageDraw.Draw(im)
y = 0
for n, t in tiles:
    d.text((2, y + t.height // 2 - 5), "row %d" % n, fill=0)
    im.paste(t, (70, y))
    y += t.height + 6
im.save(out)
