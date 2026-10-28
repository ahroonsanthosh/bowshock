"""Label non-grid ink in a panel as connected components and draw them.

usage: python3 -I components.py SCRIPTS_DIR PAGE.npy CAL.json PANEL OUT_PREFIX [X0 Y0 X1 Y1 SCALE]
Writes OUT_PREFIX.png (grid light grey, other ink black, component ids in
colour) and OUT_PREFIX.json (per component: id, n pixels, bbox, centroid,
end points along the principal axis, length along it, mean width).
Default view region is the panel frame plus a margin, at scale 3.
"""
import sys
sys.path.insert(0, sys.argv[1])
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from common import load, grid_mask, to_plot

page, calp, panel, outp = sys.argv[2:6]
ink, cal = load(page, calp, panel)
fr = cal['frame_nominal']
if len(sys.argv) > 6:
    X0, Y0, X1, Y1, SC = map(int, sys.argv[6:11])
else:
    X0, Y0, X1, Y1, SC = int(fr['xl']) - 8, int(fr['yt']) - 8, int(fr['xr']) + 9, int(fr['yb']) + 9, 3
gm, info = grid_mask(ink, cal)
cur = (ink == 1) & ~gm
# restrict to the panel interior (plus the frame band) for labelling
sub = cur[Y0:Y1, X0:X1]
lab, n = ndimage.label(sub, structure=np.ones((3, 3)))
comps = []
for i in range(1, n + 1):
    ys, xs = np.where(lab == i)
    if len(xs) == 0:
        continue
    xs = xs + X0
    ys = ys + Y0
    cxp, cyp = xs.mean(), ys.mean()
    if len(xs) >= 3:
        cov = np.cov(np.vstack([xs, ys]))
        w, v = np.linalg.eigh(cov)
        d = v[:, 1]
        t = (xs - cxp) * d[0] + (ys - cyp) * d[1]
        i0, i1 = np.argmin(t), np.argmax(t)
        length = t.max() - t.min() + 1
        width = len(xs) / length
        e0 = (int(xs[i0]), int(ys[i0]))
        e1 = (int(xs[i1]), int(ys[i1]))
    else:
        length, width, e0, e1 = len(xs), 1, (int(xs[0]), int(ys[0])), (int(xs[-1]), int(ys[-1]))
    pv = to_plot(cal, cxp, cyp)
    comps.append({'id': i, 'n': int(len(xs)), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                  'c': [round(float(cxp), 1), round(float(cyp), 1)],
                  'c_plot': [round(float(pv[0]), 4), round(float(pv[1]), 3)],
                  'e0': e0, 'e1': e1, 'len': round(float(length), 1), 'width': round(float(width), 2)})
np.save(outp + '_labels.npy', lab)
np.save(outp + '_gridmask.npy', gm[Y0:Y1, X0:X1])
json.dump({'panel': panel, 'region': [X0, Y0, X1, Y1], 'grid_info': info, 'comps': comps},
          open(outp + '.json', 'w'), indent=0)

# draw
reg_ink = ink[Y0:Y1, X0:X1]
reg_gm = gm[Y0:Y1, X0:X1]
img = np.full((Y1 - Y0, X1 - X0, 3), 255, np.uint8)
img[(reg_ink == 1) & reg_gm] = (200, 200, 200)
palette = [(220, 0, 0), (0, 120, 0), (0, 0, 220), (160, 0, 160), (0, 130, 130), (200, 110, 0)]
for c in comps:
    col = palette[c['id'] % len(palette)]
    img[lab == c['id']] = col
im = Image.fromarray(img).resize(((X1 - X0) * SC, (Y1 - Y0) * SC), Image.NEAREST)
d = ImageDraw.Draw(im)
for c in comps:
    if c['n'] < 5:
        continue
    col = palette[c['id'] % len(palette)]
    x = (c['c'][0] - X0) * SC + 6
    y = (c['c'][1] - Y0) * SC - 6
    d.text((x, y), str(c['id']), fill=col)
# pixel ticks
for x in range(X0 - X0 % 10, X1, 10):
    if x < X0:
        continue
    X = (x - X0) * SC
    L = 10 if x % 50 == 0 else 4
    d.line([(X, 0), (X, L)], fill=(255, 0, 0))
    if x % 50 == 0:
        d.text((X + 2, 10), str(x), fill=(255, 0, 0))
for y in range(Y0 - Y0 % 10, Y1, 10):
    if y < Y0:
        continue
    Y = (y - Y0) * SC
    L = 10 if y % 50 == 0 else 4
    d.line([(0, Y), (L, Y)], fill=(0, 0, 255))
    if y % 50 == 0:
        d.text((12, Y + 1), str(y), fill=(0, 0, 255))
im.save(outp + '.png')
print(outp + '.png', im.size, 'components', len(comps), 'grid widths', [(a, b, w) for a, b, w in info])
for c in comps:
    if c['n'] >= 5:
        print(f"  {c['id']:3d} n={c['n']:4d} c=({c['c'][0]:.0f},{c['c'][1]:.0f}) plot=({c['c_plot'][0]:+.3f},{c['c_plot'][1]:.2f}) len={c['len']:.0f} w={c['width']:.1f} e0={c['e0']} e1={c['e1']}")
