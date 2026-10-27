"""Crop a region of a page image and rescale it for viewing.

Usage: python -I crop.py IN OUT x0 y0 x1 y1 scale [grid]
Coordinates are pixels of IN. scale multiplies the crop size (nearest
neighbour for scale >= 1 so pixels stay honest). If grid > 0, draw faint
tick marks every `grid` source pixels along the crop border, labelled
with the source pixel coordinate, to help locate features.
"""
import sys
from PIL import Image, ImageDraw


def main():
    a = sys.argv[1:]
    src, out = a[0], a[1]
    x0, y0, x1, y1 = (int(v) for v in a[2:6])
    s = float(a[6])
    grid = int(a[7]) if len(a) > 7 else 0
    im = Image.open(src).convert("RGB")
    x1 = min(x1, im.size[0]); y1 = min(y1, im.size[1])
    x0 = max(0, x0); y0 = max(0, y0)
    c = im.crop((x0, y0, x1, y1))
    w, h = c.size
    rs = Image.NEAREST if s >= 1 else Image.LANCZOS
    c = c.resize((max(1, int(w * s)), max(1, int(h * s))), rs)
    if grid > 0:
        d = ImageDraw.Draw(c)
        gx = (x0 // grid + 1) * grid
        while gx < x1:
            px = (gx - x0) * s
            d.line([(px, 0), (px, 12)], fill=(255, 0, 0))
            d.text((px + 2, 0), str(gx), fill=(255, 0, 0))
            gx += grid
        gy = (y0 // grid + 1) * grid
        while gy < y1:
            py = (gy - y0) * s
            d.line([(0, py), (12, py)], fill=(0, 0, 255))
            d.text((2, py + 1), str(gy), fill=(0, 0, 255))
            gy += grid
    c.save(out)
    print(out, c.size)


if __name__ == "__main__":
    main()
