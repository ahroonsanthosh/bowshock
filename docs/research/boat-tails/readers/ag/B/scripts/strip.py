"""Strip of zoomed tiles, one per station, for reading stacks by eye.

Usage: python -I strip.py PAGE.png OUT.png zoom halfwidth y0 y1 label:x [label:x ...]
Each tile is page[y0:y1, x-halfwidth:x+halfwidth] scaled by zoom
(nearest), with a red tick at the station x on the top edge and blue
ticks with labels every 10 px of page y on the left edge.
"""
import sys

from PIL import Image, ImageDraw


def main():
    a = sys.argv[1:]
    page = Image.open(a[0]).convert("RGB")
    out = a[1]
    z = float(a[2])
    hw = int(a[3])
    y0, y1 = int(a[4]), int(a[5])
    tiles = []
    for t in a[6:]:
        lab, xs = t.split(":")
        x = float(xs)
        x0 = int(round(x)) - hw
        c = page.crop((x0, y0, x0 + 2 * hw, y1)).resize((int(2 * hw * z), int((y1 - y0) * z)), Image.NEAREST)
        d = ImageDraw.Draw(c)
        px = (x - x0 + 0.5) * z
        d.line([(px, 0), (px, 8)], fill=(255, 0, 0), width=2)
        for yy in range((y0 // 10 + 1) * 10, y1, 10):
            py = (yy - y0 + 0.5) * z
            d.line([(0, py), (10, py)], fill=(0, 0, 255))
            d.text((12, py - 5), str(yy), fill=(0, 0, 255))
        T = Image.new("RGB", (c.size[0], c.size[1] + 14), (255, 255, 255))
        ImageDraw.Draw(T).text((2, 1), lab, fill=(0, 0, 0))
        T.paste(c, (0, 14))
        tiles.append(T)
    W = sum(t.size[0] + 6 for t in tiles)
    H = max(t.size[1] for t in tiles)
    S = Image.new("RGB", (W, H), (255, 190, 190))
    x = 0
    for t in tiles:
        S.paste(t, (x, 0))
        x += t.size[0] + 6
    S.save(out)
    print(out, S.size)


if __name__ == "__main__":
    main()
