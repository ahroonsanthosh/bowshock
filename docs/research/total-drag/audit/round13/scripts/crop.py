"""Crop a page image, optionally scaled, with an optional pixel ruler.

usage: python3 -I crop.py PAGE.png X0 Y0 X1 Y1 SCALE OUT.png [ruler]
Coordinates are page pixels. With 'ruler', tick marks labelled in page px
are drawn on a margin (every 10 px, long and labelled every 50, when the
scale is 2 or more; every 50, labelled every 250, otherwise), so positions
can be read off the crop.
"""
import sys
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
page = sys.argv[1]
x0, y0, x1, y1 = map(int, sys.argv[2:6])
sc = float(sys.argv[6])
out = sys.argv[7]
ruler = len(sys.argv) > 8
im = Image.open(page).convert("L").crop((x0, y0, x1, y1))
im = im.resize((int((x1 - x0) * sc), int((y1 - y0) * sc)), Image.LANCZOS if sc < 1 else Image.NEAREST)
if ruler:
    M = 40
    can = Image.new("RGB", (im.width + M, im.height + M), "white")
    can.paste(im.convert("RGB"), (M, M))
    d = ImageDraw.Draw(can)
    step = 10 if sc >= 2 else 50
    for x in range((x0 // step) * step, x1 + 1, step):
        if x < x0:
            continue
        X = M + (x - x0) * sc
        big = x % (step * 5) == 0
        d.line([(X, M - (12 if big else 5)), (X, M)], fill="red")
        if big:
            d.text((X + 1, 2), str(x), fill="red")
    for y in range((y0 // step) * step, y1 + 1, step):
        if y < y0:
            continue
        Y = M + (y - y0) * sc
        big = y % (step * 5) == 0
        d.line([(M - (12 if big else 5), Y), (M, Y)], fill="red")
        if big:
            d.text((1, Y + 1), str(y), fill="red")
    im = can
im.save(out)
