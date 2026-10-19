"""Whiten grid columns/rows of a 1-bit plot crop (columns or rows whose dark
fraction over the crop exceeds frac), to make overlapping symbols readable.
usage: degrid.py in.png out.png x0 y0 x1 y1 scale frac_col frac_row"""
import sys
import numpy as np
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7]); s = float(sys.argv[7]); fc, fr = float(sys.argv[8]), float(sys.argv[9])
a = np.asarray(Image.open(src).convert("L"), dtype=np.uint8)[y0:y1, x0:x1].copy()
d = a < 128
col = d.mean(axis=0); row = d.mean(axis=1)
b = a.copy()
for j in np.where(col > fc)[0]: b[:, j] = 255
for i in np.where(row > fr)[0]: b[i, :] = 255
im = Image.fromarray(b).convert("RGB").resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.NEAREST)
dr = ImageDraw.Draw(im)
for gy in range((y0 // 10 + 1) * 10, y1, 10):
    Y = (gy - y0) * s; dr.line([(0, Y), (im.size[0], Y)], fill=(150, 150, 255) if gy % 50 else (0, 0, 255))
    if gy % 50 == 0: dr.text((2, Y + 1), str(gy), fill=(0, 0, 200))
for gx in range((x0 // 10 + 1) * 10, x1, 10):
    X = (gx - x0) * s; dr.line([(X, 0), (X, im.size[1])], fill=(255, 170, 170) if gx % 50 else (255, 0, 0))
    if gx % 50 == 0: dr.text((X + 2, 2), str(gx), fill=(200, 0, 0))
im.save(out); print(out, im.size, "cols removed", int((col > fc).sum()), "rows", int((row > fr).sum()))
