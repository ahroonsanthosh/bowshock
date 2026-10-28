import sys, json
import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates
img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
scale = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0   # pixel scale relative to native 300 ppi
TH = 130.0
def val(x, y):
    return map_coordinates(img, [[y], [x]], order=1)[0]

def ray_edge(cx, cy, ang, rmax):
    rs = np.arange(0, rmax, 0.05*scale)
    xs = cx + rs*np.cos(ang); ys = cy + rs*np.sin(ang)
    v = map_coordinates(img, [ys, xs], order=1)
    # first crossing from bright to dark
    br = np.where(v > TH)[0]
    if len(br) == 0: return None
    i0 = br[0]
    for i in range(i0, len(v)-1):
        if v[i] >= TH and v[i+1] < TH:
            f = (v[i]-TH)/(v[i]-v[i+1])
            r = rs[i] + f*(rs[i+1]-rs[i])
            return cx + r*np.cos(ang), cy + r*np.sin(ang), r
    return None

def hole_seed(x, y, h):
    h = int(h)
    xi, yi = int(round(x)), int(round(y))
    sub = img[yi-h:yi+h+1, xi-h:xi+h+1]
    yy, xx = np.mgrid[yi-h:yi+h+1, xi-h:xi+h+1]
    m = sub > 180
    if m.sum() == 0: return x, y
    return xx[m].mean(), yy[m].mean()

def fit_circle(pts):
    x, y = pts[:,0], pts[:,1]
    A = np.column_stack([x, y, np.ones_like(x)])
    b = x**2 + y**2
    c, *_ = np.linalg.lstsq(A, b, rcond=None)
    cx, cy = c[0]/2, c[1]/2
    r = np.sqrt(c[2] + cx**2 + cy**2)
    return cx, cy, r

def circle_center(x, y):
    cx, cy = hole_seed(x, y, 3*scale)
    for it in range(4):
        pts = []
        for a in np.linspace(0, 2*np.pi, 72, endpoint=False):
            e = ray_edge(cx, cy, a, 10*scale)
            if e: pts.append(e[:2])
        pts = np.array(pts)
        ccx, ccy, r = fit_circle(pts)
        res = np.hypot(pts[:,0]-ccx, pts[:,1]-ccy) - r
        m = np.abs(res) < max(2.5*np.std(res), 0.3*scale)
        ccx, ccy, r = fit_circle(pts[m])
        cx, cy = ccx, ccy
    res = np.hypot(pts[m,0]-cx, pts[m,1]-cy) - r
    return cx, cy, r, np.std(res), m.sum()

def square_center(x, y):
    cx, cy = hole_seed(x, y, 3*scale)
    for it in range(3):
        L=[];R=[];U=[];D=[]
        for d in np.linspace(-2.5*scale, 2.5*scale, 11):
            e = ray_edge(cx, cy+d, np.pi, 12*scale);  L.append(e[0]) if e else None
            e = ray_edge(cx, cy+d, 0.0, 12*scale);    R.append(e[0]) if e else None
            e = ray_edge(cx+d, cy, -np.pi/2, 12*scale); U.append(e[1]) if e else None
            e = ray_edge(cx+d, cy, np.pi/2, 12*scale);  D.append(e[1]) if e else None
        ncx = (np.median(L)+np.median(R))/2; ncy = (np.median(U)+np.median(D))/2
        cx, cy = ncx, ncy
    return cx, cy, (np.median(R)-np.median(L)), (np.median(D)-np.median(U))

def stroke_centers_row(y, x_lo, x_hi):
    # dark minima (stroke centres) along a row, subpixel by parabola on smoothed profile
    xs = np.arange(x_lo, x_hi, 0.1*scale)
    v = map_coordinates(img, [np.full_like(xs, y), xs], order=1)
    out=[]
    inrun=False
    for i in range(len(v)):
        if v[i] < TH and not inrun: inrun=True; s=i
        if v[i] >= TH and inrun:
            inrun=False; seg=slice(s,i); w=np.clip(TH - v[seg],0,None)
            out.append(((w*xs[seg]).sum()/w.sum(), xs[s], xs[i]))
    return out

def triangle_center(x, y, ylo, yhi, base_rows, base_cols, xwin):
    # side strokes: for rows ylo..yhi find left and right stroke centres within xwin
    Ls=[]; Rs=[]
    for yy in np.arange(ylo, yhi+0.01, 0.5*scale):
        sc = stroke_centers_row(yy, xwin[0], xwin[1])
        if len(sc) >= 2:
            Ls.append((yy, sc[0][0])); Rs.append((yy, sc[-1][0]))
    Ls=np.array(Ls); Rs=np.array(Rs)
    pl = np.polyfit(Ls[:,0], Ls[:,1], 1); pr = np.polyfit(Rs[:,0], Rs[:,1], 1)
    # apex: intersection x = pl0*y+pl1 = pr0*y+pr1
    ya = (pr[1]-pl[1])/(pl[0]-pr[0]); xa = pl[0]*ya+pl[1]
    # base stroke centre row: along columns in base_cols, darkness-weighted centroid within base_rows
    yb=[]
    for xx in np.arange(base_cols[0], base_cols[1]+0.01, 0.5*scale):
        ys = np.arange(base_rows[0], base_rows[1], 0.1*scale)
        v = map_coordinates(img, [ys, np.full_like(ys, xx)], order=1)
        w = np.clip(TH - v, 0, None)
        if w.sum()>0: yb.append((w*ys).sum()/w.sum())
    yb = np.median(yb)
    xl = pl[0]*yb+pl[1]; xr = pr[0]*yb+pr[1]
    xc = (xa + xl + xr)/3; yc = (ya + 2*yb)/3
    return xc, yc, dict(apex=(xa,ya), base_y=yb, base_l=xl, base_r=xr, side_w=xr-xl, height=yb-ya,
                        resid_l=float(np.std(Ls[:,1]-np.polyval(pl,Ls[:,0]))), resid_r=float(np.std(Rs[:,1]-np.polyval(pr,Rs[:,0]))))

if __name__ == '__main__':
    pass
