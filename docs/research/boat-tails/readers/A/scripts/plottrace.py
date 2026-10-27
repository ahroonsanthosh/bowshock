"""Overlay traced and emitted points on a crop. usage: plottrace.py IMG X0 Y0 X1 Y1 SCALE OUT JSON [JSON...]"""
import sys, json
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB')
x0, y0, x1, y1 = map(int, sys.argv[2:6]); S = int(sys.argv[6]); out = sys.argv[7]
c = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * S, (y1 - y0) * S), Image.NEAREST)
d = ImageDraw.Draw(c)
cols = [(255, 0, 0), (0, 0, 255), (0, 150, 0)]
for k, f in enumerate(sys.argv[8:]):
    J = json.load(open(f))
    for (x, y) in J['traced']:
        X, Y = (x - x0 + 0.5) * S, (y - y0 + 0.5) * S
        d.point((X, Y), fill=cols[k % 3])
    for i, (x, y) in enumerate(J['emitted']):
        X, Y = (x - x0 + 0.5) * S, (y - y0 + 0.5) * S
        d.ellipse((X - 4, Y - 4, X + 4, Y + 4), outline=cols[k % 3])
        d.text((X + 5, Y - 12), str(i), fill=cols[k % 3])
c.save(out)
