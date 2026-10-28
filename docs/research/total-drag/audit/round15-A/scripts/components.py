# usage: python3 -I components.py img x0 y0 x1 y1 T minarea out.png out.npz [scale]
# Threshold gray < T inside the box, label 8-connected components, drop those smaller
# than minarea, save a colour map with component ids drawn at their centroids.
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
a = sys.argv
img = a[1]; x0, y0, x1, y1 = map(int, a[2:6]); T = int(a[6]); minarea = int(a[7])
outpng, outnpz = a[8], a[9]
sc = float(a[10]) if len(a) > 10 else 0.5
g = np.asarray(Image.open(img).convert('L')).astype(np.int16)
mask = np.zeros(g.shape, bool)
mask[y0:y1, x0:x1] = g[y0:y1, x0:x1] < T
lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
sizes = ndimage.sum(mask, lab, range(1, n + 1))
keep = np.zeros(n + 1, bool); keep[1:] = sizes >= minarea
lab[~keep[lab]] = 0
ids = [i for i in range(1, n + 1) if keep[i]]
# renumber
newlab = np.zeros_like(lab)
objs = ndimage.find_objects(lab)
info = []
for k, i in enumerate(ids, 1):
    newlab[lab == i] = k
for k in range(1, len(ids) + 1):
    sl = ndimage.find_objects((newlab == k).astype(int))[0]
    ys, xs = np.nonzero(newlab[sl] == k)
    info.append((k, sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, len(xs)))
np.savez_compressed(outnpz, lab=newlab[y0:y1, x0:x1], box=np.array([x0, y0, x1, y1]), T=T)
rng = np.random.default_rng(1)
cols = rng.integers(40, 220, size=(len(ids) + 1, 3)); cols[0] = 255
rgb = cols[newlab[y0:y1, x0:x1]].astype(np.uint8)
gray = g[y0:y1, x0:x1]
bg = np.stack([np.clip(gray, 0, 255)] * 3, -1).astype(np.uint8)
bg = (0.35 * bg + 0.65 * 255).astype(np.uint8)
m = newlab[y0:y1, x0:x1] > 0
bg[m] = rgb[m]
im = Image.fromarray(bg)
im = im.resize((int(im.size[0] * sc), int(im.size[1] * sc)), Image.LANCZOS)
d = ImageDraw.Draw(im)
for k, bx0, by0, bx1, by1, area in info:
    d.text(((bx0 - x0) * sc, (by0 - y0) * sc - 10), str(k), fill=(255, 0, 0))
im.save(outpng)
for r in info:
    print('comp %d box x %d-%d y %d-%d area %d' % (r[0], r[1], r[3], r[2], r[4], r[5]))
