"""Crop a region of an image and overlay a pixel ruler (full-image coordinates) for manual reading.
usage: ruler_crop.py image out.png x0 y0 x1 y1 [scale] [step]"""
import sys
from PIL import Image, ImageDraw

im = Image.open(sys.argv[1]).convert("RGB")
out = sys.argv[2]
x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
scale = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
step = int(sys.argv[8]) if len(sys.argv) > 8 else 50
c = im.crop((x0, y0, x1, y1))
c = c.resize((int(c.width * scale), int(c.height * scale)))
pad = 40
canvas = Image.new("RGB", (c.width + pad, c.height + pad), (255, 255, 255))
canvas.paste(c, (pad, pad))
d = ImageDraw.Draw(canvas)
for x in range((x0 // step + 1) * step, x1, step):
    px = pad + (x - x0) * scale
    d.line([(px, pad - 8), (px, pad + c.height)], fill=(255, 0, 0) if x % (2 * step) == 0 else (255, 160, 160), width=1)
    if x % (2 * step) == 0:
        d.text((px - 12, 2), str(x), fill=(200, 0, 0))
for y in range((y0 // step + 1) * step, y1, step):
    py = pad + (y - y0) * scale
    d.line([(pad - 8, py), (pad + c.width, py)], fill=(0, 0, 255) if y % (2 * step) == 0 else (160, 160, 255), width=1)
    if y % (2 * step) == 0:
        d.text((0, py - 6), str(y), fill=(0, 0, 200))
canvas.save(out)
