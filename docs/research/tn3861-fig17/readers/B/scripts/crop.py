# crop.py in out x0 y0 x1 y1 scale : crop the display-orientation page image (pixel coords) and upscale with nearest neighbour or lanczos
import sys
from PIL import Image
im = Image.open(sys.argv[1])
x0, y0, x1, y1 = map(int, sys.argv[3:7])
s = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
c = im.crop((x0, y0, x1, y1))
if s != 1.0:
    c = c.resize((int(c.size[0]*s), int(c.size[1]*s)), Image.Resampling.LANCZOS)
c.save(sys.argv[2])
print(c.size)
