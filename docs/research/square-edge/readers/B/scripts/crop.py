"""Crop a region of a page image and enlarge it for viewing.
usage: python3 -I crop.py in.png out.png x0 y0 x1 y1 scale [tick]
Coordinates are native pixels. If tick>0, pixel-coordinate rulers are
drawn every `tick` native pixels along the top and left edges so that
positions can be read off the enlarged view.
"""
import sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
s = float(sys.argv[7])
tick = int(sys.argv[8]) if len(sys.argv) > 8 else 0
im = Image.open(src).convert("RGB").crop((x0, y0, x1, y1))
im = im.resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.LANCZOS)
if tick:
    pad = 40
    big = Image.new("RGB", (im.width + pad, im.height + pad), (255, 255, 255))
    big.paste(im, (pad, pad))
    d = ImageDraw.Draw(big)
    for x in range((x0 // tick + 1) * tick, x1, tick):
        px = pad + (x - x0) * s
        d.line([(px, 0), (px, pad - 2)], fill=(255, 0, 0))
        d.text((px + 2, 2), str(x), fill=(255, 0, 0))
    for y in range((y0 // tick + 1) * tick, y1, tick):
        py = pad + (y - y0) * s
        d.line([(0, py), (pad - 2, py)], fill=(255, 0, 0))
        d.text((2, py + 2), str(y), fill=(255, 0, 0))
    im = big
im.save(out)
print(out, im.size)
