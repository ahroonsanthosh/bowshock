"""Final grid-line calibration of TN 3861 fig. 17 on the native page-33 scan.

Page-image coordinates: embedded scan of PDF page 33, 2364 x 3094 px, 300 ppi,
x right, y down. The figure is printed turned on the page: Mach-number grid
lines run across the page (near-constant page y) and drag-coefficient grid
lines run down the page (near-constant page x).

Steps
1. Trace every grid line: at each sample position along the line, take the
   darkness-weighted centre of a thin dark peak within +-4 px of the line's
   predicted position (predicted from a first coarse pass). Samples that are
   wide (symbols, text, crossings) are rejected.
2. Fit a straight line to each line's samples with iterative 2.5-sigma
   rejection. Lines shorter than 600 px (the drag-coefficient lines 1.75 to
   2.5, which exist only between M = 0 and 1.5 beside the legend box) get the
   median slope of the long lines and only their offset is fitted.
3. Intersect the fitted lines; keep only crossings where both lines are
   physically present in the scan (samples within 40 px of the crossing on
   both lines).
4. Least-squares affine map (px, py) -> (M, CD) on the crossings of labelled
   lines only (M = 0..8, CD = 0, .5, ..., 2.5). Report residuals of all
   crossings, labelled and unlabelled (check).
5. Also fit the same map with a quadratic term set as a check on non-linearity.

usage: python -I calib2.py gray.png out.json
"""
import sys, json
import numpy as np
from PIL import Image

a = 255.0 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)

def trace(a0, slope, lo, hi, horizontal, half=4, step=3):
    out = []
    for t in range(lo, hi, step):
        n = int(round(a0 + slope*t))
        prof = a[n-half-4:n+half+5, t] if horizontal else a[t, n-half-4:n+half+5]
        bg = np.median(np.concatenate([prof[:3], prof[-3:]]))
        p = prof - bg
        k = int(np.argmax(p[4:-4])) + 4
        if p[k] < 60:
            continue
        above = np.where(p > 0.5*p[k])[0]
        if above[-1]-above[0] > 6:
            continue
        l, h = max(0, k-3), min(len(p), k+4)
        w = np.clip(p[l:h], 0, None)
        out.append((t, n-half-4+(np.arange(l, h)*w).sum()/w.sum()))
    return np.array(out)

def robust(s, fixed_slope=None):
    t, c = s[:, 0], s[:, 1]
    keep = np.ones(len(t), bool)
    for _ in range(8):
        if fixed_slope is None:
            A = np.vstack([np.ones(keep.sum()), t[keep]]).T
            coef, *_ = np.linalg.lstsq(A, c[keep], rcond=None)
        else:
            coef = np.array([np.mean(c[keep] - fixed_slope*t[keep]), fixed_slope])
        r = c - (coef[0] + coef[1]*t)
        sd = max(np.std(r[keep]), 0.3)
        keep = np.abs(r) < 2.5*sd
    return coef, float(np.std(r[keep])), keep

# first coarse predictions (from the profile peaks and a first pass, see method.md)
def predM(M): return 2620.5 - 245.05*M
def predC(CD): return 1746.6 - 490.2*CD
M_vals = [k*0.5 for k in range(19)]
C_vals = [k*0.25 for k in range(12)]
M_lab = [float(k) for k in range(9)]
C_lab = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5]

LM, LC = {}, {}
for M in M_vals:
    s = trace(predM(M), -0.0072, 395, 1775, True)
    LM[M] = dict(s=s)
for CD in C_vals:
    lo, hi = (2240, 2625) if CD >= 1.75 and CD <= 2.5 else (395, 2625)
    s = trace(predC(CD), 0.0080, lo, hi, False)
    LC[CD] = dict(s=s)
for L in (LM, LC):
    for v, d in L.items():
        span = d['s'][:, 0].max() - d['s'][:, 0].min()
        d['span'] = float(span)
long_slopes_C = []
for v, d in LM.items():
    d['coef'], d['sd'], d['keep'] = robust(d['s'])
for v, d in LC.items():
    if d['span'] >= 600:
        d['coef'], d['sd'], d['keep'] = robust(d['s'])
        long_slopes_C.append(d['coef'][1])
medC = float(np.median(long_slopes_C))
for v, d in LC.items():
    if d['span'] < 600:
        d['coef'], d['sd'], d['keep'] = robust(d['s'], fixed_slope=medC)
        d['fixed_slope'] = True

def present(d, t0, win=40):
    t = d['s'][d['keep'], 0]
    return np.sum(np.abs(t - t0) < win) >= 5

rows = []
for M, dm in LM.items():
    for CD, dc in LC.items():
        m0, m1 = dm['coef']; c0, c1 = dc['coef']
        y = (m0 + m1*c0)/(1 - m1*c1); x = c0 + c1*y
        if present(dm, x) and present(dc, y):
            rows.append([M, CD, x, y, float(M in M_lab and CD in C_lab)])
P = np.array(rows)
lab = P[:, 4] == 1

def design(x, y, quad=False):
    cols = [np.ones_like(x), x, y]
    if quad:
        cols += [x*x, x*y, y*y]
    return np.vstack(cols).T

