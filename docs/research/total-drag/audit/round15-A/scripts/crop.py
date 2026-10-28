# usage: python3 -I crop.py in.png out.png x0 y0 x1 y1 [scale]
import sys
from PIL import Image
a = sys.argv
im = Image.open(a[1]).convert('L')
x0, y0, x1, y1 = map(int, a[3:7])
sc = float(a[7]) if len(a) > 7 else 1.0
c = im.crop((x0, y0, x1, y1))
if sc != 1.0:
    c = c.resize((int(c.size[0]*sc), int(c.size[1]*sc)), Image.LANCZOS)
c.save(a[2])
print(c.size)
