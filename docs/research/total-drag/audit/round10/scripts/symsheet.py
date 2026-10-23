"""Contact sheet of symbol crops (for identifying symbols by eye).

usage: python3 -I symsheet.py PAGE.png OUT.png HALF SCALE "x,y,label;x,y,label;..." [BLUR]
Each crop is +-HALF px around (x, y), scaled by SCALE, with a red cross at
(x, y) and the label above it. BLUR (optional) box-blurs the page first.
The item list can be given as @FILE (a file holding the same text).
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

Image.MAX_IMAGE_PIXELS = None
page, out = sys.argv[1], sys.argv[2]
half, s = int(sys.argv[3]), float(sys.argv[4])
spec = open(sys.argv[5][1:]).read().strip() if sys.argv[5].startswith("@") else sys.argv[5]
items = [p.split(",") for p in spec.split(";")]
im = Image.open(page).convert("L")
if len(sys.argv) > 6:
    im = im.filter(ImageFilter.BoxBlur(int(sys.argv[6])))
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
