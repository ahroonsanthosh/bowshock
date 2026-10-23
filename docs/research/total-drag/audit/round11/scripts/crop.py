"""Crop and rescale a region of a rendered page for viewing.

usage: python3 -I crop.py IN.png OUT.png x0 y0 x1 y1 [scale] [gray]
Coordinates are pixels of IN.png. scale defaults to 1.0.
"""
import sys
from PIL import Image

Image.MAX_IMAGE_PIXELS = None


def main():
    src, dst = sys.argv[1], sys.argv[2]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
    scale = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
    im = Image.open(src)
    if len(sys.argv) > 8 and sys.argv[8] == "gray":
        im = im.convert("L")
    im = im.crop((x0, y0, x1, y1))
    if scale != 1.0:
        w, h = im.size
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    im.save(dst, optimize=True)
    print(dst, im.size)


if __name__ == "__main__":
    main()
