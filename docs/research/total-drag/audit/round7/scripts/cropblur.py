"""Crop, box-blur (halftone scans) and rescale a region for viewing.

usage: python3 -I cropblur.py IN.png OUT.png x0 y0 x1 y1 scale blur_radius
"""
import sys
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None
src, dst = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
s = float(sys.argv[7])
r = int(sys.argv[8])
im = Image.open(src).convert("L").crop((x0 - 10, y0 - 10, x1 + 10, y1 + 10)).filter(ImageFilter.BoxBlur(r))
im = im.crop((10, 10, 10 + x1 - x0, 10 + y1 - y0))
im = im.resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.LANCZOS)
im.save(dst, optimize=True)
print(dst, im.size)
