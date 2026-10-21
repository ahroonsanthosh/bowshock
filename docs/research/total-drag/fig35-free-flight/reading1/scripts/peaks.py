"""Dark-line centres in columns of the rectified fig. 35 (160 px per grid cell;
M = 1 + (u - 320) / 1600, P_B = (v - 320) / 8000 - 0.36).

For each column u in [u0, u1] step st, average 3 columns, take darkness
d = 255 - grey, mask rows within `gm` px of a horizontal grid line, and report
each run of rows with d above `thr` inside [v0, v1] as (centre, width, peak).
Columns within `gm` px of a vertical grid line are skipped.

usage: peaks.py rect.png u0 u1 st v0 v1 [thr=90] [gm=7] > out.tsv
"""
import sys
import numpy as np
from PIL import Image

src = sys.argv[1]
u0, u1, st, v0, v1 = map(int, sys.argv[2:7])
thr = float(sys.argv[7]) if len(sys.argv) > 7 else 90.0
gm = int(sys.argv[8]) if len(sys.argv) > 8 else 7
im = np.asarray(Image.open(src).convert('L')).astype(float)
# grid lines: find them from the image itself (dark rows/columns across the whole plot)
dark = 255.0 - im


def grid_positions(profile, period=160, start=320, n=40):
    out = []
    for k in range(-2, n):
        c = start + period * k
        lo, hi = max(c - 12, 0), min(c + 13, len(profile))
        if hi - lo < 5:
            continue
        seg = profile[lo:hi]
        out.append(lo + float((seg * np.arange(len(seg))).sum() / seg.sum()))
    return out


rows_prof = dark[:, 400:4000].mean(axis=1)
cols_prof = dark[400:3300, :].mean(axis=0)
hgrid = grid_positions(rows_prof)
vgrid = grid_positions(cols_prof)
print('# hgrid', ' '.join(f'{g:.1f}' for g in hgrid if v0 - 200 < g < v1 + 200))
print('# vgrid', ' '.join(f'{g:.1f}' for g in vgrid if u0 - 200 < g < u1 + 200))
vs = np.arange(v0, v1 + 1)
mask = np.ones_like(vs, dtype=bool)
for g in hgrid:
    mask &= np.abs(vs - g) > gm
for u in range(u0, u1 + 1, st):
    if min(abs(u - g) for g in vgrid) <= gm:
        continue
    d = dark[v0:v1 + 1, u - 1:u + 2].mean(axis=1)
    d = np.where(mask, d, 0.0)
    runs = []
    i = 0
    while i < len(d):
        if d[i] >= thr:
            j = i
            while j < len(d) and d[j] >= thr:
                j += 1
            seg = d[i:j]
            c = i + float((seg * np.arange(len(seg))).sum() / seg.sum())
            runs.append((v0 + c, j - i, float(seg.max())))
            i = j
        else:
            i += 1
    M = 1 + (u - 320) / 1600
    print(f'{u}\t{M:.4f}\t' + '\t'.join(f'{c:.1f}:{w}:{p:.0f}' for c, w, p in runs))
