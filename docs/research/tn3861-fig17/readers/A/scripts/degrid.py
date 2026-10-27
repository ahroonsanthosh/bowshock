"""Make a grid-masked darkness image of the plot and list dark connected components.
usage: python -I degrid.py gray.png calib.json out_mask.png"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
g = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
cal = json.load(open(sys.argv[2]))
H, W = g.shape
yy, xx = np.mgrid[0:H, 0:W]
grid = np.zeros_like(g, bool)
for L in cal['lines']:
    if L['axis'] == 'M':
        d = yy - (L['a'] + L['b']*xx)
    else:
        d = xx - (L['a'] + L['b']*yy)
    grid |= np.abs(d) <= 3.0
dark = (g < 140) & ~grid
# restrict to inside the plot frame, excluding the legend box (M>1.55 and CD>1.72)
cM = np.array(cal['affine']['M']); cC = np.array(cal['affine']['CD'])
Mm = cM[0] + cM[1]*xx + cM[2]*yy; Cm = cC[0] + cC[1]*xx + cC[2]*yy
inside = (Mm > 0.02) & (Mm < 8.98) & (Cm > 0.02) & (Cm < 2.73) & ~((Mm > 1.52) & (Cm > 1.72))
dark &= inside
out = np.where(dark, 0, 255).astype(np.uint8)
Image.fromarray(out).save(sys.argv[3])
lab, n = ndimage.label(dark, structure=np.ones((3, 3)))
objs = ndimage.find_objects(lab)
print('components:', n)
for i, sl in enumerate(objs):
    h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
    cnt = int((lab[sl] == i+1).sum())
    if cnt < 40:
        continue
    cy = 0.5*(sl[0].start + sl[0].stop); cx = 0.5*(sl[1].start + sl[1].stop)
    print('comp %3d px x %4d..%4d y %4d..%4d  size %3dx%3d  pixels %5d  bbox-centre M %.3f CD %.3f' % (
        i+1, sl[1].start, sl[1].stop, sl[0].start, sl[0].stop, w, h, cnt,
        cM[0]+cM[1]*cx+cM[2]*cy, cC[0]+cC[1]*cx+cC[2]*cy))
