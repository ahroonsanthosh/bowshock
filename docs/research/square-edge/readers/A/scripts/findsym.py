"""List candidate symbols of one type in a region (local maxima of the
stroke-template score of figlib.symfit) and draw them for checking.

usage: python3 -I findsym.py IMG TYPE SIZE X0 Y0 X1 Y1 MINSCORE OUT.png [STEP]
Candidates are found on a STEP px lattice (default 2), each refined with
symfit (search 2 px), and kept if no better candidate lies within SIZE/3.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from figlib import load_grey, symfit

img, typ = sys.argv[1], sys.argv[2]
size = float(sys.argv[3]); X0, Y0, X1, Y1 = (int(v) for v in sys.argv[4:8])
minsc = float(sys.argv[8]); out = sys.argv[9]
step = int(sys.argv[10]) if len(sys.argv) > 10 else 2
g = load_grey(img)
cands = []
for y in range(Y0, Y1 + 1, step):
    for x in range(X0, X1 + 1, step):
        r = symfit(g, typ, x, y, size, search=step / 2, sizes=[size])
        if r["score"] >= minsc:
            cands.append(r)
cands.sort(key=lambda r: -r["score"])
keep = []
for r in cands:
    if all(np.hypot(r["x"] - k["x"], r["y"] - k["y"]) > size / 3 for k in keep):
        keep.append(r)
final = []
for r in keep:
    rr = symfit(g, typ, r["x"], r["y"], size, search=2.0)
    final.append(rr)
sc = 4
im = Image.open(img).convert("RGB").crop((X0 - 20, Y0 - 20, X1 + 20, Y1 + 20))
im = im.resize((im.width * sc, im.height * sc), Image.NEAREST)
dr = ImageDraw.Draw(im)
for k, r in enumerate(final):
    ox, oy = (r["x"] - X0 + 20) * sc, (r["y"] - Y0 + 20) * sc
    s = r["size"] * sc / 2
    col = (255, 0, 0)
    if typ == "ring":
        dr.ellipse((ox - s, oy - s, ox + s, oy + s), outline=col)
    elif typ == "diamond":
        dr.polygon([(ox, oy - s), (ox + s, oy), (ox, oy + s), (ox - s, oy)], outline=col)
    elif typ in ("rtri",):
        h = s * 25 / 29
        dr.polygon([(ox - s, oy - h), (ox + s, oy - h), (ox + s, oy + h)], outline=col)
    elif typ == "dtri":
        dr.polygon([(ox, oy + s), (ox - s * 0.95, oy - s * 0.75), (ox + s * 0.95, oy - s * 0.75)], outline=col)
    else:
        dr.rectangle((ox - s, oy - s, ox + s, oy + s), outline=col)
    dr.text((ox + 3, oy + 3), str(k), fill=(0, 0, 255))
    print(f"{k:2d} {typ} centre ({r['x']:.2f},{r['y']:.2f}) size {r['size']:.1f} score {r['score']:.1f} err ({r['ex']:.2f},{r['ey']:.2f})")
im.save(out)
