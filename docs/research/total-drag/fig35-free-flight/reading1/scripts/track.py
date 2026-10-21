"""Follow one line of the rectified fig. 35 along a guide polyline.

Rectified frame: 160 px per grid cell, M = 1 + (u - 320) / 1600,
P_B = (v - 320) / 8000 - 0.36 (v grows downward, toward less negative P_B).

For each column u from the guide's first to last point (step `st`), the
guide gives v_g(u). In the 3-column-averaged darkness d = 255 - grey,
inside v_g +- R (rows within `gm` px of a horizontal grid line masked),
the run of rows above `thr` whose centre lies nearest v_g is taken, if it
lies within R; its darkness-weighted centre is the line's v. Columns within
`gm` px of a vertical grid line are skipped. Also printed, along the
guide, the darkness at the guide itself (for dash patterns).

usage: track.py rect.png out.tsv R thr st u1,v1 u2,v2 ...
"""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
R, thr, st = float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])
guide = np.array([[float(x) for x in p.split(',')] for p in sys.argv[6:]])
im = np.asarray(Image.open(src).convert('L')).astype(float)
dark = 255.0 - im
gm = 7
hgrid = [320 + 160 * j for j in range(-2, 22)]
vgrid = [320 + 160 * k for k in range(-2, 28)]
rows = []
for u in range(int(guide[0, 0]), int(guide[-1, 0]) + 1, st):
    vg = float(np.interp(u, guide[:, 0], guide[:, 1]))
    if min(abs(u - g) for g in vgrid) <= gm:
        continue
    lo, hi = int(vg - R), int(vg + R) + 1
    vs = np.arange(lo, hi + 1)
    d = dark[lo:hi + 1, u - 1:u + 2].mean(axis=1)
    m = np.ones_like(vs, dtype=bool)
    for g in hgrid:
        m &= np.abs(vs - g) > gm
    d = np.where(m, d, 0.0)
    runs = []
    i = 0
    while i < len(d):
        if d[i] >= thr:
            j = i
            while j < len(d) and d[j] >= thr:
                j += 1
            seg = d[i:j]
            c = lo + i + float((seg * np.arange(len(seg))).sum() / seg.sum())
            runs.append((c, j - i, float(seg.max())))
            i = j
        else:
            i += 1
    near = min(runs, key=lambda r: abs(r[0] - vg)) if runs else None
    gd = float(dark[int(round(vg)) - 1:int(round(vg)) + 2, u - 1:u + 2].mean())
    rows.append((u, vg, near, gd, m[int(round(vg)) - lo] if 0 <= int(round(vg)) - lo < len(m) else False))
with open(out, 'w') as f:
    f.write('u\tM\tv_guide\tv\twidth\tpeak\tPB\tdark_at_guide\n')
    for u, vg, near, gd, ok in rows:
        M = 1 + (u - 320) / 1600
        if near is None:
            f.write(f'{u}\t{M:.4f}\t{vg:.1f}\t\t\t\t\t{gd:.0f}\n')
        else:
            c, w, p = near
            f.write(f'{u}\t{M:.4f}\t{vg:.1f}\t{c:.2f}\t{w}\t{p:.0f}\t{(c - 320) / 8000 - 0.36:.5f}\t{gd:.0f}\n')
print(out, len(rows))
