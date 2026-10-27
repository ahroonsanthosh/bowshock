"""Zoomed crop with a light reference grid for eye reading.

Usage: python -I zoomgrid.py PAGE.png OUT.png zoom x0 y0 x1 y1 [step]
The crop page[y0:y1, x0:x1] is enlarged (nearest neighbour); light
cyan lines are drawn every step px (default 5) of page coordinates,
darker every 10 px with the page coordinate written on the margins.
"""
import sys

from PIL import Image, ImageDraw


def main():
    a = sys.argv[1:]
    page = Image.open(a[0]).convert("RGB")
    z = int(a[2])
    x0, y0, x1, y1 = (int(v) for v in a[3:7])
    st = int(a[7]) if len(a) > 7 else 5
    c = page.crop((x0, y0, x1, y1)).resize(((x1 - x0) * z, (y1 - y0) * z), Image.NEAREST)
    M = 34
    out = Image.new("RGB", (c.size[0] + M, c.size[1] + M), (255, 255, 255))
    out.paste(c, (M, M))
    d = ImageDraw.Draw(out)
    for x in range((x0 // st + 1) * st, x1, st):
        px = M + (x - x0 + 0.5) * z
        col = (0, 120, 255) if x % 10 == 0 else (150, 220, 255)
        d.line([(px, M), (px, out.size[1])], fill=col, width=1)
        if x % 10 == 0:
            d.text((px - 10, 2 + 12 * ((x // 10) % 2)), str(x), fill=(0, 0, 200))
    for y in range((y0 // st + 1) * st, y1, st):
        py = M + (y - y0 + 0.5) * z
        col = (255, 80, 80) if y % 10 == 0 else (255, 190, 190)
        d.line([(M, py), (out.size[0], py)], fill=col, width=1)
        if y % 10 == 0:
            d.text((1, py - 5), str(y), fill=(200, 0, 0))
    out.save(a[1])
    print(a[1], out.size)


if __name__ == "__main__":
    main()
