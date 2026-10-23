"""Round 12: enlarge a region of the page image with a labelled pixel grid, for eye reading.

Usage: python3 -I zoom.py PAGE_PNG OUT_PNG x0 y0 x1 y1 scale grid
Grid lines every `grid` page pixels, labelled with page pixel coordinates.
Optional extra args: marks as x,y pairs (page pixels) drawn as small red crosses.
"""
import sys
from PIL import Image, ImageDraw

page, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, s, g = map(int, sys.argv[3:9])
marks = [tuple(map(float, m.split(','))) for m in sys.argv[9:]]
im = Image.open(page).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize(((x1 - x0) * s, (y1 - y0) * s), Image.NEAREST)
d = ImageDraw.Draw(im)
for x in range((x0 // g + 1) * g, x1, g):
    d.line([((x - x0) * s, 0), ((x - x0) * s, im.size[1])], fill=(120, 180, 255))
    d.text(((x - x0) * s + 2, 2), str(x), fill=(0, 0, 255))
for y in range((y0 // g + 1) * g, y1, g):
    d.line([(0, (y - y0) * s), (im.size[0], (y - y0) * s)], fill=(120, 180, 255))
    d.text((2, (y - y0) * s + 2), str(y), fill=(0, 0, 255))
for mx, my in marks:
    px, py = (mx - x0) * s, (my - y0) * s
    d.line([(px - 6, py), (px + 6, py)], fill=(255, 0, 0), width=2)
    d.line([(px, py - 6), (px, py + 6)], fill=(255, 0, 0), width=2)
im.save(out)
