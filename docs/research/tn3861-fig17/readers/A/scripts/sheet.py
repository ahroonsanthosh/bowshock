"""Tile diagnostic images into a contact sheet with labels.
usage: python -I sheet.py out.png tile_px img1 img2 ..."""
import sys, os
from PIL import Image, ImageDraw
out, T = sys.argv[1], int(sys.argv[2]); files = sys.argv[3:]
n = len(files); cols = 3 if n > 2 else n; rows = (n + cols - 1)//cols
sheet = Image.new('RGB', (cols*T, rows*(T+16)), 'white'); d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB'); im.thumbnail((T, T))
    x, y = (i % cols)*T, (i//cols)*(T+16)
    sheet.paste(im, (x, y+16)); d.text((x+4, y+2), os.path.basename(f), fill=(0, 0, 0))
sheet.save(out)
