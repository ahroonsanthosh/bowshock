"""Grid-line calibration of TN 3861 fig. 17 on the native page-33 scan.

Coordinates are those of the embedded page image (2364 x 3094 px, 300 ppi),
x to the right, y down. The figure is printed rotated: Mach-number grid lines
run across the page (near-constant page y) and drag-coefficient grid lines run
down the page (near-constant page x).

Each grid line is traced by sampling its darkness-weighted centre across the
whole plot, a straight line is fitted to the samples with outlier rejection,
and the grid intersections are used for a least-squares affine fit
(page px, py) -> (M, CD). Only the labelled lines enter the fit; the
unlabelled lines are reported as checks.

usage: python -I calib.py gray.png out.json
"""
import sys, json
import numpy as np
from PIL import Image

a = 255.0 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
H, W = a.shape

def trace(nominal, along_lo, along_hi, horizontal, half=9, step=3):
    """Trace a line near `nominal`. horizontal=True: line of near-constant y,
    sampled along x. Returns array of (along, across) samples."""
    out = []
    for t in range(along_lo, along_hi, step):
        if horizontal:
            prof = a[nominal-half:nominal+half+1, t]
        else:
            prof = a[t, nominal-half:nominal+half+1]
        bg = np.median(np.concatenate([prof[:3], prof[-3:]]))
        p = prof - bg
        k = int(np.argmax(p))
        if p[k] < 60:          # no clear line here (gap, legend box)
            continue
        # width at half maximum must be line-like (thin)
        above = np.where(p > 0.5*p[k])[0]
        if above[-1]-above[0] > 6:  # too wide: symbol, text or crossing
            continue
        lo, hi = max(0, k-3), min(len(p), k+4)
        w = np.clip(p[lo:hi], 0, None)
        c = (np.arange(lo, hi)*w).sum()/w.sum()
        out.append((t, nominal-half+c))
    return np.array(out)

def robust_line(s):
    t, c = s[:, 0], s[:, 1]
    keep = np.ones(len(t), bool)
    for _ in range(6):
        A = np.vstack([np.ones(keep.sum()), t[keep]]).T
        coef, *_ = np.linalg.lstsq(A, c[keep], rcond=None)
        r = c - (coef[0] + coef[1]*t)
        sd = max(np.std(r[keep]), 0.3)
        keep = np.abs(r) < 2.5*sd
    return coef, np.std(r[keep]), int(keep.sum()), len(t)

def refine(nominal, horizontal):
    # search +-12 px for the strongest thin line, using a long straight average
    best = None
    for d in range(-12, 13):
        n = nominal + d
        if horizontal:
            v = np.median(a[n, 1200:1740]) + np.median(a[n, 440:700])
        else:
            v = np.median(a[1300:2590, n]) 
        if best is None or v > best[1]:
            best = (n, v)
    return best[0]

M_vals = [k*0.5 for k in range(0, 19)]          # 0 .. 9
CD_vals = [k*0.25 for k in range(0, 12)]        # 0 .. 2.75
M_lab = [float(k) for k in range(0, 9)]         # labelled 0..8
CD_lab = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5]         # labelled

lines_M, lines_CD = {}, {}
for M in M_vals:
    nom = int(round(2611 - 245.2*M))
    nom = refine(nom, True)
    s = trace(nom, 395, 1775, True)
    coef, sd, nk, nt = robust_line(s)
    lines_M[M] = dict(coef=coef.tolist(), sd=float(sd), n=nk, ntot=nt, nominal=nom)
for CD in CD_vals:
    nom = int(round(1760 - 490.0*CD))
    nom = refine(nom, False)
    s = trace(nom, 395, 2625, False)
    coef, sd, nk, nt = robust_line(s)
    lines_CD[CD] = dict(coef=coef.tolist(), sd=float(sd), n=nk, ntot=nt, nominal=nom)

def intersect(mc, cc):
    # M line: y = m0 + m1*x ; CD line: x = c0 + c1*y
    m0, m1 = mc; c0, c1 = cc
    y = (m0 + m1*c0)/(1 - m1*c1)
    x = c0 + c1*y
    return x, y

