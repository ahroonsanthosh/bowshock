"""Declutter a panel of TN D-4014 fig. 4 for symbol reading: columns that are dark over more than 55% of
the panel's full height (the grid paper's vertical lines) and rows dark over more than 55% of its width
(horizontal lines) are painted light grey, so symbols stand out. Ruler as in f4_ruler.py.
Usage: PAGE PANEL PY0 PY1 X0 Y0 X1 Y1 SCALE OUT   (PY0..PY1: the panel's full height for the column test)"""
import sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, 'scripts')
import f4_ruler as fr
page = int(sys.argv[1]); panel = sys.argv[2]
PY0, PY1, X0, Y0, X1, Y1 = map(int, sys.argv[3:9]); S = float(sys.argv[9]); out = sys.argv[10]
a = np.array(Image.open('img/d4014hi-%d.png' % page).convert('L')).astype(int)
dark = a < 128
colfrac = dark[PY0:PY1, :].mean(axis=0)
rowfrac = dark[:, 560:1880].mean(axis=1)
rgb = np.stack([a, a, a], axis=-1).astype(np.uint8)
grid_c = colfrac > 0.55
grid_r = rowfrac > 0.55
mask = np.zeros_like(dark)
mask[:, grid_c] = True
mask[grid_r, :] = True
rgb[mask & dark] = (205, 205, 205)
im = Image.fromarray(rgb).crop((X0, Y0, X1, Y1))
im = im.resize((int((X1 - X0) * S), int((Y1 - Y0) * S)), Image.NEAREST)
d = ImageDraw.Draw(im)
for k in range(0, 25):
    ca = 0.005 * k
    ya, yb = fr.y_of(page, panel, ca, X0), fr.y_of(page, panel, ca, X1)
    if Y0 <= ya <= Y1:
        d.line([(0, (ya - Y0) * S), ((X1 - X0) * S, (yb - Y0) * S)], fill=(255, 0, 0) if k % 2 == 0 else (255, 150, 150), width=1)
        d.text((2, (ya - Y0) * S - 11), '%.3f' % ca, fill=(200, 0, 0))
# x ticks every 10 px (original) for locating symbols
for x in range(X0 - X0 % 10, X1, 10):
    d.line([((x - X0) * S, 0), ((x - X0) * S, 6)], fill=(0, 0, 255))
    if x % 50 == 0:
        d.text(((x - X0) * S + 2, 6), str(x), fill=(0, 0, 255))
im.save(out)
print('grid columns blanked:', int(grid_c[X0:X1].sum()), 'of', X1 - X0, '; rows blanked:', int(grid_r[Y0:Y1].sum()))
