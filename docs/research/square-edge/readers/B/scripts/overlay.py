"""Tile enlarged crops around fitted symbol centres, with the fitted outline drawn.
usage: python3 -I overlay.py page.png fits.csv r half scale out.png
fits.csv: id,type,px,py,... ; r = outline radius (ring/disc) or half-size.
"""
import csv
import sys
from PIL import Image, ImageDraw

page = Image.open(sys.argv[1]).convert("RGB")
rows = list(csv.DictReader(open(sys.argv[2])))
r, half, s = float(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
out = sys.argv[6]
tiles = []
for row in rows:
    x, y = float(row["px"]), float(row["py"])
    x0, y0 = int(x) - half, int(y) - half
    t = page.crop((x0, y0, x0 + 2 * half, y0 + 2 * half)).resize((2 * half * s, 2 * half * s), Image.NEAREST)
    d = ImageDraw.Draw(t)
    X = (x - x0 + 0.5) * s
    Y = (y - y0 + 0.5) * s
    typ = row.get("type", "ring")
    if typ in ("ring", "disc"):
        d.ellipse([X - r * s, Y - r * s, X + r * s, Y + r * s], outline=(255, 0, 0))
    elif typ == "square":
        d.rectangle([X - r * s, Y - r * s, X + r * s, Y + r * s], outline=(255, 0, 0))
    elif typ == "diamond":
        d.polygon([(X, Y - r * s), (X + r * s, Y), (X, Y + r * s), (X - r * s, Y)], outline=(255, 0, 0))
    d.line([(X - 6, Y), (X + 6, Y)], fill=(0, 0, 255))
    d.line([(X, Y - 6), (X, Y + 6)], fill=(0, 0, 255))
    d.text((3, 3), row["id"], fill=(0, 0, 255))
    tiles.append(t)
W = tiles[0].width
n = len(tiles)
cols = min(n, 5)
rowsn = (n + cols - 1) // cols
sheet = Image.new("RGB", (cols * (W + 6), rowsn * (W + 6)), (255, 255, 255))
for k, t in enumerate(tiles):
    sheet.paste(t, ((k % cols) * (W + 6), (k // cols) * (W + 6)))
sheet.save(out)
