# High zoom of a native-scan window with contrast stretch and a 1-px grid every 5 px.
# usage: 06_zoom.py in.jpg out.png x0 y0 x1 y1 scale
import sys
import numpy as np
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, s = map(int, sys.argv[3:8])
g = np.asarray(Image.open(src).convert('L')).astype(float)[y0:y1, x0:x1]
lo, hi = np.percentile(g, 1), np.percentile(g, 99.5)
g = np.clip((g - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)
im = Image.fromarray(g).resize(((x1 - x0) * s, (y1 - y0) * s), Image.NEAREST).convert('RGB')
d = ImageDraw.Draw(im)
for x in range(x0, x1):
    if x % 5 == 0:
        X = (x - x0) * s
        d.line([(X, 0), (X, im.height)], fill=(255, 160, 160) if x % 10 else (255, 60, 60))
        if x % 10 == 0: d.text((X + 2, 2), str(x), fill=(200, 0, 0))
for y in range(y0, y1):
    if y % 5 == 0:
        Y = (y - y0) * s
        d.line([(0, Y), (im.width, Y)], fill=(160, 160, 255) if y % 10 else (60, 60, 255))
        if y % 10 == 0: d.text((2, Y + 2), str(y), fill=(0, 0, 200))
im.save(dst)
print(dst, im.size)
