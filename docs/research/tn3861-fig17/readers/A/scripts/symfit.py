"""Fit symbol outlines to the scan to find each symbol's centre from its own strokes.

usage: python -I symfit.py gray.png calib.json symbols.json out.json [diag_dir]

symbols.json: list of dicts with
  id, shape (circle|square|diamond|tri|quarter|dee), M, CD (rough centre),
  size (half-width in px, optional; fixed if fix_size true), fix_size,
  segs (optional list of outline segment names to use; default all),
  exclude (optional list of [a0,a1,b0,b1] boxes in local px around the rough centre
           where outline samples are ignored, e.g. where another symbol overlaps),
  crossed (bool: measure the cross arms), arm_exclude (boxes ignored for arm profiles)
Local coordinates (a, b) are in page pixels, a along +M, b along +CD, origin at the
symbol's reference point (centre of its bounding square).
"""
import sys, json, os
import numpy as np
from PIL import Image
from scipy import ndimage, optimize

g = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
cal = json.load(open(sys.argv[2]))
syms = json.load(open(sys.argv[3]))
diag = sys.argv[5] if len(sys.argv) > 5 else None
D = ndimage.gaussian_filter(255.0 - g, 0.8)
H, W = g.shape
cM = np.array(cal['affine']['M']); cC = np.array(cal['affine']['CD'])
J = np.array([[cM[1], cM[2]], [cC[1], cC[2]]]); G = np.linalg.inv(J)
eM = G[:, 0]/np.linalg.norm(G[:, 0]); eC = G[:, 1]/np.linalg.norm(G[:, 1])

def to_fig(x, y):
    return cM[0] + cM[1]*x + cM[2]*y, cC[0] + cC[1]*x + cC[2]*y

def to_page(M, CD):
    v = np.linalg.solve(J, np.array([M - cM[0], CD - cC[0]]))
    return v[0], v[1]

# grid mask (page): within 2.5 px of a grid line
def grid_dist(x, y):
    d = np.full(np.shape(x), 1e9)
    for L in cal['lines']:
        if L['axis'] == 'M':
            dd = np.abs(y - (L['a'] + L['b']*x))
        else:
            dd = np.abs(x - (L['a'] + L['b']*y))
        d = np.minimum(d, dd)
    return d

def seg(p, q, n=None):
    p = np.array(p, float); q = np.array(q, float)
    L = np.linalg.norm(q-p); n = n or max(4, int(L/0.5))
    t = np.linspace(0, 1, n)[:, None]
    return p + t*(q-p)

def arc(c, r, t0, t1):
    n = max(8, int(abs(t1-t0)*r/0.5))
    t = np.linspace(t0, t1, n)
    return np.c_[c[0] + r*np.cos(t), c[1] + r*np.sin(t)]

def outline(shape, s, segs=None):
    S = {}
    if shape == 'circle':
        S['arc'] = arc((0, 0), s, 0, 2*np.pi)
    elif shape == 'square':
        S['bottom'] = seg((-s, -s), (s, -s)); S['right'] = seg((s, -s), (s, s))
        S['top'] = seg((s, s), (-s, s)); S['left'] = seg((-s, s), (-s, -s))
    elif shape == 'diamond':
        S['ne'] = seg((0, s), (s, 0)); S['se'] = seg((s, 0), (0, -s))
        S['sw'] = seg((0, -s), (-s, 0)); S['nw'] = seg((-s, 0), (0, s))
    elif shape == 'tri':      # right angle at bottom-right, hypotenuse bottom-left to top-right
        S['bottom'] = seg((-s, -s), (s, -s)); S['right'] = seg((s, -s), (s, s))
        S['hyp'] = seg((s, s), (-s, -s))
    elif shape == 'quarter':  # corner at bottom-right, arc of radius 2s through the upper left
        S['bottom'] = seg((-s, -s), (s, -s)); S['right'] = seg((s, -s), (s, s))
        S['arc'] = arc((s, -s), 2*s, np.pi/2, np.pi)
    elif shape == 'dee':      # flat bottom, straight sides, semicircular top centred at origin
        S['bottom'] = seg((-s, -s), (s, -s)); S['right'] = seg((s, -s), (s, 0))
        S['left'] = seg((-s, 0), (-s, -s)); S['arc'] = arc((0, 0), s, 0, np.pi)
    if segs:
        S = {k: v for k, v in S.items() if k in segs}
    return S

