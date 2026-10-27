"""Zoomed tiles at given centres, each with its own window, in one strip.

Usage: python -I tiles.py PAGE.png OUT.png zoom label:x:y0:y1[:hw] ...
Each tile shows page[y0:y1, x-hw:x+hw] (hw default 30) at the given
zoom, a red tick at the station x, and blue ticks every 10 px of y with
labels every 20 px.
"""
import sys

from PIL import Image, ImageDraw


def main():
    a = sys.argv[1:]
    page = Image.open(a[0]).convert("RGB")
    out = a[1]
    z = float(a[2])
    tiles = []
    for t in a[3:]:
        f = t.split(":")
        lab, x, y0, y1 = f[0], float(f[1]), int(f[2]), int(f[3])
        hw = int(f[4]) if len(f) > 4 else 30
        x0 = int(round(x)) - hw
        c = page.crop((x0, y0, x0 + 2 * hw, y1)).resize((int(2 * hw * z), int((y1 - y0) * z)), Image.NEAREST)
        d = ImageDraw.Draw(c)
        px = (x - x0 + 0.5) * z
        d.line([(px, 0), (px, 8)], fill=(255, 0, 0), width=2)
        for yy in range((y0 // 10 + 1) * 10, y1, 10):
            py = (yy - y0 + 0.5) * z
            d.line([(0, py), (6 if yy % 20 else 12, py)], fill=(0, 0, 255))
            if yy % 20 == 0:
                d.text((14, py - 5), str(yy), fill=(0, 0, 255))
        T = Image.new("RGB", (c.size[0], c.size[1] + 14), (255, 255, 255))
        ImageDraw.Draw(T).text((2, 1), lab, fill=(0, 0, 0))
        T.paste(c, (0, 14))
        tiles.append(T)
    W = sum(t.size[0] + 6 for t in tiles)
    H = max(t.size[1] for t in tiles)
    S = Image.new("RGB", (W, H), (255, 190, 190))
    xx = 0
    for t in tiles:
        S.paste(t, (xx, 0))
        xx += t.size[0] + 6
    S.save(out)
    print(out, S.size)


if __name__ == "__main__":
    main()
