"""Draw every transcribed point (from the 'pixel centre (x,y)' note) on the page render for a visual check.
usage: python3 -I checkplot.py CSV FIGURE PAGE X0 Y0 X1 Y1 SCALE OUT"""
import sys, csv, re
from PIL import Image, ImageDraw
W = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"
f, fig, page = sys.argv[1], sys.argv[2], int(sys.argv[3])
x0, y0, x1, y1 = map(int, sys.argv[4:8]); sc = float(sys.argv[8]); out = sys.argv[9]
im = Image.open(f"{W}/p400-{page:02d}.png").convert("RGB").crop((x0, y0, x1, y1))
im = im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS)
d = ImageDraw.Draw(im)
n = 0
for r in csv.DictReader(open(f)):
    if r["figure"] != fig:
        continue
    m = re.search(r"pixel centre \(([\d.]+),([\d.]+)\)", r["note"])
    if not m:
        continue
    x, y = (float(m[1]) - x0) * sc, (float(m[2]) - y0) * sc
    col = (255, 0, 0) if not r["flag"] or r["flag"] in ("AXIS", "OTHER", "AXIS;DISAGREE") else (0, 120, 255)
    d.line([(x - 4, y), (x + 4, y)], fill=col, width=2); d.line([(x, y - 4), (x, y + 4)], fill=col, width=2)
    n += 1
im.save(out); print(n, im.size)
