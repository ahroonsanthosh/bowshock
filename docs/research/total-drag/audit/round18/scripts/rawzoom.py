"""Raw ink zoom with a faint pixel grid every 5 px and tick labels. Usage: rawzoom.py img.png x0 y0 x1 y1 scale out.png"""
import sys
import numpy as np
from PIL import Image, ImageDraw
a = np.array(Image.open(sys.argv[1]).convert('L')) < 128
x0, y0, x1, y1, sc = map(int, sys.argv[2:7])
sub = a[y0:y1, x0:x1]
v = np.full(sub.shape + (3,), 255, np.uint8); v[sub] = (0, 0, 0)
im = Image.fromarray(v).resize(((x1-x0)*sc, (y1-y0)*sc), Image.NEAREST)
dr = ImageDraw.Draw(im)
for x in range(x0 - x0 % 10 + 10, x1, 10):
    dr.line([((x-x0)*sc, 0), ((x-x0)*sc, im.size[1])], fill=(255, 150, 150) if x % 50 else (255, 0, 0))
for y in range(y0 - y0 % 10 + 10, y1, 10):
    dr.line([(0, (y-y0)*sc), (im.size[0], (y-y0)*sc)], fill=(150, 200, 150) if y % 50 else (0, 160, 0))
for x in range(x0 - x0 % 10 + 10, x1, 10):
    dr.text(((x-x0)*sc + 2, 2), str(x % 1000), fill=(200, 0, 0))
for y in range(y0 - y0 % 10 + 10, y1, 10):
    dr.text((2, (y-y0)*sc + 2), str(y), fill=(0, 120, 0))
im.save(sys.argv[7])
print(im.size)
