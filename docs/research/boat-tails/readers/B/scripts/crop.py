"""Crop a region of a page image and optionally scale it for viewing.

Usage: python3 -I crop.py IN OUT x0 y0 x1 y1 [scale] [rot]
Coordinates are native pixels of IN (before rotation).
rot: 0, 90, 180, 270 (counter-clockwise degrees applied after crop).
Scaling uses nearest-neighbour so no pixel is invented by smoothing.
"""
import sys
from PIL import Image

def main():
    a = sys.argv[1:]
    src, out = a[0], a[1]
    x0, y0, x1, y1 = (int(v) for v in a[2:6])
    scale = float(a[6]) if len(a) > 6 else 1.0
    rot = int(a[7]) if len(a) > 7 else 0
    im = Image.open(src)
    c = im.crop((x0, y0, x1, y1))
    if scale != 1.0:
        c = c.resize((int(c.width * scale), int(c.height * scale)), Image.NEAREST if scale > 1 else Image.BOX)
    if rot:
        c = c.rotate(rot, expand=True)
    c.save(out)
    print(out, c.size)

if __name__ == "__main__":
    main()
