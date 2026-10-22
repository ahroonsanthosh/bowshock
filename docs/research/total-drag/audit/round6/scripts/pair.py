"""Put several overlay images side by side (or stacked) for one look.

Usage: python3 -I pair.py <out.png> <width_each> <img> [<img> ...]
"""
import sys

from PIL import Image


def main():
    out, w = sys.argv[1], int(sys.argv[2])
    ims = [Image.open(p).convert("RGB") for p in sys.argv[3:]]
    ims = [im.resize((w, int(im.height * w / im.width))) for im in ims]
    H = max(im.height for im in ims)
    sheet = Image.new("RGB", (w * len(ims) + 8 * (len(ims) - 1), H), "white")
    x = 0
    for im in ims:
        sheet.paste(im, (x, 0))
        x += w + 8
    sheet.save(out)


if __name__ == "__main__":
    main()
