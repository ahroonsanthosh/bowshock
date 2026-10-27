# usage: python3 -I crop.py <in.png> <x0> <y0> <x1> <y1> <scale> <out.png> [grid_step]
# crops a region, rescales by <scale> (Lanczos), optionally overlays a labelled pixel grid
import sys
from PIL import Image, ImageDraw
src, x0, y0, x1, y1, sc, out = sys.argv[1], *map(int, sys.argv[2:6]), float(sys.argv[6]), sys.argv[7]
step = int(sys.argv[8]) if len(sys.argv) > 8 else 0
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((int((x1-x0)*sc), int((y1-y0)*sc)), Image.LANCZOS)
if step:
    d = ImageDraw.Draw(im)
    for gx in range((x0//step+1)*step, x1, step):
        X = (gx-x0)*sc; d.line([(X, 0), (X, im.size[1])], fill=(255, 0, 0), width=1); d.text((X+2, 2), str(gx), fill=(255, 0, 0))
    for gy in range((y0//step+1)*step, y1, step):
        Y = (gy-y0)*sc; d.line([(0, Y), (im.size[0], Y)], fill=(0, 0, 255), width=1); d.text((2, Y+2), str(gy), fill=(0, 0, 255))
im.save(out)
print(out, im.size)
