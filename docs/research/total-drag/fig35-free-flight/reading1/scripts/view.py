"""Crop a region of an image (optionally scaled) and save it, with M / P_B ticks for the rectified image.
usage: view.py src.png out.png u0 v0 u1 v1 scale [rect]"""
import sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
u0, v0, u1, v1 = map(int, sys.argv[3:7])
scale = float(sys.argv[7])
rect = len(sys.argv) > 8
im = Image.open(src).convert('RGB').crop((u0, v0, u1, v1))
if scale != 1.0:
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
if rect:
    d = ImageDraw.Draw(im)
    for k in range(0, 40):
        u = 320 + 160 * k
        if u0 <= u <= u1:
            x = (u - u0) * scale
            d.text((x + 2, 2), f'M{1.0 + 0.1 * k:.1f}', fill=(200, 0, 0))
    for j in range(0, 30):
        v = 320 + 160 * j
        if v0 <= v <= v1:
            y = (v - v0) * scale
            d.text((2, y + 2), f'{-0.36 + 0.02 * j:.2f}', fill=(0, 0, 200))
im.save(out)
print(out, im.size)
