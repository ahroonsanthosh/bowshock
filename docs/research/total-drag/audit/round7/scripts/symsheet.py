"""Contact sheet of symbol crops (for identifying symbols by eye).

usage: python3 -I symsheet.py PAGE.png OUT.png HALF SCALE "x,y,label;x,y,label;..."
Each crop is +-HALF px around (x, y), scaled by SCALE, with a red cross at
(x, y) and the label above it.
"""
import sys
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
page, out = sys.argv[1], sys.argv[2]
half, s = int(sys.argv[3]), float(sys.argv[4])
items = [p.split(",") for p in sys.argv[5].split(";")]
im = Image.open(page).convert("L")
tw = int(2 * half * s)
cols = min(6, len(items))
rows = (len(items) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (tw + 6), rows * (tw + 22)), (255, 255, 255))
dr = ImageDraw.Draw(sheet)
for i, (x, y, lab) in enumerate(items):
    x, y = float(x), float(y)
    c = im.crop((int(x) - half, int(y) - half, int(x) + half, int(y) + half)).resize((tw, tw), Image.LANCZOS)
    c = c.convert("RGB")
    d2 = ImageDraw.Draw(c)
    cx, cy = (x - int(x) + half) * s, (y - int(y) + half) * s
    d2.line((cx - 6, cy, cx + 6, cy), fill=(255, 0, 0))
    d2.line((cx, cy - 6, cx, cy + 6), fill=(255, 0, 0))
    ox, oy = (i % cols) * (tw + 6), (i // cols) * (tw + 22)
    sheet.paste(c, (ox, oy + 18))
    dr.text((ox + 2, oy + 2), lab, fill=(0, 0, 0))
sheet.save(out, optimize=True)
print(out, sheet.size)
