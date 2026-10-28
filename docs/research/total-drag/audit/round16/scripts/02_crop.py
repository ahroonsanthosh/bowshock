# Crop a region of the native scan and optionally upscale (nearest neighbour) for viewing.
# usage: 02_crop.py in.jpg out.png x0 y0 x1 y1 scale [grid_step]
import sys
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, s = map(int, sys.argv[3:8])
step = int(sys.argv[8]) if len(sys.argv) > 8 else 0
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((im.width * s, im.height * s), Image.NEAREST)
if step:
    d = ImageDraw.Draw(im)
    for gx in range((x0 // step + 1) * step, x1, step):
        X = (gx - x0) * s
        d.line([(X, 0), (X, 6)], fill=(255, 0, 0))
        d.text((X + 2, 0), str(gx), fill=(255, 0, 0))
    for gy in range((y0 // step + 1) * step, y1, step):
        Y = (gy - y0) * s
        d.line([(0, Y), (6, Y)], fill=(255, 0, 0))
        d.text((8, Y - 5), str(gy), fill=(255, 0, 0))
im.save(dst)
print(dst, im.size)
