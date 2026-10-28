# For 1-bit scans where grid ink is as dark as curve ink (RM A52E01 fig. 8).
# usage: python3 -I components_grid.py img cal.json x0 y0 x1 y1 T minarea hw_v hw_h out.png out.npz [scale]
# Threshold gray < T inside the box, blank a band of +-hw px around every fitted grid line
# (each line's own fitted position and slope from calib.py), label 8-connected components,
# drop components smaller than minarea, save a colour map with ids, and the label array.
import sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
a = sys.argv
img, calp = a[1], a[2]
x0, y0, x1, y1 = map(int, a[3:7]); T = int(a[7]); minarea = int(a[8])
hwv, hwh = float(a[9]), float(a[10])
outpng, outnpz = a[11], a[12]
sc = float(a[13]) if len(a) > 13 else 0.9
c = json.load(open(calp))
g = np.asarray(Image.open(img).convert('L')).astype(np.int16)
H, W = g.shape
mask = np.zeros(g.shape, bool)
mask[y0:y1, x0:x1] = g[y0:y1, x0:x1] < T
gridmask = np.zeros(g.shape, bool)
yy = np.arange(y0, y1)
for l in c['vlines']:
    xs = l['a'] + l['b'] * yy
    for y, x in zip(yy, xs):
        lo, hi = int(np.floor(x - hwv)), int(np.ceil(x + hwv))
        gridmask[y, max(lo, 0):min(hi + 1, W)] = True
xx = np.arange(x0, x1)
for l in c['hlines']:
    ys = l['c'] + l['e'] * xx
    for x, y in zip(xx, ys):
        lo, hi = int(np.floor(y - hwh)), int(np.ceil(y + hwh))
        gridmask[max(lo, 0):min(hi + 1, H), x] = True
mask &= ~gridmask
lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
sizes = ndimage.sum(mask, lab, range(1, n + 1))
keep = np.zeros(n + 1, bool); keep[1:] = sizes >= minarea
lab[~keep[lab]] = 0
ids = [i for i in range(1, n + 1) if keep[i]]
remap = np.zeros(n + 1, np.int32)
for k, i in enumerate(ids, 1):
    remap[i] = k
newlab = remap[lab]
objs = ndimage.find_objects(newlab)
info = []
for k, sl in enumerate(objs, 1):
    if sl is None:
        continue
    info.append((k, sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, int((newlab[sl] == k).sum())))
np.savez_compressed(outnpz, lab=newlab[y0:y1, x0:x1], box=np.array([x0, y0, x1, y1]), T=T,
                    grid=gridmask[y0:y1, x0:x1])
rng = np.random.default_rng(1)
cols = rng.integers(30, 210, size=(len(ids) + 1, 3)); cols[0] = 255
sub = newlab[y0:y1, x0:x1]
rgb = cols[sub].astype(np.uint8)
gray = g[y0:y1, x0:x1]
bg = np.stack([np.clip(gray, 0, 255)] * 3, -1).astype(np.uint8)
bg = (0.25 * bg + 0.75 * 255).astype(np.uint8)
m = sub > 0
bg[m] = rgb[m]
im = Image.fromarray(bg)
im = im.resize((int(im.size[0] * sc), int(im.size[1] * sc)), Image.LANCZOS)
d = ImageDraw.Draw(im)
for k, bx0, by0, bx1, by1, area in info:
    d.text(((bx0 - x0) * sc + 2, (by0 - y0) * sc - 2), str(k), fill=(255, 0, 0))
im.save(outpng)
for r in info:
    print('comp %d box x %d-%d y %d-%d area %d' % r)
