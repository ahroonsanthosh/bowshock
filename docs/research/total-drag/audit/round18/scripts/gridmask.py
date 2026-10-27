"""Build a grid mask from the calibration's per-line fits and write a view where
grid pixels are grey and other ink black. Usage: gridmask.py img.png calib.json out_mask.npy out_view.png x0 y0 x1 y1 scale"""
import sys, json
import numpy as np
from PIL import Image
img, cj, outm, outv = sys.argv[1:5]
x0, y0, x1, y1 = map(int, sys.argv[5:9]); sc = int(sys.argv[9])
a = np.array(Image.open(img).convert('L')) < 128
C = json.load(open(cj))
H, W = a.shape
yy, xx = np.mgrid[0:H, 0:W]
grid = np.zeros_like(a)
for d in C['lines']['vertical']:
    xc = d['x_at_y1200'] + d['slope_dx_dy']*(yy-1200)
    grid |= (np.abs(xx - xc) <= 2.6) & (yy >= 945) & (yy <= 1463) & (xx > 1590) & (xx < 2120)
for d in C['lines']['horizontal']:
    yc = d['y_at_x1850'] + d['slope_dy_dx']*(xx-1850)
    grid |= (np.abs(yy - yc) <= 2.6) & (xx >= 1600) & (xx <= 2110) & (yy > 940) & (yy < 1470)
gm = grid & a
np.save(outm, gm)
v = np.full(a.shape + (3,), 255, np.uint8)
v[a] = (0, 0, 0)
v[gm] = (170, 170, 255)
im = Image.fromarray(v[y0:y1, x0:x1])
im = im.resize((im.size[0]*sc, im.size[1]*sc), Image.NEAREST)
im.save(outv)
print('grid ink px', gm.sum())
