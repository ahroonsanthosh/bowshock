"""Round 12: draw numbered candidate centres over an enlarged crop of the page image.

Usage: python3 -I marks.py PAGE_PNG CANDS_CSV OUT_PNG x0 y0 x1 y1 scale
CANDS_CSV rows: name,x,y[,...] in page pixels (lines starting with # are skipped).
Circles are drawn red, squares blue, anything else green; the number is the row index.
"""
import sys
from PIL import Image, ImageDraw

page, cands, out = sys.argv[1:4]
x0, y0, x1, y1, s = map(int, sys.argv[4:9])
rows = [l.strip().split(',') for l in open(cands) if l.strip() and not l.startswith('#')]
im = Image.open(page).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize(((x1 - x0) * s, (y1 - y0) * s), Image.NEAREST)
d = ImageDraw.Draw(im)
col = {'circle': (230, 0, 0), 'square': (0, 80, 255)}
for i, r in enumerate(rows):
    x, y = float(r[1]), float(r[2])
    if not (x0 <= x < x1 and y0 <= y < y1):
        continue
    px, py = (x - x0) * s, (y - y0) * s
    c = col.get(r[0], (0, 160, 0))
    d.line([(px - 4, py), (px + 4, py)], fill=c, width=1)
    d.line([(px, py - 4), (px, py + 4)], fill=c, width=1)
    d.text((px + 9 * s / 2, py - 5), str(i), fill=c)
im.save(out)
