"""Paste chosen column strips of a table page side by side, in row bands.
usage: python3 -I colcut.py page.png out_prefix y0 y1 nbands scale xa0 xa1 [xb0 xb1 ...]
Writes out_prefix_<k>.png for k = 1..nbands; each band shows the given
column strips (native x ranges) of rows y0..y1, with native y ruler marks.
"""
import sys
from PIL import Image, ImageDraw

page = Image.open(sys.argv[1]).convert("L")
pre = sys.argv[2]
y0, y1, nb = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
s = float(sys.argv[6])
xs = [int(v) for v in sys.argv[7:]]
cols = list(zip(xs[0::2], xs[1::2]))
h = (y1 - y0 + nb - 1) // nb
for k in range(nb):
    a = y0 + k * h - 8
    b = min(y1, y0 + (k + 1) * h) + 8
    strips = [page.crop((c0, a, c1, b)) for c0, c1 in cols]
    W = sum(st.width for st in strips) + 12 * (len(strips) - 1) + 50
    im = Image.new("L", (W, b - a), 255)
    x = 50
    for st in strips:
        im.paste(st, (x, 0))
        x += st.width + 12
    d = ImageDraw.Draw(im)
    for y in range((a // 20 + 1) * 20, b, 20):
        d.line([(0, y - a), (8, y - a)], fill=0)
        d.text((10, y - a - 5), str(y), fill=0)
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    im.save("%s_%d.png" % (pre, k + 1))
    print("%s_%d.png" % (pre, k + 1), im.size)
