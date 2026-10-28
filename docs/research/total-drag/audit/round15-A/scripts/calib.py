# Grid calibration with rotation and skew correction.
# usage: python3 -I calib.py img out.json spec.json
# spec: {"vlines": [[x_px_approx, value], ...], "hlines": [[y_px_approx, value], ...],
#        "ybox": [y0, y1], "xbox": [x0, x1], "half": 8, "seg": 40}
# Each vertical grid line is sampled in segments of 'seg' rows between ybox; in each
# segment the darkness centroid within +-half px of the current estimate is taken.
# Segments whose centroid is off by > 2.5 px from the median or whose darkness profile is too
# wide (curve or text crossing) are rejected. A straight line x = a + b*y is fitted per line.
# Same for horizontal lines (y = c + e*x). Then a common slope is used and the intercepts are
# fitted linearly against the values; residuals and leave-one-out residuals are reported.
import sys, json
import numpy as np
from PIL import Image

img, out, specf = sys.argv[1], sys.argv[2], sys.argv[3]
spec = json.load(open(specf))
im = 255 - np.asarray(Image.open(img).convert('L')).astype(float)
half = spec.get('half', 8)
seg = spec.get('seg', 40)

def sample_line(pos, lo, hi, vertical, skip=()):
    pts = []
    for s0 in range(int(lo), int(hi) - seg + 1, seg):
        if any(a <= s0 + seg/2 <= b for a, b in skip):
            continue
        p = int(round(pos))
        if vertical:
            blk = im[s0:s0+seg, p-half-6:p+half+7]
        else:
            blk = im[p-half-6:p+half+7, s0:s0+seg].T
        prof = blk.mean(axis=0)
        base = np.median(np.concatenate([prof[:4], prof[-4:]]))
        w = np.clip(prof - base, 0, None)
        w[:6] = 0; w[-6:] = 0
        if w.sum() < 5:
            continue
        idx = np.arange(len(prof))
        c = (idx * w).sum() / w.sum()
        # width (second moment)
        sd = np.sqrt(((idx - c)**2 * w).sum() / w.sum())
        pts.append((s0 + seg/2, p - half - 6 + c, sd, w.max()))
    return np.array(pts)

def fit_line(pts):
    # iterative rejection
    keep = np.ones(len(pts), bool)
    for _ in range(5):
        A = np.vstack([np.ones(keep.sum()), pts[keep, 0]]).T
        coef, *_ = np.linalg.lstsq(A, pts[keep, 1], rcond=None)
        r = pts[:, 1] - (coef[0] + coef[1] * pts[:, 0])
        sdw = np.median(pts[:, 2])
        newkeep = (np.abs(r) < max(1.0, 2.5 * np.std(r[keep]) if keep.sum() > 3 else 3)) & (pts[:, 2] < 1.8 * sdw)
        if (newkeep == keep).all():
            break
        keep = newkeep
    r = pts[keep, 1] - (coef[0] + coef[1] * pts[keep, 0])
    return coef, keep.sum(), len(pts), float(np.sqrt(np.mean(r**2)))

res = {'vlines': [], 'hlines': []}
yb = spec['ybox']; xb = spec['xbox']
for x, v in spec['vlines']:
    pts = sample_line(x, yb[0], yb[1], True, spec.get('vskip', {}).get(str(v), []))
    coef, nk, n, rms = fit_line(pts)
    res['vlines'].append({'value': v, 'a': coef[0], 'b': coef[1], 'nseg': int(nk), 'ntot': int(n), 'rms_px': rms})
for y, v in spec['hlines']:
    pts = sample_line(y, xb[0], xb[1], False, spec.get('hskip', {}).get(str(v), []))
    coef, nk, n, rms = fit_line(pts)
    res['hlines'].append({'value': v, 'c': coef[0], 'e': coef[1], 'nseg': int(nk), 'ntot': int(n), 'rms_px': rms})

# common slopes (weighted by number of segments)
bs = np.array([l['b'] for l in res['vlines']]); nb = np.array([l['nseg'] for l in res['vlines']])
es = np.array([l['e'] for l in res['hlines']]); ne = np.array([l['nseg'] for l in res['hlines']])
b = float((bs * nb).sum() / nb.sum()); e = float((es * ne).sum() / ne.sum())
ymid = (yb[0] + yb[1]) / 2; xmid = (xb[0] + xb[1]) / 2
# intercept at the panel mid row / column, using each line's own fit evaluated at the mid
for l in res['vlines']:
    l['x_at_mid'] = l['a'] + l['b'] * ymid
for l in res['hlines']:
    l['y_at_mid'] = l['c'] + l['e'] * xmid

def linfit(vals, pos):
    A = np.vstack([np.ones(len(vals)), vals]).T
    coef, *_ = np.linalg.lstsq(A, pos, rcond=None)
    r = pos - A @ coef
    loo = []
    for i in range(len(vals)):
        m = np.ones(len(vals), bool); m[i] = False
        c2, *_ = np.linalg.lstsq(A[m], pos[m], rcond=None)
        loo.append(pos[i] - A[i] @ c2)
    return coef, r, np.array(loo)

vv = np.array([l['value'] for l in res['vlines']]); vp = np.array([l['x_at_mid'] for l in res['vlines']])
hv = np.array([l['value'] for l in res['hlines']]); hp = np.array([l['y_at_mid'] for l in res['hlines']])
cx, rx, lx = linfit(vv, vp)
cy, ry, ly = linfit(hv, hp)
res.update({'b_common': b, 'e_common': e, 'ymid': ymid, 'xmid': xmid,
            'x_fit': list(cx), 'y_fit': list(cy),
            'x_units_per_px': float(1 / cx[1]), 'y_units_per_px': float(1 / cy[1])})
for l, r1, r2 in zip(res['vlines'], rx, lx):
    l['resid_px'] = float(r1); l['loo_px'] = float(r2); l['resid_units'] = float(r1 / cx[1]); l['loo_units'] = float(r2 / cx[1])
for l, r1, r2 in zip(res['hlines'], ry, ly):
    l['resid_px'] = float(r1); l['loo_px'] = float(r2); l['resid_units'] = float(r1 / cy[1]); l['loo_units'] = float(r2 / cy[1])
json.dump(res, open(out, 'w'), indent=1)
print(f"rotation: vertical lines slope dx/dy = {b:.5f} (spread {bs.std():.5f}); horizontal dy/dx = {e:.5f} (spread {es.std():.5f})")
print(f"x: px = {cx[0]:.2f} + {cx[1]:.3f}*value ; units/px = {1/cx[1]:.6f}")
for l in res['vlines']:
    print(f"  v {l['value']:>7}: x_mid={l['x_at_mid']:.2f} slope={l['b']:.5f} seg {l['nseg']}/{l['ntot']} line rms {l['rms_px']:.2f}px resid {l['resid_px']:+.2f}px ({l['resid_units']:+.5f}) loo {l['loo_px']:+.2f}px")
print(f"y: px = {cy[0]:.2f} + {cy[1]:.3f}*value ; units/px = {1/cy[1]:.6f}")
for l in res['hlines']:
    print(f"  h {l['value']:>7}: y_mid={l['y_at_mid']:.2f} slope={l['e']:.5f} seg {l['nseg']}/{l['ntot']} line rms {l['rms_px']:.2f}px resid {l['resid_px']:+.2f}px ({l['resid_units']:+.5f}) loo {l['loo_px']:+.2f}px")
