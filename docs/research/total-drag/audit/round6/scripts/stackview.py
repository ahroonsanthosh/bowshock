"""Side-by-side full-resolution crops of symbol stacks at given abscissae,
with a page-pixel ruler (ticks every 10 px, labels every 50 px; the crop's
left edge x is printed on top), for naming stacked symbols by eye.

Usage: python3 -I stackview.py <spec.json> <out.png> <y0> <y1> <halfwidth> <x> [<x> ...]
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402

from fig import from_spec  # noqa: E402


def main():
    spec = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    y0, y1, hw = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
    xs = [float(v) for v in sys.argv[6:]]
    f = from_spec(spec)
    bx = spec["box"]
    im = Image.open(f.png).convert("RGB")
    tiles = []
    for xv in xs:
        X = f.ax.pixel(xv, 0.5 * (y0 + y1) - bx[1]) + bx[0]
        c = im.crop((int(X) - hw, y0, int(X) + hw, y1))
        d = ImageDraw.Draw(c)
        for y in range(0, y1 - y0, 10):
            yy = y0 + y
            L = 14 if yy % 50 == 0 else 5
            d.line((0, y, L, y), fill=(0, 0, 255))
            if yy % 50 == 0:
                d.text((16, y - 5), str(yy), fill=(0, 0, 255))
        for x in range(0, 2 * hw, 10):
            xx = int(X) - hw + x
            d.line((x, 0, x, 10 if xx % 50 == 0 else 4), fill=(255, 0, 0))
        d.text((2, 12), f"x0={int(X) - hw}", fill=(255, 0, 0))
        tiles.append(c)
    W = sum(t.width for t in tiles) + 6 * (len(tiles) - 1)
    sheet = Image.new("RGB", (W, y1 - y0), "white")
    x = 0
    for t in tiles:
        sheet.paste(t, (x, 0))
        x += t.width + 6
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
