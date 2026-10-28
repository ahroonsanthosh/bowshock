import sys, json
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
inv = 255 - im
def track_vertical(x_guess, yr, half=5, slope=-0.01):
    pts=[]
    for y in range(*yr):
        xc = x_guess + slope*(y-yr[0])
        lo, hi = int(round(xc-half)), int(round(xc+half))+1
        w = inv[y, lo:hi]
        bg = np.median(inv[y, lo-15:lo-5])
        w2 = np.clip(w - bg - 40, 0, None)
        if w2.sum() > 150:
            pts.append((y, (w2*np.arange(lo,hi)).sum()/w2.sum()))
    pts=np.array(pts)
    return pts
def track_horizontal(y_guess, xr, half=5, slope=0.0097):
    pts=[]
    for x in range(*xr):
        yc = y_guess + slope*(x-xr[0])
        lo, hi = int(round(yc-half)), int(round(yc+half))+1
        w = inv[lo:hi, x]
        bg = np.median(inv[lo-15:lo-5, x])
        w2 = np.clip(w - bg - 40, 0, None)
        if w2.sum() > 150:
            pts.append((x, (w2*np.arange(lo,hi)).sum()/w2.sum()))
    return np.array(pts)
def robust_fit(t, v, n=3):
    m = np.ones(len(t), bool)
    for _ in range(n):
        A = np.vstack([np.ones(m.sum()), t[m]]).T
        c, *_ = np.linalg.lstsq(A, v[m], rcond=None)
        r = v - (c[0]+c[1]*t)
        s = np.std(r[m])
        m = np.abs(r) < max(2.5*s, 0.6)
    return c, s, m.sum(), len(t)
res = {}
# vertical gridlines: x guesses at y=2150
vg = {0.0:219.5, 0.2:420, 0.4:620.5, 0.6:820.5, 0.8:1020.5, 1.0:1219}
for val,xg in vg.items():
    pts = track_vertical(xg, (2152, 2925))
    if len(pts)==0: print('none',val); continue
    c,s,nu,nt = robust_fit(pts[:,0], pts[:,1])
    print(f'V d/h={val}: x = {c[0]:.2f} + {c[1]:.5f}*y  sd={s:.2f}  used {nu}/{nt}  yrange {pts[:,0].min():.0f}-{pts[:,0].max():.0f}')
    res[('V',val)] = c.tolist()
hg = {-0.32:2147.5, -0.24:2344.5, -0.16:2538.5, -0.08:2733.5, 0.0:2928}
for val,yg in hg.items():
    pts = track_horizontal(yg - 0.0097*(225-225), (225, 1215))
    if len(pts)==0: print('none',val); continue
    c,s,nu,nt = robust_fit(pts[:,0], pts[:,1])
    print(f'H p={val}: y = {c[0]:.2f} + {c[1]:.5f}*x  sd={s:.2f}  used {nu}/{nt} xrange {pts[:,0].min():.0f}-{pts[:,0].max():.0f}')
    res[('H',val)] = c.tolist()
# intersections
rows=[]
for (k1,v1),(a,b) in [(k,c) for k,c in res.items() if k[0]=='V']:
    for (k2,v2),(c0,d) in [(k,c) for k,c in res.items() if k[0]=='H']:
        # x = a + b y ; y = c0 + d x  => y = c0 + d(a + b y) => y(1 - d b) = c0 + d a
        y = (c0 + d*a)/(1 - d*b); x = a + b*y
        rows.append((v1, v2, x, y))
rows=np.array(rows)
np.save(sys.argv[2], rows)
# affine fit
A = np.column_stack([rows[:,2], rows[:,3], np.ones(len(rows))])
cx,*_ = np.linalg.lstsq(A, rows[:,0], rcond=None)
cy,*_ = np.linalg.lstsq(A, rows[:,1], rcond=None)
rx = rows[:,0] - A@cx; ry = rows[:,1] - A@cy
print('affine d/h coeffs', cx, ' resid max', np.abs(rx).max(), 'rms', np.sqrt((rx**2).mean()))
print('affine p coeffs', cy, ' resid max', np.abs(ry).max(), 'rms', np.sqrt((ry**2).mean()))
for r,ex,ey in zip(rows, rx, ry):
    print(f'{r[0]:.1f} {r[1]:+.2f} px=({r[2]:.2f},{r[3]:.2f}) res dh={ex:+.4f} p={ey:+.5f}')
json.dump({'cx':cx.tolist(),'cy':cy.tolist()}, open(sys.argv[3],'w'))
