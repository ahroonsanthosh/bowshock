"""A zoomed view of part of a scanned plot with a pixel ruler, for placing
symbol centres by eye. Usage:
python3 -I zoom.py <image> x0 y0 x1 y1 scale step <out.png>
Draws thin red lines every `step` source pixels and labels them with the
source pixel coordinate, so positions read on the view are source pixels."""
import sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[8]
x0, y0, x1, y1, scale, step = map(int, sys.argv[2:8])
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.NEAREST)
d = ImageDraw.Draw(im)
for x in range((x0 // step + 1) * step, x1, step):
    X = (x - x0) * scale
    d.line([(X, 0), (X, im.size[1])], fill=(255, 120, 120) if x % (5 * step) else (255, 0, 0), width=1)
    if x % (5 * step) == 0:
        d.text((X + 2, 2), str(x), fill=(200, 0, 0))
for y in range((y0 // step + 1) * step, y1, step):
    Y = (y - y0) * scale
    d.line([(0, Y), (im.size[0], Y)], fill=(120, 120, 255) if y % (5 * step) else (0, 0, 255), width=1)
    if y % (5 * step) == 0:
        d.text((2, Y + 2), str(y), fill=(0, 0, 200))
im.save(out)
