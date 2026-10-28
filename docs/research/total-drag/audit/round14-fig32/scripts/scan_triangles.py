"""Search the whole figure area for triangle-like marks by normalised cross-correlation with
an outline template (legend-key size), gridline pixels zeroed first. Prints the strongest
local maxima so that no triangle is missed. Usage: scan_triangles.py page.jpg calib.json"""
import json
import sys
import numpy as np
from PIL import Image
from scipy.signal import fftconvolve
from scipy.ndimage import maximum_filter
sys.path.insert(0, __import__('os').path.dirname(__file__))
from trifit import tri_ink, lpos

a = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
cal = json.load(open(sys.argv[2]))
ink = 255 - a
H, W = ink.shape
ys, xs = np.mgrid[0:H, 0:W]
# zero gridline pixels inside the frame
x0, x1, y0, y1 = 300, 2060, 700, 2320
sub = ink[y0:y1, x0:x1].copy()
sy, sx = ys[y0:y1, x0:x1], xs[y0:y1, x0:x1]
for f in cal['vertical']:
    sub[np.abs(sx - lpos(f, sy)) <= 1.6] = 0
for f in cal['horizontal']:
    sub[np.abs(sy - lpos(f, sx)) <= 1.6] = 0
# template on a 31x31 grid centred on the centroid
ty, tx = np.mgrid[-15:16, -15:16]
T = tri_ink(tx.astype(float), ty.astype(float), 0.0, 0.0, 18.95, 15.91, 0.91)
# zero the template's apex column and base row? no: keep full, gridline zeroing affects all equally
T = T - T.mean()
num = fftconvolve(sub, T[::-1, ::-1], mode='same')
loc_energy = np.sqrt(fftconvolve(sub ** 2, np.ones_like(T), mode='same') + 1e-6)
ncc = num / (loc_energy * np.sqrt((T ** 2).sum()))
mx = maximum_filter(ncc, size=9)
pk = np.argwhere((ncc == mx) & (ncc > 0.30))
vals = sorted(((ncc[p[0], p[1]], p[1] + x0, p[0] + y0) for p in pk), reverse=True)
print('ncc, x, y  (top 40)')
for v, x, y in vals[:40]:
    print(f'{v:.3f} {x:5d} {y:5d}')
