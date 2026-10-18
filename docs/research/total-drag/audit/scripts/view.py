"""Crop a region of a rendered page, enlarge it, and overlay a labelled
pixel-coordinate grid (original page pixels) so positions can be read off.
usage: view.py in.png out.png x0 y0 x1 y1 scale step
"""
import sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
scale = float(sys.argv[7])
step = int(sys.argv[8])
im = Image.open(src).convert("RGB").crop((x0, y0, x1, y1))
W, H = int((x1 - x0) * scale), int((y1 - y0) * scale)
im = im.resize((W, H), Image.LANCZOS)
d = ImageDraw.Draw(im)
gx = (x0 // step + 1) * step
while gx < x1:
    X = (gx - x0) * scale
    major = gx % (step * 5) == 0
    d.line([(X, 0), (X, H)], fill=(255, 0, 0) if major else (255, 170, 170), width=1)
    if major:
        d.text((X + 2, 2), str(gx), fill=(200, 0, 0))
        d.text((X + 2, H - 12), str(gx), fill=(200, 0, 0))
    gx += step
gy = (y0 // step + 1) * step
while gy < y1:
    Y = (gy - y0) * scale
    major = gy % (step * 5) == 0
    d.line([(0, Y), (W, Y)], fill=(0, 0, 255) if major else (170, 170, 255), width=1)
    if major:
        d.text((2, Y + 1), str(gy), fill=(0, 0, 200))
        d.text((W - 40, Y + 1), str(gy), fill=(0, 0, 200))
    gy += step
im.save(out)
print(out, im.size)
