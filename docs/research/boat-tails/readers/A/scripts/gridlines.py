"""Find long straight grid/axis lines in a box of a page scan.

usage: python3 -I gridlines.py IMG ROT X0 Y0 X1 Y1 [THR] [MINFRAC] [NBANDS]
Image is rotated by ROT degrees (PIL counterclockwise) first; box in rotated px.
A pixel is dark if gray < THR (default 170). A column (row) is part of a
vertical (horizontal) line if the fraction of dark pixels along it, within a
band of the box, is >= MINFRAC (default 0.45). Contiguous runs of such columns
are merged and the darkness-weighted centroid is reported, separately for
NBANDS bands (default 2) across the box, to expose scan skew.
"""
import sys
import numpy as np
from PIL import Image

img, rot = sys.argv[1], int(sys.argv[2])
x0, y0, x1, y1 = map(int, sys.argv[3:7])
thr = float(sys.argv[7]) if len(sys.argv) > 7 else 170
minfrac = float(sys.argv[8]) if len(sys.argv) > 8 else 0.45
nb = int(sys.argv[9]) if len(sys.argv) > 9 else 2
im = Image.open(img).convert('L')
if rot:
    im = im.rotate(rot, expand=True)
g = np.asarray(im, dtype=float)[y0:y1, x0:x1]
dark = (g < thr).astype(float)
w = 255.0 - g


def runs(frac, weight, off):
    idx = np.where(frac >= minfrac)[0]
    out = []
    if idx.size == 0:
        return out
    start = idx[0]
    prev = idx[0]
    for i in list(idx[1:]) + [None]:
        if i is None or i != prev + 1:
            seg = np.arange(start, prev + 1)
            # widen by one px each side for centroid
            lo, hi = max(seg[0] - 1, 0), min(seg[-1] + 2, len(frac))
            s = np.arange(lo, hi)
            ww = weight[lo:hi]
            c = float((s * ww).sum() / ww.sum())
            out.append((c + off, float(frac[seg].max()), len(seg)))
            if i is not None:
                start = i
        if i is not None:
            prev = i
    return out


H, W = dark.shape
print('# vertical lines (x positions), per horizontal band of rows')
for b in range(nb):
    r0, r1 = b * H // nb, (b + 1) * H // nb
    fr = dark[r0:r1].mean(axis=0)
    wt = w[r0:r1].mean(axis=0)
    wt = np.clip(wt - np.median(wt), 0, None)
    res = runs(fr, wt, x0)
    print('band rows %d-%d:' % (r0 + y0, r1 + y0), ' '.join('%.1f' % r[0] for r in res))
print('# horizontal lines (y positions), per vertical band of columns')
for b in range(nb):
    c0, c1 = b * W // nb, (b + 1) * W // nb
    fr = dark[:, c0:c1].mean(axis=1)
    wt = w[:, c0:c1].mean(axis=1)
    wt = np.clip(wt - np.median(wt), 0, None)
    res = runs(fr, wt, y0)
    print('band cols %d-%d:' % (c0 + x0, c1 + x0), ' '.join('%.1f' % r[0] for r in res))
