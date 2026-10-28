"""Tile overlay PNGs into one contact sheet with their ids.
usage: python3 -I sheet.py OUT COLS IMG [IMG ...]"""
import sys, os
from PIL import Image, ImageDraw
out, cols = sys.argv[1], int(sys.argv[2]); files = sys.argv[3:]
ims = [Image.open(f).convert("RGB") for f in files]
w = max(i.width for i in ims); h = max(i.height for i in ims) + 14
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), (255, 255, 255))
for k, (f, im) in enumerate(zip(files, ims)):
    x, y = (k % cols) * w, (k // cols) * h
    sheet.paste(im, (x, y + 14))
    ImageDraw.Draw(sheet).text((x + 3, y + 1), os.path.basename(f).replace(".png", ""), fill=(0, 0, 0))
sheet.save(out); print(out, sheet.size)
