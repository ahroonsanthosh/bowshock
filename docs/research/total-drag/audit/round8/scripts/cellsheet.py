"""Contact sheet of table cells at high magnification.

usage: python3 -I cellsheet.py WORKDIR CHECK.json OUT.png SCALE
Crops +-80 x +-26 px (native 300 dpi) about each unchecked cell listed in
CHECK.json (glyphcheck.py output), labelled page/sub-table/hole/column and
the typed value.
"""
import json
import os
import sys
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
w, chk, out, s = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
cells = json.load(open(chk))["unchecked"]
pages = {f[4:7]: f for f in os.listdir(w) if f.startswith("img-")}
tiles = []
for c in cells:
    if "x" not in c:
        continue
    im = Image.open(os.path.join(w, pages["%03d" % c["page"]])).convert("L")
    x, y = int(c["x"]), int(c["y"])
    t = im.crop((x - 80, y - 26, x + 80, y + 26)).resize((int(160 * s), int(52 * s)), Image.LANCZOS)
    tiles.append(("p%d %s hole %s col %d typed %s" % (c["page"], c["sub"], c["hole"], c["col"], c["typed"]), t))
W = max(t.size[0] for _, t in tiles)
H = sum(t.size[1] + 22 for _, t in tiles)
sheet = Image.new("L", (W, H), 255)
dr = ImageDraw.Draw(sheet)
yy = 0
for lab, t in tiles:
    dr.text((4, yy + 4), lab, fill=0)
    sheet.paste(t, (0, yy + 20))
    yy += t.size[1] + 22
sheet.save(out)
print(out, sheet.size)
