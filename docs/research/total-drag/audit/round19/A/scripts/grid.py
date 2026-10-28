import sys, json
import numpy as np
from PIL import Image
img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
H = {-0.32:2148, -0.24:2345, -0.16:2540, -0.08:2735, 0.0:2930}
V = {0.0:212, 0.2:415, 0.4:616, 0.6:817, 0.8:1018, 1.0:1218}
win = 14
def centre(profile):
    d = 255 - profile
    d = np.where(d > 90, d, 0)   # only dark ink
    if d.sum() == 0: return None, 0
    idx = np.arange(len(profile))
    return (d*idx).sum()/d.sum(), (d>0).sum()
def robust_fit(t, s):
    t = np.array(t); s = np.array(s)
    keep = np.ones(len(t), bool)
    for _ in range(6):
        p = np.polyfit(t[keep], s[keep], 1)
        r = s - np.polyval(p, t)
        sd = np.std(r[keep])
        newkeep = np.abs(r) < max(2.5*sd, 0.6)
        if (newkeep == keep).all(): break
        keep = newkeep
    return p, r, keep
out = {'h':{}, 'v':{}}
# horizontal gridlines: y as function of x
for val, y0 in H.items():
    ts, ss = [], []
    for x in range(225, 1210, 2):
        prof = img[y0-win:y0+win+1, x]
        c, w = centre(prof)
        if c is None or w > 9: continue   # skip blank or thick blobs
        ts.append(x); ss.append(y0-win+c)
    p, r, keep = robust_fit(ts, ss)
    out['h'][val] = list(p)
    print(f"H {val:+.2f}: y = {p[1]:.2f} + {p[0]:.5f} x   n={keep.sum()}/{len(ts)} rms={np.std(r[keep]):.2f}  x-range {min(ts)}-{max(ts)}")
for val, x0 in V.items():
    ts, ss = [], []
    for y in range(2140, 2935, 2):
        prof = img[y, x0-win:x0+win+1]
        c, w = centre(prof)
        if c is None or w > 9: continue
        ts.append(y); ss.append(x0-win+c)
    p, r, keep = robust_fit(ts, ss)
    out['v'][val] = list(p)
    print(f"V {val:.1f}: x = {p[1]:.2f} + {p[0]:.5f} y   n={keep.sum()}/{len(ts)} rms={np.std(r[keep]):.2f}  y-range {min(ts)}-{max(ts)}")
json.dump({k:{str(a):b for a,b in d.items()} for k,d in out.items()}, open(sys.argv[2],'w'), indent=1)
