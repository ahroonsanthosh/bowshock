"""Print darkness (255 - gray) of a small region as a digit map (exploratory).

usage: python3 -I pixmap.py PAGE.png x0 y0 x1 y1 [xstep] [ystep] [blur_radius]
Each cell prints darkness // 26 (0 = white ... 9 = black); '.' for < 26.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None
im = Image.open(sys.argv[1]).convert("L")
if len(sys.argv) > 8:
    im = im.filter(ImageFilter.BoxBlur(int(sys.argv[8])))
d = 255 - np.asarray(im).astype(int)
x0, y0, x1, y1 = (int(v) for v in sys.argv[2:6])
sx = int(sys.argv[6]) if len(sys.argv) > 6 else 1
sy = int(sys.argv[7]) if len(sys.argv) > 7 else 1
print("      " + "".join(str((x // 10) % 10) if x % 10 == 0 else " " for x in range(x0, x1, sx)))
for y in range(y0, y1, sy):
    row = d[y, x0:x1:sx]
    print("%5d " % y + "".join("." if v < 26 else str(min(9, v // 26)) for v in row))
