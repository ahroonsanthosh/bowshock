"""Draw fitted triangle outlines (stroke centrelines) and centroids on a zoomed crop.
Usage: tricheck.py page out x0 y0 x1 y1 scale w h cx,cy[,colour] ...
Pixel centre convention: pixel i spans [i-0.5, i+0.5]."""
import sys
from PIL import Image, ImageDraw, ImageOps
src, dst = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, k = map(int, sys.argv[3:8])
w, h = float(sys.argv[8]), float(sys.argv[9])
im = Image.open(src).convert('L').crop((x0, y0, x1, y1))
im = ImageOps.autocontrast(im, cutoff=0.5)
im = im.resize((im.width * k, im.height * k), Image.NEAREST).convert('RGB')
d = ImageDraw.Draw(im)
def P(x, y):
    return ((x - x0 + 0.5) * k, (y - y0 + 0.5) * k)
cols = {'r': (230, 0, 0), 'b': (0, 90, 255), 'g': (0, 160, 0), 'm': (200, 0, 200)}
for spec in sys.argv[10:]:
    parts = spec.split(',')
    cx, cy = float(parts[0]), float(parts[1])
    c = cols.get(parts[2] if len(parts) > 2 else 'r', (230, 0, 0))
    pts = [P(cx, cy - 2 * h / 3), P(cx - w / 2, cy + h / 3), P(cx + w / 2, cy + h / 3)]
    d.line(pts + [pts[0]], fill=c, width=1)
    X, Y = P(cx, cy)
    d.line([(X - 5, Y), (X + 5, Y)], fill=c, width=1)
    d.line([(X, Y - 5), (X, Y + 5)], fill=c, width=1)
im.save(dst)
