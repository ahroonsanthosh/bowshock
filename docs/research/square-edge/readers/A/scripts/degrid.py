"""Show a crop with the printed grid painted pale blue, so symbol strokes
stand out (for reading by eye only; no values are taken from this image).

usage: python3 -I degrid.py IMG X0 Y0 X1 Y1 SCALE OUT.png [GRIDBOX x0,y0,x1,y1]
Grid lines are found (figlib.detect_lines) in the GRIDBOX (default: the
crop grown by 120 px); pixels within 1 px of a line are painted.
A tick scale in native pixels is drawn along the top and left edges.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from figlib import load_grey, detect_lines

img = sys.argv[1]; X0, Y0, X1, Y1 = (int(v) for v in sys.argv[2:6]); sc = int(sys.argv[6]); out = sys.argv[7]
gb = [int(v) for v in sys.argv[8].split(",")] if len(sys.argv) > 8 else [X0 - 120, Y0 - 120, X1 + 120, Y1 + 120]
g = load_grey(img)
vx = detect_lines(g, "v", gb[0], gb[1], gb[2], gb[3], minsep=4, k=5)
hy = detect_lines(g, "h", gb[0], gb[1], gb[2], gb[3], minsep=4, k=5)
crop = g[Y0:Y1, X0:X1]
rgb = np.stack([crop] * 3, axis=-1)
xs = np.arange(X0, X1); ys = np.arange(Y0, Y1)
onv = np.zeros(len(xs), bool); onh = np.zeros(len(ys), bool)
for v in vx:
    onv |= np.abs(xs - v) <= 1.0
for h in hy:
    onh |= np.abs(ys - h) <= 1.0
mask = onv[None, :] | onh[:, None]
dark = crop < 200
paint = mask & dark
rgb[paint] = [200, 225, 255]
im = Image.fromarray(rgb.astype(np.uint8)).resize(((X1 - X0) * sc, (Y1 - Y0) * sc), Image.NEAREST)
canvas = Image.new("RGB", (im.width + 40, im.height + 20), (255, 255, 255))
canvas.paste(im, (40, 20))
dr = ImageDraw.Draw(canvas)
for x in range(X0 - X0 % 10 + 10, X1, 10):
    dr.line((40 + (x - X0) * sc, 12, 40 + (x - X0) * sc, 19), fill=(255, 0, 0))
    if x % 20 == 0:
        dr.text((40 + (x - X0) * sc - 10, 0), str(x), fill=(255, 0, 0))
for y in range(Y0 - Y0 % 10 + 10, Y1, 10):
    dr.line((32, 20 + (y - Y0) * sc, 39, 20 + (y - Y0) * sc), fill=(255, 0, 0))
    if y % 20 == 0:
        dr.text((0, 20 + (y - Y0) * sc - 5), str(y), fill=(255, 0, 0))
canvas.save(out)
print(out, canvas.size, f"{len(vx)} vertical and {len(hy)} horizontal grid lines painted")
