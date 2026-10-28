"""Crop a region of the native page image (original page coordinates), optionally
rotate it clockwise by 90 deg for upright viewing, scale it, and save.
usage: python -I crop.py in.png out.png x0 y0 x1 y1 scale rot(0|1)"""
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
scale = float(sys.argv[7]); rot = int(sys.argv[8])
im = Image.open(src).convert('L').crop((x0, y0, x1, y1))
if rot:
    im = im.transpose(Image.ROTATE_270)
if scale != 1:
    im = im.resize((max(1, int(im.size[0]*scale)), max(1, int(im.size[1]*scale))), Image.LANCZOS if scale < 1 else Image.NEAREST)
im.save(out)
print(out, im.size)
