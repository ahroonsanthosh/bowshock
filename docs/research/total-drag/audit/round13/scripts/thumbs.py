"""Contact sheet of page thumbnails, to find a figure's page.

usage: python3 -I thumbs.py OUT.png WIDTH PAGE.png [PAGE.png ...]
Each page is scaled to WIDTH px wide and placed side by side, labelled with
its file name.
"""
import os
import sys
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
out, W = sys.argv[1], int(sys.argv[2])
ims = []
for p in sys.argv[3:]:
    im = Image.open(p).convert("L")
    h = int(im.height * W / im.width)
    ims.append((os.path.basename(p), im.resize((W, h), Image.LANCZOS)))
H = max(i.height for _, i in ims) + 20
can = Image.new("RGB", (W * len(ims) + 10 * (len(ims) - 1), H), "white")
d = ImageDraw.Draw(can)
for k, (n, im) in enumerate(ims):
    can.paste(im.convert("RGB"), (k * (W + 10), 20))
    d.text((k * (W + 10) + 2, 2), n, fill="red")
can.save(out)
