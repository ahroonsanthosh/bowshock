"""A sheet of zoomed crops around given points, for typing symbols by eye.

usage: python3 -I sheet.py PAGE.png HALF SCALE COLS OUT.png id:x:y [id:x:y ...]
Each tile is the page square of half-size HALF px around (x, y), scaled by
SCALE (nearest neighbour, so pixels stay visible), labelled with its id and
centre; a small red cross marks the given centre and red ticks on the tile's
edges mark every 5 px of page position.
"""
import sys
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
page = Image.open(sys.argv[1]).convert("L")
half, sc, cols, out = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
items = []
for a in sys.argv[6:]:
    i, x, y = a.split(":")
    items.append((i, float(x), float(y)))
T = (2 * half + 1) * sc
rows = (len(items) + cols - 1) // cols
can = Image.new("RGB", (cols * (T + 6), rows * (T + 18)), "white")
d = ImageDraw.Draw(can)
for k, (i, x, y) in enumerate(items):
    cx, cy = int(round(x)), int(round(y))
    t = page.crop((cx - half, cy - half, cx + half + 1, cy + half + 1)).resize((T, T), Image.NEAREST).convert("RGB")
    ox, oy = (k % cols) * (T + 6), (k // cols) * (T + 18) + 16
    can.paste(t, (ox, oy))
    d.text((ox + 2, oy - 15), "%s %g,%g" % (i, x, y), fill="blue")
    px, py = ox + (x - (cx - half) + 0.5) * sc, oy + (y - (cy - half) + 0.5) * sc
    d.line([(px - 4, py), (px + 4, py)], fill="red")
    d.line([(px, py - 4), (px, py + 4)], fill="red")
    for p in range(cx - half, cx + half + 1):
        if p % 5 == 0:
            X = ox + (p - (cx - half) + 0.5) * sc
            d.line([(X, oy), (X, oy + (6 if p % 10 == 0 else 3))], fill="red")
    for p in range(cy - half, cy + half + 1):
        if p % 5 == 0:
            Y = oy + (p - (cy - half) + 0.5) * sc
            d.line([(ox, Y), (ox + (6 if p % 10 == 0 else 3), Y)], fill="red")
can.save(out)
