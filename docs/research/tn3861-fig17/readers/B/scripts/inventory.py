# Inventory of ink inside the plot frame once the fitted grid lines are masked out, to make sure no symbol is missed.
# usage: inventory.py page.png calib.json out_mask.png
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
a = np.asarray(Image.open(sys.argv[1]), dtype=float)
cal = json.load(open(sys.argv[2]))
H, W = a.shape
dark = a < 150
yy, xx = np.mgrid[0:H, 0:W]
mask = np.zeros_like(dark)
for L in cal['vertical']:
    if 'x_at_y1080' in L:
        xl = L['x_at_y1080'] + L['slope_dx_per_dy'] * (yy - 1080)
        mask |= np.abs(xx - xl) < 3.0
for L in cal['horizontal']:
    if 'y_at_x1588' in L:
        yl = L['y_at_x1588'] + L['slope_dy_per_dx'] * (xx - 1588)
        mask |= np.abs(yy - yl) < 3.0
d = dark & ~mask
# restrict to the plot interior
d[:, :490] = False; d[:, 2684:] = False; d[:415, :] = False; d[1752:, :] = False
lab, n = ndi.label(d, structure=np.ones((3, 3)))
objs = ndi.find_objects(lab)
rows = []
for i, sl in enumerate(objs):
    h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
    npx = (lab[sl] == i + 1).sum()
    if npx < 15: continue
    rows.append((sl[1].start, sl[0].start, w, h, npx))
rows.sort()
for r in rows:
    print('x %4d y %4d w %3d h %3d n %4d' % r)
Image.fromarray(np.where(d, 0, 255).astype(np.uint8)).save(sys.argv[3])