A = design(P[lab, 2], P[lab, 3])
cM, *_ = np.linalg.lstsq(A, P[lab, 0], rcond=None)
cC, *_ = np.linalg.lstsq(A, P[lab, 1], rcond=None)
Aall = design(P[:, 2], P[:, 3])
rM = P[:, 0] - Aall @ cM; rC = P[:, 1] - Aall @ cC
Aq = design(P[lab, 2], P[lab, 3], True)
qM, *_ = np.linalg.lstsq(Aq, P[lab, 0], rcond=None)
qC, *_ = np.linalg.lstsq(Aq, P[lab, 1], rcond=None)
rqM = P[:, 0] - design(P[:, 2], P[:, 3], True) @ qM
rqC = P[:, 1] - design(P[:, 2], P[:, 3], True) @ qC

# geometry of the affine map: scale, rotation, shear
J = np.array([[cM[1], cM[2]], [cC[1], cC[2]]])   # d(M,CD)/d(px,py)
G = np.linalg.inv(J)                                # d(px,py)/d(M,CD)
eM = G[:, 0]; eC = G[:, 1]                          # page vectors of unit M and unit CD
angM = np.degrees(np.arctan2(eM[0], -eM[1]))        # M axis vs page-up (should be ~0)
angC = np.degrees(np.arctan2(-eC[1], -eC[0]))       # CD axis vs page-left
print('page vector per unit M  : (%.3f, %.3f) px, length %.3f px' % (eM[0], eM[1], np.hypot(*eM)))
print('page vector per unit CD : (%.3f, %.3f) px, length %.3f px' % (eC[0], eC[1], np.hypot(*eC)))
cosang = np.dot(eM, eC)/np.hypot(*eM)/np.hypot(*eC)
print('angle between axes: %.4f deg (90 = no shear); rotation of M axis from page-up %.4f deg' % (
      np.degrees(np.arccos(cosang)), np.degrees(np.arctan2(eM[0], -eM[1]))))
print()
print('Grid lines (M lines: page y = a + b*x; CD lines: page x = a + b*y)')
out_lines = []
for name, L, labs in (('M', LM, M_lab), ('CD', LC, C_lab)):
    for v, d in L.items():
        t = d['s'][d['keep'], 0]
        # position where the line crosses the middle of its traced span
        tm = 0.5*(t.min()+t.max())
        pos = d['coef'][0] + d['coef'][1]*tm
        rec = dict(axis=name, value=v, labelled=v in labs, a=float(d['coef'][0]), b=float(d['coef'][1]),
                   angle_deg=float(np.degrees(np.arctan(d['coef'][1]))), sd_px=d['sd'],
                   n_used=int(d['keep'].sum()), n_samples=len(d['s']), along_min=float(t.min()), along_max=float(t.max()),
                   mid_along=float(tm), mid_pos=float(pos), fixed_slope=bool(d.get('fixed_slope', False)))
        out_lines.append(rec)
        print('  %-2s=%5.2f %-10s a=%8.2f b=%+.5f (%+.3f deg) sd=%.2f px n=%d/%d along %4.0f..%4.0f  at along=%4.0f pos=%7.2f%s' % (
            name, v, 'labelled' if rec['labelled'] else 'unlabelled', rec['a'], rec['b'], rec['angle_deg'], rec['sd_px'],
            rec['n_used'], rec['n_samples'], rec['along_min'], rec['along_max'], tm, pos, ' (slope fixed)' if rec['fixed_slope'] else ''))
print()
print('crossings used: %d labelled, %d unlabelled' % (lab.sum(), (~lab).sum()))
print('affine (labelled crossings):')
print('  M  = %.6f %+.9f*px %+.9f*py' % tuple(cM))
print('  CD = %.6f %+.9f*px %+.9f*py' % tuple(cC))
f = lambda r: (np.sqrt(np.mean(r**2)), np.abs(r).max())
print('  labelled   residual rms/max: M %.5f/%.5f  CD %.5f/%.5f' % (*f(rM[lab]), *f(rC[lab])))
print('  unlabelled residual rms/max: M %.5f/%.5f  CD %.5f/%.5f' % (*f(rM[~lab]), *f(rC[~lab])))
print('quadratic check (labelled):')
print('  labelled   residual rms/max: M %.5f/%.5f  CD %.5f/%.5f' % (*f(rqM[lab]), *f(rqC[lab])))
print('  unlabelled residual rms/max: M %.5f/%.5f  CD %.5f/%.5f' % (*f(rqM[~lab]), *f(rqC[~lab])))
print()
print('labelled-crossing residuals (M, CD, px, py, rM, rCD):')
for p, a1, a2 in zip(P[lab], rM[lab], rC[lab]):
    print('  %4.1f %4.2f %8.2f %8.2f %+.4f %+.4f' % (p[0], p[1], p[2], p[3], a1, a2))
json.dump(dict(affine=dict(M=cM.tolist(), CD=cC.tolist()), quad=dict(M=qM.tolist(), CD=qC.tolist()),
               lines=out_lines,
               crossings=[dict(M=p[0], CD=p[1], px=p[2], py=p[3], labelled=bool(p[4]), rM=float(x1), rCD=float(x2))
                          for p, x1, x2 in zip(P, rM, rC)],
               stats=dict(lab_rms_M=f(rM[lab])[0], lab_max_M=f(rM[lab])[1], lab_rms_CD=f(rC[lab])[0], lab_max_CD=f(rC[lab])[1],
                          unl_rms_M=f(rM[~lab])[0], unl_max_M=f(rM[~lab])[1], unl_rms_CD=f(rC[~lab])[0], unl_max_CD=f(rC[~lab])[1],
                          n_lab=int(lab.sum()), n_unl=int((~lab).sum()))),
          open(sys.argv[2], 'w'), indent=1)
