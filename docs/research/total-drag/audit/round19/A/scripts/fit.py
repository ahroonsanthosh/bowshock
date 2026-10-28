import sys, json
import numpy as np
from PIL import Image
from scipy.optimize import minimize
from scipy.ndimage import binary_dilation
img = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
g = json.load(open(sys.argv[2]))
Hl = [v for k,v in g['h'].items()]; Vl = [v for k,v in g['v'].items()]
syms = {
 'c1':('o',564,2512),'c2':('o',713,2489),'c3':('o',815,2455),'c4':('o',915,2408),'c5':('o',1015,2376),'c6':('o',1115,2376),'c7':('o',1207,2920),
 't1':('t',516,2593),'t2':('t',606,2590),'t3':('t',815,2554),'t4':('t',1114,2469),
 's1':('s',513,2656),'s2':('s',613,2649),'s3':('s',815,2623),'s4':('s',1115,2589)}
HW = 15
def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx-ax, by-ay
    t = np.clip(((px-ax)*vx + (py-ay)*vy)/(vx*vx+vy*vy), 0, 1)
    return np.hypot(px-ax-t*vx, py-ay-t*vy)
def poly_sdf(px, py, verts):
    d = np.full(px.shape, np.inf); inside = np.zeros(px.shape, bool)
    n = len(verts)
    for i in range(n):
        ax, ay = verts[i]; bx, by = verts[(i+1)%n]
        d = np.minimum(d, seg_dist(px, py, ax, ay, bx, by))
        cond = ((ay > py) != (by > py)) & (px < (bx-ax)*(py-ay)/(by-ay+1e-12) + ax)
        inside ^= cond
    return np.where(inside, -d, d)
def sdf(kind, p, X, Y):
    cx, cy = p[0], p[1]
    u, v = X-cx, Y-cy           # image coords (v down)
    if kind == 'o':
        rx, ry = p[2], p[3]
        # approximate ellipse sdf
        r = np.hypot(u/rx, v/ry)
        return (r - 1) * np.sqrt(rx*ry)
    if kind == 's':
        a, b = p[2], p[3]
        return poly_sdf(u, v, [(-a,-b),(a,-b),(a,b),(-a,b)])
    if kind == 't':
        bw, h = p[2], p[3]       # base width, height (stroke centreline), centroid at origin, apex up
        return poly_sdf(u, v, [(0,-2*h/3),(bw/2,h/3),(-bw/2,h/3)])
def model(kind, p, X, Y):
    w = p[4]
    return np.clip(w/2 + 0.5 - np.abs(sdf(kind, p, X, Y)), 0, 1)
out = {}
for name,(kind,gx,gy) in syms.items():
    x0, y0 = gx-HW, gy-HW
    win = img[y0:y0+2*HW+1, x0:x0+2*HW+1]
    bg = np.percentile(win, 90); ink = np.percentile(win, 3)
    D = np.clip((bg - win)/(bg - ink), 0, 1)
    yy, xx = np.mgrid[0:D.shape[0], 0:D.shape[1]]
    X = xx + x0.__float__(); Y = yy + float(y0)
    gm = np.zeros(D.shape, bool)
    for b,a in Hl: gm |= np.abs(Y - (a + b*X)) < 1.8
    for b,a in Vl: gm |= np.abs(X - (a + b*Y)) < 1.8
    if kind == 'o': p = np.array([gx, gy, 5.0, 5.0, 2.0])
    if kind == 's': p = np.array([gx, gy, 5.3, 5.3, 2.0])
    if kind == 't': p = np.array([gx, gy, 12.0, 10.5, 2.0])
    for it in range(4):
        s = sdf(kind, p, X, Y)
        ext = (D > 0.35) & (s > p[4]/2 + 0.8)
        ext = binary_dilation(ext, iterations=1) & (s > 0)
        valid = (~gm) & (~ext) & (s < p[4]/2 + 3.5)
        def cost(q):
            if q[4] < 0.8 or q[4] > 4 or min(q[2],q[3]) < 2: return 1e9
            if np.hypot(q[0]-gx, q[1]-gy) > 5: return 1e9
            if kind=='t' and not (9 < q[2] < 17 and 8 < q[3] < 15): return 1e9
            if kind!='t' and max(q[2],q[3]) > 8: return 1e9
            return ((D - model(kind, q, X, Y))[valid]**2).sum()
        r = minimize(cost, p, method='Nelder-Mead', options={'xatol':1e-3,'fatol':1e-4,'maxiter':4000,'maxfev':8000})
        p = r.x
    # bootstrap-like sensitivity: refit from perturbed starts
    starts = []
    rng = np.random.default_rng(1)
    for k in range(8):
        q0 = p + np.r_[rng.normal(0,0.7,2), rng.normal(0,0.3,2), 0]
        rr = minimize(cost, q0, method='Nelder-Mead', options={'xatol':1e-3,'fatol':1e-4,'maxiter':4000,'maxfev':8000})
        starts.append(rr.x[:2])
    starts = np.array(starts)
    info = dict(kind=kind, px=float(p[0]), py=float(p[1]), s1=float(p[2]), s2=float(p[3]), w=float(p[4]),
                cost=float(r.fun), npix=int(valid.sum()), restart_sd_x=float(starts[:,0].std()), restart_sd_y=float(starts[:,1].std()))
    if kind == 't':
        # bbox centre (outer) : apex outer y and base outer y
        h = p[3]
        info['py_bboxmid'] = float(p[1] + (-2*h/3 + h/3)/2)
    out[name] = info
    print(name, kind, f"c=({p[0]:.2f},{p[1]:.2f}) size=({p[2]:.2f},{p[3]:.2f}) w={p[4]:.2f} rms={np.sqrt(r.fun/valid.sum()):.3f} n={valid.sum()} restart sd=({starts[:,0].std():.2f},{starts[:,1].std():.2f})" + (f" bboxmid_y={info['py_bboxmid']:.2f}" if kind=='t' else ""))
    np.save(f'fitmask_{name}.npy', np.stack([D, valid.astype(float), model(kind,p,X,Y)]))
json.dump(out, open(sys.argv[3],'w'), indent=1)