def first_pass_predict():
    good_M = {M: l for M, l in lines_M.items() if l['sd'] < 0.6 and l['n'] > 250}
    good_C = {C: l for C, l in lines_CD.items() if l['sd'] < 0.6 and l['n'] > 250}
    # model: M line y = aM0 + aM1*M + b*x ; CD line x = cC0 + cC1*CD + d*y
    Mk = np.array(list(good_M)); am = np.array([good_M[k]['coef'][0] for k in Mk])
    Ck = np.array(list(good_C)); cc = np.array([good_C[k]['coef'][0] for k in Ck])
    pm = np.polyfit(Mk, am, 1); pc = np.polyfit(Ck, cc, 1)
    bm = np.median([good_M[k]['coef'][1] for k in Mk]); dc = np.median([good_C[k]['coef'][1] for k in Ck])
    return pm, pc, bm, dc, sorted(Mk.tolist()), sorted(Ck.tolist())

pm, pc, bm, dc, gM, gC = first_pass_predict()
print('first pass used M lines', gM, 'and CD lines', gC)

def trace_pred(a0, slope, along_lo, along_hi, horizontal, half=4, step=3):
    out = []
    for t in range(along_lo, along_hi, step):
        nominal = a0 + slope*t
        n = int(round(nominal))
        if horizontal:
            prof = a[n-half-4:n+half+5, t]
        else:
            prof = a[t, n-half-4:n+half+5]
        bg = np.median(np.concatenate([prof[:3], prof[-3:]]))
        p = prof - bg
        core = p[4:-4]
        k = int(np.argmax(core)) + 4
        if p[k] < 60:
            continue
        above = np.where(p > 0.5*p[k])[0]
        if above[-1]-above[0] > 6:
            continue
        lo, hi = max(0, k-3), min(len(p), k+4)
        w = np.clip(p[lo:hi], 0, None)
        c = (np.arange(lo, hi)*w).sum()/w.sum()
        out.append((t, n-half-4+c))
    return np.array(out)

for M in M_vals:
    s2 = trace_pred(np.polyval(pm, M), bm, 395, 1775, True)
    coef, sd, nk, nt = robust_line(s2)
    lines_M[M] = dict(coef=coef.tolist(), sd=float(sd), n=nk, ntot=nt, nominal=float(np.polyval(pm, M)),
                      along=[float(s2[:,0].min()), float(s2[:,0].max())])
for CD in CD_vals:
    s2 = trace_pred(np.polyval(pc, CD), dc, 395, 2625, False)
    coef, sd, nk, nt = robust_line(s2)
    lines_CD[CD] = dict(coef=coef.tolist(), sd=float(sd), n=nk, ntot=nt, nominal=float(np.polyval(pc, CD)),
                        along=[float(s2[:,0].min()), float(s2[:,0].max())])

pts = []
for M, lm in lines_M.items():
    for CD, lc in lines_CD.items():
        x, y = intersect(lm['coef'], lc['coef'])
        pts.append((M, CD, x, y, M in M_lab and CD in CD_lab))
pts = np.array(pts, dtype=float)

def fit_affine(P):
    A = np.vstack([np.ones(len(P)), P[:, 2], P[:, 3]]).T
    cM, *_ = np.linalg.lstsq(A, P[:, 0], rcond=None)
    cC, *_ = np.linalg.lstsq(A, P[:, 1], rcond=None)
    return cM, cC

lab = pts[pts[:, 4] == 1]
cM, cC = fit_affine(lab)
A_all = np.vstack([np.ones(len(pts)), pts[:, 2], pts[:, 3]]).T
rM = pts[:, 0] - A_all @ cM
rC = pts[:, 1] - A_all @ cC
cM2, cC2 = fit_affine(pts)
rM2 = pts[:, 0] - A_all @ cM2
rC2 = pts[:, 1] - A_all @ cC2

