"""Contact sheet of several pages (rendered at 600 dpi and cached), to find
the figures' layout with one look.

Usage: python3 -I sheet.py <ntrs id> <out.png> <page> [<page> ...]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402

import dig  # noqa: E402
from fig import SCRATCH  # noqa: E402


def main():
    nid, out = sys.argv[1], sys.argv[2]
    pages = [int(p) for p in sys.argv[3:]]
    pdf = f"{SCRATCH}/dl/{nid}/{nid}.pdf"
    work = f"{SCRATCH}/work/{nid}"
    th = []
    for p in pages:
        im = Image.open(dig.render(pdf, p, work)).convert("L")
        s = 420.0 / max(im.width, im.height)
        t = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS).convert("RGB")
        d = ImageDraw.Draw(t)
        d.text((5, 5), f"p{p} {im.width}x{im.height}", fill=(255, 0, 0))
        th.append(t)
    cols = min(3, len(th))
    rows = (len(th) + cols - 1) // cols
    W = 430 * cols
    H = 430 * rows
    sheet = Image.new("RGB", (W, H), (255, 255, 255))
    for i, t in enumerate(th):
        sheet.paste(t, ((i % cols) * 430, (i // cols) * 430))
    sheet.save(out)
    print(out)


if __name__ == "__main__":
    main()
