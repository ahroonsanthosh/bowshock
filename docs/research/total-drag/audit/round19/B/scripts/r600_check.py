import sys, json
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
path = sys.argv[1]
sys.argv = ['x', path, '2.0']
exec(open(__file__.replace('r600_check.py','measure.py')).read())
inv = 255 - img
SX, SY = 5092/2544, 6592/3292
def robust_fit(t, v, n=3):
    m = np.ones(len(t), bool)
    for _ in range(n):
        A = np.vstack([np.ones(m.sum()), t[m]]).T
        c, *_ = np.linalg.lstsq(A, v[m], rcond=None)
        r = v - (c[0]+c[1]*t); s = np.std(r[m]); m = np.abs(r) < max(2.5*s, 1.2)
    return c, s
def track(guess, rng, slope, vertical):
    pts=[]
    for t in range(*rng):
        cc = guess + slope*(t-rng[0]); lo, hi = int(round(cc-10)), int(round(cc+10))+1
        w = inv[t, lo:hi] if vertical else inv[lo:hi, t]
        bgw = inv[t, lo-30:lo-10] if vertical else inv[lo-30:lo-10, t]
        w2 = np.clip(w - np.median(bgw) - 40, 0, None)
        if w2.sum() > 300: pts.append((t, (w2*np.arange(lo,hi)).sum()/w2.sum()))
    return np.array(pts)
V={}; Hh={}
for val, xg in {0.0:219.5, 0.2:420, 0.4:620.5, 0.6:820.5, 0.8:1020.5, 1.0:1219}.items():
    pts = track(xg*SX, (int(2152*SY), int(2925*SY)), -0.0105, True)
    c, s = robust_fit(pts[:,0], pts[:,1]); V[val] = (float(c[0]), float(c[1]))
for val, yg in {-0.32:2147.5, -0.24:2344.5, -0.16:2538.5, -0.08:2733.5, 0.0:2928}.items():
    pts = track(yg*SY, (int(225*SX), int(1215*SX)), 0.0097, False)
    c, s = robust_fit(pts[:,0], pts[:,1]); Hh[val] = (float(c[0]), float(c[1]))
json.dump({'V':V,'H':Hh}, open(path.replace('.png','_grid.json'),'w'))
nat = json.load(open(__file__.replace('r600_check.py','centres_native.json')))
out={}
for n,v in nat.items():
    x, y = v['x']*SX, v['y']*SY
    if n[0]=='C': cx,cy,*_ = circle_center(x,y)
    elif n[0]=='S': cx,cy,*_ = square_center(x,y)
    else: cx,cy = x,y   # triangles: carried over from native silhouette measurement (scaled)
    out[n]=dict(x=float(cx), y=float(cy))
json.dump(out, open(__file__.replace('r600_check.py','centres_r600.json'),'w'), indent=1)
print('grid', V, Hh)