# rotation and shear diagnostics
angM = [np.degrees(np.arctan(l['coef'][1])) for l in lines_M.values()]
angC = [np.degrees(np.arctan(l['coef'][1])) for l in lines_CD.values()]

print('Mach-number lines (page y = a + b*x):')
for M, l in lines_M.items():
    lab_s = 'labelled' if M in M_lab else 'unlabelled'
    print(f"  M={M:4.1f} {lab_s:10s} a={l['coef'][0]:9.2f} b={l['coef'][1]:+.5f} "
          f"(angle {np.degrees(np.arctan(l['coef'][1])):+.3f} deg) sd={l['sd']:.2f}px "
          f"samples {l['n']}/{l['ntot']}")
print('Drag-coefficient lines (page x = c + d*y):')
for CD, l in lines_CD.items():
    lab_s = 'labelled' if CD in CD_lab else 'unlabelled'
    print(f"  CD={CD:4.2f} {lab_s:10s} c={l['coef'][0]:9.2f} d={l['coef'][1]:+.5f} "
          f"(angle {np.degrees(np.arctan(l['coef'][1])):+.3f} deg) sd={l['sd']:.2f}px "
          f"samples {l['n']}/{l['ntot']}")
print('mean angle of M lines from page horizontal: %+.4f deg (sd %.4f)' % (np.mean(angM), np.std(angM)))
print('mean angle of CD lines from page vertical:  %+.4f deg (sd %.4f)' % (np.mean(angC), np.std(angC)))
print('non-orthogonality (shear) = %+.4f deg' % (np.mean(angM) + np.mean(angC)))
print()
print('affine fit on labelled intersections (n=%d):' % len(lab))
print('  M  = %.6f + %.8f*px + %.8f*py' % tuple(cM))
print('  CD = %.6f + %.8f*px + %.8f*py' % tuple(cC))
il = pts[:, 4] == 1
print('  residual rms labelled: M %.5f, CD %.5f ; max |r| M %.5f, CD %.5f' % (
    np.sqrt(np.mean(rM[il]**2)), np.sqrt(np.mean(rC[il]**2)), np.abs(rM[il]).max(), np.abs(rC[il]).max()))
print('  residual rms unlabelled (check): M %.5f, CD %.5f ; max |r| M %.5f, CD %.5f' % (
    np.sqrt(np.mean(rM[~il]**2)), np.sqrt(np.mean(rC[~il]**2)), np.abs(rM[~il]).max(), np.abs(rC[~il]).max()))
print('affine fit on all intersections (n=%d), for comparison:' % len(pts))
print('  M  = %.6f + %.8f*px + %.8f*py' % tuple(cM2))
print('  CD = %.6f + %.8f*px + %.8f*py' % tuple(cC2))
print('  residual rms all: M %.5f, CD %.5f ; max M %.5f CD %.5f' % (
    np.sqrt(np.mean(rM2**2)), np.sqrt(np.mean(rC2**2)), np.abs(rM2).max(), np.abs(rC2).max()))
# per-line mean residual (labelled fit)
print('per-line mean residual of the labelled fit:')
for M in M_vals:
    s = pts[:, 0] == M
    print(f'  M={M:4.1f}: mean rM={rM[s].mean():+.5f} (={rM[s].mean()/cM[2]*1:+.2f} px along y)')
for CD in CD_vals:
    s = pts[:, 1] == CD
    print(f'  CD={CD:4.2f}: mean rCD={rC[s].mean():+.5f} (={rC[s].mean()/cC[1]:+.2f} px along x)')
json.dump(dict(cM=cM.tolist(), cC=cC.tolist(), cM_all=cM2.tolist(), cC_all=cC2.tolist(),
               lines_M={str(k): v for k, v in lines_M.items()},
               lines_CD={str(k): v for k, v in lines_CD.items()},
               intersections=[dict(M=p[0], CD=p[1], px=p[2], py=p[3], labelled=bool(p[4]),
                                   rM=float(rm), rCD=float(rc)) for p, rm, rc in zip(pts, rM, rC)]),
          open(sys.argv[2], 'w'), indent=1)
