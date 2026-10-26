"""Find centre pinpoint dots: small dark blobs with a white surround.
Usage: python3 -I dots.py IMG u0 v0 u1 v1 [minscore] [CAL.json]
Grid lines from CAL.json (if given) are painted white first."""
import json
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
a = sys.argv[1:]
img = np.asarray(Image.open(a[0]).convert('L')).astype(float)
u0, v0, u1, v1 = (int(x) for x in a[1:5])
ms = float(a[5]) if len(a) > 5 else 40
if len(a) > 6:
    cal = json.load(open(a[6]))
    H, W = img.shape
    vv_, uu_ = np.mgrid[0:H, 0:W]
    m = np.zeros(img.shape, bool)
    for h in cal['hl']:
        m |= np.abs(vv_ - (h['a'] + h['b'] * uu_)) <= 2.6
    for v in cal['vl']:
        m |= np.abs(uu_ - (v['a'] + v['b'] * vv_)) <= 2.6
    img = np.where(m, 240.0, img)
D = 255.0 - img
yy, xx = np.mgrid[-10:11, -10:11]
r = np.hypot(xx, yy)
k_in = (r <= 1.6).astype(float); k_in /= k_in.sum()
k_out = ((r >= 4) & (r <= 9)).astype(float); k_out /= k_out.sum()
S = ndimage.correlate(D, k_in) - ndimage.correlate(D, k_out)
# require surround to be light (not on a line): max of surround darkness small
mx = ndimage.maximum_filter(S, size=9)
sub = (S == mx) & (S > ms)
vv, uu = np.where(sub[v0:v1, u0:u1])
out = []
for v, u in zip(vv + v0, uu + u0):
    w = D[v - 2:v + 3, u - 2:u + 3]
    w = np.clip(w - np.percentile(D[v - 8:v + 9, u - 8:u + 9], 40), 0, None)
    gy, gx = np.mgrid[-2:3, -2:3]
    cu = u + (gx * w).sum() / w.sum(); cv = v + (gy * w).sum() / w.sum()
    out.append((cu, cv, S[v, u]))
for cu, cv, s in sorted(out):
    print(f"dot u {cu:8.2f} v {cv:8.2f} score {s:6.1f}")
