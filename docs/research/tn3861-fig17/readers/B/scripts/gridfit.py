# Fit every grid line of the plot individually, then fit an affine pixel->(Mc, CD) calibration to all
# line samples at once (handles rotation and shear). Writes a JSON with the per-line fits and the mapping.
# usage: python3 -I gridfit.py page_gray.png out.json
import sys, json
import numpy as np
from PIL import Image

a = np.asarray(Image.open(sys.argv[1]), dtype=float)
ink = np.clip((255.0 - a) / 255.0, 0, 1)  # darkness 0..1
H, W = a.shape

# Approximate positions found from projections (display-orientation pixels, 300 ppi native scan)
x0_px, dx = 486.0, 122.6       # Mc = 0 line, px per 0.5
y0_px, dy = 1756.0, 122.6      # CD = 0 line, px per 0.25
vx = [(0.5 * k, x0_px + dx * k) for k in range(0, 19)]   # Mc 0 .. 9 every 0.5
hy = [(0.25 * j, y0_px - dy * j) for j in range(0, 12)]  # CD 0 .. 2.75 every 0.25
ytop, ybot = 400, 1765
xleft, xright = 478, 2700

def centroid_profile(prof, base):
    # prof: darkness across the line; returns subpixel centre and peak, or None if not line-like
    p = prof - np.median(prof)
    p[p < 0] = 0
    if p.max() < 0.25:
        return None
    k = int(np.argmax(p))
    lo, hi = max(k - 3, 0), min(k + 4, len(p))
    w = p[lo:hi]
    # reject if wide blob (symbol or text): count of strongly dark pixels in window
    if (p > 0.5 * p.max()).sum() > 6:
        return None
    c = (w * np.arange(lo, hi)).sum() / w.sum()
    return base + c, p.max()

def fit_line(samples, slope0):
    # samples: list of (t, s) ; fit s = c0 + c1*t, robust. Start from the median intercept with the
    # typical slope slope0 and drop samples more than 2 px away (text, symbols, curves crossing the line).
    t = np.array([q[0] for q in samples], float); s = np.array([q[1] for q in samples], float)
    b0 = np.median(s - slope0 * t)
    keep = np.abs(s - (b0 + slope0 * t)) < 2.0
    for _ in range(6):
        A = np.vstack([np.ones(keep.sum()), t[keep]]).T
        c, *_ = np.linalg.lstsq(A, s[keep], rcond=None)
        r = s - (c[0] + c[1] * t)
        sig = max(1.4826 * np.median(np.abs(r[keep])), 0.25)
        newkeep = np.abs(r) < 3 * sig
        if (newkeep == keep).all():
            break
        keep = newkeep
    return c, r, keep, t, s

out = {'vertical': [], 'horizontal': []}
half = 8
band = 12
vsamples = []
for val, xp in vx:
    samples = []
    for y in range(ytop, ybot, band):
        seg = ink[y:y + band, int(round(xp)) - half:int(round(xp)) + half + 1].mean(axis=0)
        res = centroid_profile(seg, int(round(xp)) - half)
        if res:
            samples.append((y + band / 2.0, res[0]))
    if len(samples) < 5:
        out['vertical'].append({'value': val, 'n': len(samples)}); continue
    c, r, keep, t, s = fit_line(samples, 0.0066)
    out['vertical'].append({'value': val, 'n': int(keep.sum()), 'x_at_y1080': float(c[0] + c[1] * 1080), 'slope_dx_per_dy': float(c[1]),
                            'rms_px': float(np.sqrt(np.mean(r[keep] ** 2))), 'y_span': [float(t[keep].min()), float(t[keep].max())]})
    for ti, si in zip(t[keep], s[keep]):
        vsamples.append((si, ti, val))
hsamples = []
for val, yp in hy:
    samples = []
    # above CD = 1.75 the legend box blanks the grid right of Mc = 1.5: sample only where the grid is printed
    xr = 845 if 1.75 < val < 2.75 else xright
    for x in range(xleft, xr, band):
        seg = ink[int(round(yp)) - half:int(round(yp)) + half + 1, x:x + band].mean(axis=1)
        res = centroid_profile(seg, int(round(yp)) - half)
        if res:
            samples.append((x + band / 2.0, res[0]))
    if len(samples) < 5:
        out['horizontal'].append({'value': val, 'n': len(samples)}); continue
    c, r, keep, t, s = fit_line(samples, -0.0076)
    out['horizontal'].append({'value': val, 'n': int(keep.sum()), 'y_at_x1588': float(c[0] + c[1] * 1588), 'slope_dy_per_dx': float(c[1]),
                              'rms_px': float(np.sqrt(np.mean(r[keep] ** 2))), 'x_span': [float(t[keep].min()), float(t[keep].max())]})
    for ti, si in zip(t[keep], s[keep]):
        hsamples.append((ti, si, val))

def affine_fit(samples, labelled_only=None):
    u = np.array([q[0] for q in samples]); v = np.array([q[1] for q in samples]); val = np.array([q[2] for q in samples])
    m = np.ones(len(u), bool) if labelled_only is None else np.isin(np.round(val, 3), labelled_only)
    A = np.vstack([np.ones(m.sum()), u[m], v[m]]).T
    c, *_ = np.linalg.lstsq(A, val[m], rcond=None)
    pred = c[0] + c[1] * u + c[2] * v
    return c, val - pred, val

cx, rx, valx = affine_fit(vsamples)
cy, ry, valy = affine_fit(hsamples)
out['affine_Mc'] = list(map(float, cx)); out['affine_CD'] = list(map(float, cy))
out['Mc_resid_rms'] = float(np.sqrt(np.mean(rx ** 2))); out['CD_resid_rms'] = float(np.sqrt(np.mean(ry ** 2)))
out['Mc_resid_per_line'] = {str(v): [float(rx[valx == v].mean()), float(np.sqrt(np.mean(rx[valx == v] ** 2)))] for v in sorted(set(valx))}
out['CD_resid_per_line'] = {str(v): [float(ry[valy == v].mean()), float(np.sqrt(np.mean(ry[valy == v] ** 2)))] for v in sorted(set(valy))}
# labelled-only fits (Mc labels 0..8, CD labels 0, .5, 1.0, 1.5, 2.0, 2.5)
cxl, rxl, _ = affine_fit(vsamples, labelled_only=[0, 1, 2, 3, 4, 5, 6, 7, 8])
cyl, ryl, _ = affine_fit(hsamples, labelled_only=[0, 0.5, 1.0, 1.5, 2.0, 2.5])
out['affine_Mc_labelled_only'] = list(map(float, cxl)); out['affine_CD_labelled_only'] = list(map(float, cyl))
json.dump(out, open(sys.argv[2], 'w'), indent=1)
for k in ('vertical', 'horizontal'):
    print(k)
    for d in out[k]:
        print('  ', d)
print('affine Mc = %.6f + %.8f*u + %.8f*v' % tuple(cx), 'rms', out['Mc_resid_rms'])
print('affine CD = %.6f + %.8f*u + %.8f*v' % tuple(cy), 'rms', out['CD_resid_rms'])
print('labelled-only Mc', cxl, 'CD', cyl)
print('per-line mean resid Mc', {k: round(v[0], 4) for k, v in out['Mc_resid_per_line'].items()})
print('per-line mean resid CD', {k: round(v[0], 4) for k, v in out['CD_resid_per_line'].items()})
