"""Several zoomgrid.py crops on one sheet.

Usage: python -I zgsheet.py PAGE.png OUT.png zoom ncol label:x0:y0:x1:y1 ...
Each crop is drawn as in zoomgrid.py (light lines every 5 px, darker and
labelled every 10 px of page coordinates) with its label on top.
"""
import sys

from PIL import Image, ImageDraw


def crop(page, z, x0, y0, x1, y1, lab, st=5):
    c = page.crop((x0, y0, x1, y1)).resize(((x1 - x0) * z, (y1 - y0) * z), Image.NEAREST)
    M = 34
    out = Image.new("RGB", (c.size[0] + M, c.size[1] + M + 12), (255, 255, 255))
    out.paste(c, (M, M + 12))
    d = ImageDraw.Draw(out)
    d.text((2, 0), lab, fill=(0, 0, 0))
    for x in range((x0 // st + 1) * st, x1, st):
        px = M + (x - x0 + 0.5) * z
        col = (0, 120, 255) if x % 10 == 0 else (150, 220, 255)
        d.line([(px, M + 12), (px, out.size[1])], fill=col, width=1)
        if x % 10 == 0:
            d.text((px - 10, 12 + 11 * ((x // 10) % 2)), str(x), fill=(0, 0, 200))
    for y in range((y0 // st + 1) * st, y1, st):
        py = M + 12 + (y - y0 + 0.5) * z
        col = (255, 80, 80) if y % 10 == 0 else (255, 190, 190)
        d.line([(M, py), (out.size[0], py)], fill=col, width=1)
        if y % 10 == 0:
            d.text((1, py - 5), str(y), fill=(200, 0, 0))
    return out


def main():
    a = sys.argv[1:]
    page = Image.open(a[0]).convert("RGB")
    z = int(a[2])
    nc = int(a[3])
    tiles = []
    for t in a[4:]:
        f = t.split(":")
        tiles.append(crop(page, z, int(f[1]), int(f[2]), int(f[3]), int(f[4]), f[0]))
    W = max(t.size[0] for t in tiles)
    H = max(t.size[1] for t in tiles)
    nr = (len(tiles) + nc - 1) // nc
    S = Image.new("RGB", (nc * (W + 8), nr * (H + 8)), (255, 200, 200))
    for i, t in enumerate(tiles):
        S.paste(t, ((i % nc) * (W + 8), (i // nc) * (H + 8)))
    S.save(a[1])
    print(a[1], S.size)


if __name__ == "__main__":
    main()
