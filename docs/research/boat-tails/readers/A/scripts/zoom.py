"""Zoomed crop with a pixel ruler on the margins (every 10 px, labels every 50).

usage: python3 -I zoom.py IMG ROT CX CY HALF SCALE OUT
Crop centred on (CX, CY) source px (after rotation), +-HALF px, upscaled by
SCALE with nearest neighbour.  Ruler ticks drawn in a white margin.
"""
import sys
from PIL import Image, ImageDraw
img, rot = sys.argv[1], int(sys.argv[2])
cx, cy, half, sc = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
out = sys.argv[7]
im = Image.open(img).convert('RGB')
if rot:
    im = im.rotate(rot, expand=True, fillcolor=(255, 255, 255))
x0, y0 = cx - half, cy - half
c = im.crop((x0, y0, cx + half, cy + half)).resize((2 * half * sc, 2 * half * sc), Image.NEAREST)
M = 40
canvas = Image.new('RGB', (c.width + 2 * M, c.height + 2 * M), (255, 255, 255))
canvas.paste(c, (M, M))
d = ImageDraw.Draw(canvas)
for v in range((x0 // 10 + 1) * 10, cx + half, 10):
    X = M + (v - x0) * sc
    L = 12 if v % 50 == 0 else 6
    d.line([(X, M - L), (X, M)], fill=(0, 0, 255))
    d.line([(X, M + c.height), (X, M + c.height + L)], fill=(0, 0, 255))
    if v % 50 == 0:
        d.text((X - 10, 2), str(v), fill=(0, 0, 255))
        d.text((X - 10, M + c.height + 14), str(v), fill=(0, 0, 255))
for v in range((y0 // 10 + 1) * 10, cy + half, 10):
    Y = M + (v - y0) * sc
    L = 12 if v % 50 == 0 else 6
    d.line([(M - L, Y), (M, Y)], fill=(200, 0, 0))
    d.line([(M + c.width, Y), (M + c.width + L, Y)], fill=(200, 0, 0))
    if v % 50 == 0:
        d.text((0, Y + 2), str(v), fill=(200, 0, 0))
        d.text((M + c.width + 2, Y + 2), str(v), fill=(200, 0, 0))
canvas.save(out)
