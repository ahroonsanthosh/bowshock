"""Crop a region of a page image, optional scale and grayscale. Usage:
python3 -I crop.py in.jpg out.png x0 y0 x1 y1 [scale]"""
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
s = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
im = Image.open(src).convert('L').crop((x0, y0, x1, y1))
if s != 1.0:
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
im.save(dst)