def centroid_offset(shape, s):
    if shape == 'tri':
        return np.array([s/3, -s/3])
    if shape == 'quarter':
        k = 1 - 8/(3*np.pi)
        return np.array([k*s, -k*s])
    if shape == 'dee':
        return np.array([0.0, -(1.0/3.0)*s/(2 + np.pi/2)])   # = -0.0933 s
    return np.array([0.0, 0.0])

def sample(px, py):
    return ndimage.map_coordinates(D, [py, px], order=1, mode='nearest')

def local_to_page(c0, ab):
    return c0[0] + ab[:, 0]*eM[0] + ab[:, 1]*eC[0], c0[1] + ab[:, 0]*eM[1] + ab[:, 1]*eC[1]

results = []
for sdef in syms:
    shape = sdef['shape']
    c0 = np.array(to_page(sdef['M'], sdef['CD']))
    s_init = sdef.get('size', 16.0)
    fix = sdef.get('fix_size', False)
    excl = sdef.get('exclude', [])
    segs = sdef.get('segs')
    def pts(p):
        da, db, s = p[0], p[1], (s_init if fix else p[2])
        S = outline(shape, s, segs)
        P = np.vstack(list(S.values()))
        P = P + np.array([da, db])
        # exclusion boxes are fixed relative to the rough centre
        keep = np.ones(len(P), bool)
        for (a0, a1, b0, b1) in excl:
            keep &= ~((P[:, 0] >= a0) & (P[:, 0] <= a1) & (P[:, 1] >= b0) & (P[:, 1] <= b1))
        x, y = local_to_page(c0, P)
        keep &= grid_dist(x, y) > 2.5
        return x[keep], y[keep]
    def score(p):
        x, y = pts(p)
        if len(x) < 20:
            return 0.0
        return -np.mean(sample(x, y))
    best = None
    for da in np.arange(-10, 10.01, 1.0):
        for db in np.arange(-10, 10.01, 1.0):
            for s in ([s_init] if fix else np.arange(s_init*0.85, s_init*1.151, s_init*0.05)):
                p = [da, db, s]
                v = score(p)
                if best is None or v < best[0]:
                    best = (v, p)
    x0 = np.array(best[1], float)
    if fix:
        f2 = lambda q: score([q[0], q[1], s_init])
        simplex = np.array([x0[:2], x0[:2] + [1.0, 0], x0[:2] + [0, 1.0]])
        res = optimize.minimize(f2, x0[:2], method='Nelder-Mead',
                                options=dict(xatol=0.01, fatol=0.001, initial_simplex=simplex, maxiter=2000))
        p = np.r_[res.x, s_init]
    else:
        simplex = np.array([x0, x0 + [1.0, 0, 0], x0 + [0, 1.0, 0], x0 + [0, 0, 0.5]])
        res = optimize.minimize(score, x0, method='Nelder-Mead',
                                options=dict(xatol=0.01, fatol=0.001, initial_simplex=simplex, maxiter=4000))
        p = res.x
    da, db, s = p
    ref = np.array(local_to_page(c0, np.array([[da, db]]))).ravel()
    x_ref, y_ref = ref
    cen = centroid_offset(shape, s) + np.array([da, db])
    cpx = np.array(local_to_page(c0, np.array([cen]))).ravel()
    # score along each segment at the optimum (mean darkness), to show which edges are supported
    segscore = {}
    for k, P in outline(shape, s, None).items():
        P = P + np.array([da, db])
        x, y = local_to_page(c0, P)
        m = grid_dist(x, y) > 2.5
        segscore[k] = round(float(np.mean(sample(x[m], y[m]))) if m.sum() else -1, 1)
    out = dict(id=sdef['id'], shape=shape, size=float(s), fix_size=fix, score=float(-res.fun),
               seg_darkness=segscore,
               ref_px=[float(x_ref), float(y_ref)], ref_fig=list(map(float, to_fig(x_ref, y_ref))),
               centroid_px=[float(cpx[0]), float(cpx[1])], centroid_fig=list(map(float, to_fig(*cpx))))
    # cross arms
    if sdef.get('crossed'):
        aex = sdef.get('arm_exclude', [])
        def arm(direction):
            # direction 'v': vertical arm (constant a): profile along a at several b
            locs = []
            for t in np.arange(-0.75*s, 0.7501*s, 0.5):
                if abs(t) < 4:
                    continue
                offs = np.arange(-0.7*s, 0.7*s+0.01, 0.25)
                if direction == 'v':
                    P = np.c_[da + offs, np.full_like(offs, db + t)]
                else:
                    P = np.c_[np.full_like(offs, da + t), db + offs]
                bad = False
                for (a0, a1, b0, b1) in aex:
                    if a0 <= P[0, 0] <= a1 and b0 <= P[0, 1] <= b1 and direction == 'h':
                        bad = True
                    if direction == 'v' and b0 <= P[0, 1] <= b1:
                        bad = True
                    if direction == 'h' and a0 <= P[0, 0] <= a1:
                        bad = True
                if bad:
                    continue
                # also skip if the sampled line lies inside the symbol region only partially (shape-specific)
                x, y = local_to_page(c0, P)
                v = sample(x, y)
                gd = grid_dist(x, y)
                v = np.where(gd > 2.5, v, 0.0)
                k = int(np.argmax(v))
                if v[k] < 90:
                    continue
                lo, hi = max(0, k-8), min(len(v), k+9)
                w = np.clip(v[lo:hi] - 0.4*v[k], 0, None)
                pos = (offs[lo:hi]*w).sum()/w.sum()
                locs.append(pos)
            locs = np.array(locs)
            if len(locs) < 3:
                return None, None, len(locs)
            med = np.median(locs)
            locs = locs[np.abs(locs - med) < 2.5]
            return float(np.mean(locs)), float(np.std(locs)), len(locs)
        av, avs, avn = arm('v')
        bh, bhs, bhn = arm('h')
        out['arm_v'] = dict(offset_a=av, sd=avs, n=avn)
        out['arm_h'] = dict(offset_b=bh, sd=bhs, n=bhn)
        if av is not None and bh is not None:
            cr = np.array(local_to_page(c0, np.array([[da + av, db + bh]]))).ravel()
            out['cross_px'] = [float(cr[0]), float(cr[1])]
            out['cross_fig'] = list(map(float, to_fig(*cr)))
    results.append(out)
    msg = '%-4s %-8s s=%5.2f%s score=%6.1f ref M=%.4f CD=%.4f px=(%.1f,%.1f) centroid M=%.4f CD=%.4f' % (
        out['id'], shape, s, '(fixed)' if fix else '', out['score'], *out['ref_fig'], x_ref, y_ref, *out['centroid_fig'])
    if 'cross_fig' in out:
        msg += ' cross M=%.4f CD=%.4f (arm sd %.2f/%.2f px, n %d/%d)' % (*out['cross_fig'], avs, bhs, avn, bhn)
    elif sdef.get('crossed'):
        msg += ' cross arms: v=%s h=%s' % (out['arm_v'], out['arm_h'])
    print(msg)
    print('      edge darkness:', segscore)
    if diag:
        # draw the fitted outline on an upright crop for checking
        from PIL import ImageDraw
        R = int(3.2*s)
        x0, y0 = int(x_ref) - R, int(y_ref) - R
        crop = Image.open(sys.argv[1]).convert('RGB').crop((x0, y0, x0 + 2*R, y0 + 2*R))
        sc = 8
        crop = crop.resize((2*R*sc, 2*R*sc), Image.NEAREST)
        d = ImageDraw.Draw(crop)
        for k, P in outline(shape, s, None).items():
            P = P + np.array([da, db])
            x, y = local_to_page(c0, P)
            pts_ = [((xx - x0 + 0.5)*sc, (yy - y0 + 0.5)*sc) for xx, yy in zip(x, y)]
            d.line(pts_, fill=(255, 0, 0), width=1)
        def mark(px_, py_, col, r=6):
            X, Y = (px_ - x0 + 0.5)*sc, (py_ - y0 + 0.5)*sc
            d.line([(X - r, Y), (X + r, Y)], fill=col, width=2); d.line([(X, Y - r), (X, Y + r)], fill=col, width=2)
        mark(x_ref, y_ref, (0, 160, 255))
        mark(cpx[0], cpx[1], (0, 200, 0))
        if 'cross_px' in out:
            mark(*out['cross_px'], (255, 0, 255))
        crop = crop.transpose(Image.ROTATE_270)
        crop.save(os.path.join(diag, out['id'] + '.png'))
json.dump(results, open(sys.argv[4], 'w'), indent=1)
