"""Fit every gridline of TN 3819 fig. 32 along its length.
Usage: python3 -I calib.py page.jpg out.json
Vertical lines: x = a + b*(y - 1500), one per x/c from 1.0 (left frame) to -1.5 (right frame).
Horizontal lines: y = a + b*(x - 1200), one per P_B from -0.40 (top frame) to 0.08 (bottom frame).
Each sample is the ink-weighted centroid of the line profile in one row (or column),
kept only where the profile is clean (no other ink within the window shoulders) and away
from crossing gridlines. Least squares with 3-sigma rejection. The quadratic fit is the one used for mapping;
the straight fit is reported for comparison."""
import json
import sys
import numpy as np
from PIL import Image

a = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
ink = 255.0 - a
H, W = ink.shape

XV0, DXV = 408.6, 63.86   # first guess, refined below
YH0, DYH = 752.0, 63.30
nv, nh = 26, 25
vals_x = [round(1.0 - 0.1 * k, 2) for k in range(nv)]
vals_y = [round(-0.40 + 0.02 * j, 2) for j in range(nh)]

def refine_guess(axis, guess, half=6):
    # projection peak near the guess over the whole frame span
    if axis == 'v':
        band = ink[760:2265, int(guess) - half:int(guess) + half + 1].mean(axis=0)
    else:
        band = ink[int(guess) - half:int(guess) + half + 1, 415:2000].mean(axis=1)
    i = int(np.argmax(band))
    return int(guess) - half + i

def sample_line(axis, c0, lo, hi, cross):
    """Return list of (t, pos) samples along a line near c0, t runs along the line."""
    out = []
    for t in range(lo, hi):
        if any(abs(t - c) <= 5 for c in cross):
            continue
        if axis == 'v':
            prof = ink[t, c0 - 7:c0 + 8]
        else:
            prof = ink[c0 - 7:c0 + 8, t]
        shoulders = np.r_[prof[:3], prof[-3:]]
        bg = np.median(shoulders)
        if shoulders.max() - bg > 40 or bg > 40:
            continue  # other ink near the line
        core = prof[3:12] - bg
        core[core < 0] = 0
        if core.max() < 60:
            continue  # line broken or faint here
        # centroid of the peak region (pixels above half max)
        m = core >= 0.5 * core.max()
        idx = np.arange(3, 12)[m]
        w = core[m]
        pos = c0 - 7 + (idx * w).sum() / w.sum()
        out.append((t, pos))
    return out

def fit(samples, tref):
    t = np.array([s[0] for s in samples], float)
    p = np.array([s[1] for s in samples], float)
    keep = np.ones_like(t, bool)
    for _ in range(6):
        A = np.c_[np.ones(keep.sum()), t[keep] - tref]
        coef, *_ = np.linalg.lstsq(A, p[keep], rcond=None)
        r = p - (coef[0] + coef[1] * (t - tref))
        s = r[keep].std()
        newkeep = np.abs(r) < max(3 * s, 0.3)
        if (newkeep == keep).all():
            break
        keep = newkeep
    A = np.c_[np.ones(keep.sum()), t[keep] - tref]
    coef, *_ = np.linalg.lstsq(A, p[keep], rcond=None)
    r = p[keep] - A @ coef
    rms = float(np.sqrt((r ** 2).mean()))
    # quadratic fit (follows a bowed line); this is the one used for mapping
    keepq = keep.copy()
    for _ in range(6):
        Aq = np.c_[np.ones(keepq.sum()), t[keepq] - tref, (t[keepq] - tref) ** 2]
        cq, *_ = np.linalg.lstsq(Aq, p[keepq], rcond=None)
        rall = p - (cq[0] + cq[1] * (t - tref) + cq[2] * (t - tref) ** 2)
        sq = rall[keepq].std()
        nk = np.abs(rall) < max(3 * sq, 0.3)
        if (nk == keepq).all():
            break
        keepq = nk
    Aq = np.c_[np.ones(keepq.sum()), t[keepq] - tref, (t[keepq] - tref) ** 2]
    cq, *_ = np.linalg.lstsq(Aq, p[keepq], rcond=None)
    rq = p[keepq] - Aq @ cq
    rmsq = float(np.sqrt((rq ** 2).mean()))
    # standard error of the fitted quadratic, worst case over the sampled span (1 sigma)
    cov = rmsq ** 2 * np.linalg.inv(Aq.T @ Aq)
    tt = np.linspace(t[keepq].min(), t[keepq].max(), 50) - tref
    se = float(np.sqrt(max(np.array([1, x, x * x]) @ cov @ np.array([1, x, x * x]) for x in tt)))
    return dict(samples=[[float(u), float(v)] for u, v in zip(t[keepq], p[keepq])],
                a=float(coef[0]), b=float(coef[1]), n=int(keepq.sum()), n_all=len(t),
                rms=rms, rms_quad=rmsq, q0=float(cq[0]), q1=float(cq[1]), q2=float(cq[2]),
                tref=tref, se_fit=se, t_min=float(t[keepq].min()), t_max=float(t[keepq].max()),
                max_abs_resid=float(np.abs(rq).max()))

vguess = [refine_guess('v', XV0 + DXV * k) for k in range(nv)]
hguess = [refine_guess('h', YH0 + DYH * j) for j in range(nh)]
res = {'vertical': [], 'horizontal': []}
for k, c0 in enumerate(vguess):
    s = sample_line('v', c0, 755, 2268, hguess)
    f = fit(s, 1500.0)
    f.update(value=vals_x[k], guess=c0)
    res['vertical'].append(f)
for j, c0 in enumerate(hguess):
    s = sample_line('h', c0, 412, 2003, vguess)
    f = fit(s, 1200.0)
    f.update(value=vals_y[j], guess=c0)
    res['horizontal'].append(f)
json.dump(res, open(sys.argv[2], 'w'))
print('vertical lines: value, x at y=1500 (linear), slope dx/dy, n kept/all, rms linear px, rms quadratic px, se quadratic px')
for f in res['vertical']:
    print(f"{f['value']:6.2f} {f['a']:9.2f} {f['b']:+.5f} {f['n']:5d}/{f['n_all']:<5d} {f['rms']:.3f} {f['rms_quad']:.3f} {f['se_fit']:.3f}")
print('horizontal lines: value, y at x=1200 (linear), slope dy/dx, n kept/all, rms linear px, rms quadratic px, se quadratic px')
for f in res['horizontal']:
    print(f"{f['value']:6.2f} {f['a']:9.2f} {f['b']:+.5f} {f['n']:5d}/{f['n_all']:<5d} {f['rms']:.3f} {f['rms_quad']:.3f} {f['se_fit']:.3f}")
