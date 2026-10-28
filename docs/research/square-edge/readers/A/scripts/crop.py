"""Crop a region of a page image and optionally scale it for viewing.

usage: python3 -I crop.py IN OUT X0 Y0 X1 Y1 [SCALE] [ROT]
Coordinates are native pixels of IN. SCALE (float) resizes with nearest
neighbour so pixels stay crisp. ROT rotates the crop (degrees, PIL sense)
after cropping. Use X0=Y0=X1=Y1=0 for the full image.
"""
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
scale = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
rot = int(sys.argv[8]) if len(sys.argv) > 8 else 0
im = Image.open(src).convert("L")
if x1 > x0 and y1 > y0:
    im = im.crop((x0, y0, x1, y1))
if rot:
    im = im.rotate(rot, expand=True)
if scale != 1.0:
    im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))),
                   Image.NEAREST if scale >= 1 else Image.LANCZOS)
im.save(out)
print(out, im.size)
