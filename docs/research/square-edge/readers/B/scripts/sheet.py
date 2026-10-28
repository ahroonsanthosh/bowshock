"""Tile several page images into one contact sheet.
usage: python3 -I sheet.py out.png cols img1 img2 ...
"""
import sys
from PIL import Image, ImageDraw

out = sys.argv[1]
cols = int(sys.argv[2])
paths = sys.argv[3:]
ims = [Image.open(p).convert("L") for p in paths]
w = max(i.width for i in ims)
h = max(i.height for i in ims)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("L", (cols * w, rows * (h + 20)), 255)
d = ImageDraw.Draw(sheet)
for k, (p, im) in enumerate(zip(paths, ims)):
    r, c = divmod(k, cols)
    sheet.paste(im, (c * w, r * (h + 20) + 20))
    d.text((c * w + 5, r * (h + 20) + 2), p.split("/")[-1], fill=0)
sheet.save(out)
