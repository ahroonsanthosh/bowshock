"""Contact sheet of page images: montage.py out.png cols width in1.png in2.png ..."""
import sys
from PIL import Image, ImageDraw

out, cols, width = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
paths = sys.argv[4:]
ims = []
for p in paths:
    im = Image.open(p).convert("L")
    s = width / im.width
    ims.append((p, im.resize((width, int(im.height * s)))))
h = max(im.height for _, im in ims)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("L", (cols * width, rows * (h + 14)), 255)
d = ImageDraw.Draw(sheet)
for k, (p, im) in enumerate(ims):
    x, y = (k % cols) * width, (k // cols) * (h + 14)
    sheet.paste(im, (x, y + 14))
    d.text((x + 2, y), p.split("/")[-1], fill=0)
sheet.save(out)
