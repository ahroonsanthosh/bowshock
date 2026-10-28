import sys
from PIL import Image
src, out, x0, y0, x1, y1, scale = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7]), float(sys.argv[7])
im = Image.open(src).crop((x0, y0, x1, y1))
if scale != 1:
    im = im.resize((int(im.size[0]*scale), int(im.size[1]*scale)), Image.NEAREST)
im.save(out)
print(im.size)
