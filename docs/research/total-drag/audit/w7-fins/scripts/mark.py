"""Draw numbered candidate centres on a crop, scaled, for review by eye.
Usage: python3 -I mark.py <image> <cands.csv> x0 y0 x1 y1 scale <out.png> [idcol]
The csv has x, y (page pixels) and optionally an id column; otherwise
rows are numbered from 0."""
import csv
import sys
from PIL import Image, ImageDraw

x0, y0, x1, y1, s = map(int, sys.argv[3:8])
im = Image.open(sys.argv[1]).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize(((x1 - x0) * s, (y1 - y0) * s), Image.NEAREST)
d = ImageDraw.Draw(im)
idcol = sys.argv[9] if len(sys.argv) > 9 else None
for i, r in enumerate(csv.DictReader(open(sys.argv[2]))):
    x, y = float(r['x']), float(r['y'])
    if not (x0 <= x < x1 and y0 <= y < y1):
        continue
    X, Y = (x - x0) * s, (y - y0) * s
    d.line([(X - 4, Y), (X + 4, Y)], fill=(255, 0, 0))
    d.line([(X, Y - 4), (X, Y + 4)], fill=(255, 0, 0))
    d.text((X + 5, Y - 12), r[idcol] if idcol else str(i), fill=(0, 0, 255))
im.save(sys.argv[8])
