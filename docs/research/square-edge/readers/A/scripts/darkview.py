"""Show only the darkest pixels of a crop (symbol strokes are darker than the
printed grid on this page), with a native-pixel ruler, for reading by eye.
usage: python3 -I darkview.py IMG X0 Y0 X1 Y1 SCALE THR OUT.png"""
import sys
import numpy as np
from PIL import Image, ImageDraw
img = sys.argv[1]; X0, Y0, X1, Y1 = (int(v) for v in sys.argv[2:6]); sc = int(sys.argv[6]); thr = float(sys.argv[7]); out = sys.argv[8]
g = np.asarray(Image.open(img).convert("L")).astype(float)[Y0:Y1, X0:X1]
v = np.where(g < thr, 0, np.where(g < thr + 40, 200, 255)).astype(np.uint8)
im = Image.fromarray(v).convert("RGB").resize(((X1 - X0) * sc, (Y1 - Y0) * sc), Image.NEAREST)
canvas = Image.new("RGB", (im.width + 40, im.height + 20), (255, 255, 255)); canvas.paste(im, (40, 20))
dr = ImageDraw.Draw(canvas)
for x in range(X0 - X0 % 10 + 10, X1, 10):
    dr.line((40 + (x - X0) * sc, 0 if x % 50 == 0 else 12, 40 + (x - X0) * sc, 19), fill=(255, 0, 0))
    if x % 50 == 0:
        dr.text((40 + (x - X0) * sc + 2, 0), str(x), fill=(255, 0, 0))
for y in range(Y0 - Y0 % 10 + 10, Y1, 10):
    dr.line((0 if y % 50 == 0 else 32, 20 + (y - Y0) * sc, 39, 20 + (y - Y0) * sc), fill=(255, 0, 0))
    if y % 50 == 0:
        dr.text((0, 20 + (y - Y0) * sc + 2), str(y), fill=(255, 0, 0))
canvas.save(out); print(out, canvas.size)
