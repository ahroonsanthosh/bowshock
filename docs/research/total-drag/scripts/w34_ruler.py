"""Crop a figure with a ruler overlay for reading by eye.
Usage: python3 -I ruler.py <image> <cal.json> <out.png> <a_lo> <a_hi> <v_lo> <v_hi>
       <da> <dv> [scale]
Draws thin red lines every da along the abscissa and every dv along the
ordinate (in the calibration's units), labelled, over the crop."""
import json
import sys
from PIL import Image, ImageDraw

im = Image.open(sys.argv[1]).convert('RGB')
c = json.load(open(sys.argv[2]))
out = sys.argv[3]
alo, ahi, vlo, vhi, da, dv = map(float, sys.argv[4:10])
scale = float(sys.argv[10]) if len(sys.argv) > 10 else 1.0


def xpx(a):
    return c['x0'] + (a - c['xa']) * (c['x1'] - c['x0']) / (c['xb'] - c['xa'])


def ypx(v):
    return c['y0'] + (v - c['v0']) * (c['y1'] - c['y0']) / (c['v1'] - c['v0'])


X0, X1 = sorted([xpx(alo), xpx(ahi)])
Y0, Y1 = sorted([ypx(vlo), ypx(vhi)])
crop = im.crop((int(X0) - 30, int(Y0) - 30, int(X1) + 30, int(Y1) + 30))
d = ImageDraw.Draw(crop)
ox, oy = int(X0) - 30, int(Y0) - 30
a = alo
k = 0
while a <= ahi + 1e-9:
    x = xpx(a) - ox
    d.line([(x, 0), (x, crop.size[1])], fill=(255, 0, 0) if k % 2 == 0 else (255, 150, 150), width=1)
    d.text((x + 2, 2), f'{a:g}', fill=(200, 0, 0))
    a += da
    k += 1
v = vlo
k = 0
while v <= vhi + 1e-9:
    y = ypx(v) - oy
    d.line([(0, y), (crop.size[0], y)], fill=(0, 0, 255) if k % 2 == 0 else (150, 150, 255), width=1)
    d.text((2, y + 1), f'{v:.2f}', fill=(0, 0, 200))
    v += dv
    k += 1
if scale != 1.0:
    crop = crop.resize((int(crop.size[0] * scale), int(crop.size[1] * scale)), Image.LANCZOS)
crop.save(out)
print(out, crop.size)
