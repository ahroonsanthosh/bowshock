# Bicubic zoom of a native-scan window, contrast stretched, with border ticks every 5 px
# and optional crosshair markers given as x,y pairs (native pixel coordinates).
# usage: 07_zoomsmooth.py in.jpg out.png x0 y0 x1 y1 scale [x,y ...]
import sys
import numpy as np
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, s = map(int, sys.argv[3:8])
marks = [tuple(map(float, a.split(','))) for a in sys.argv[8:]]
g = np.asarray(Image.open(src).convert('L')).astype(float)[y0:y1, x0:x1]
lo, hi = np.percentile(g, 1), np.percentile(g, 99.5)
g = np.clip((g - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)
im = Image.fromarray(g).resize(((x1 - x0) * s, (y1 - y0) * s), Image.BICUBIC).convert('RGB')
pad = 30
can = Image.new('RGB', (im.width + pad, im.height + pad), (255, 255, 255))
can.paste(im, (pad, pad))
d = ImageDraw.Draw(can)
for x in range(x0, x1 + 1):
    if x % 5 == 0:
        X = pad + (x - x0) * s + s // 2
        d.line([(X, pad - 8), (X, pad)], fill=(200, 0, 0))
        if x % 10 == 0: d.text((X - 10, 2), str(x), fill=(200, 0, 0))
for y in range(y0, y1 + 1):
    if y % 5 == 0:
        Y = pad + (y - y0) * s + s // 2
        d.line([(pad - 8, Y), (pad, Y)], fill=(0, 0, 200))
        if y % 10 == 0: d.text((0, Y - 12), str(y), fill=(0, 0, 200))
for (mx, my) in marks:
    X = pad + (mx - x0) * s + s / 2; Y = pad + (my - y0) * s + s / 2
    d.line([(X - 6, Y), (X + 6, Y)], fill=(255, 0, 0)); d.line([(X, Y - 6), (X, Y + 6)], fill=(255, 0, 0))
can.save(dst)
print(dst, can.size)
