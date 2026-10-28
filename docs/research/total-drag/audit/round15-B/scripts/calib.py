"""Grid-line calibration for scanned NACA figure panels.

Run with python3 -I. Reads a rendered page image (path given as argument by the caller
script), refines approximate grid-line positions to sub-pixel centroids in many short
bands along each line, fits each line as a straight line (so scan rotation and skew are
measured line by line), intersects every vertical with every horizontal line, and fits an
affine map pixel -> plot units by least squares. Reports per-line residuals and a
leave-one-line-out check.
"""
import numpy as np
from PIL import Image


def load_gray(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    return a.mean(axis=2)


def _centroid(profile):
    p = profile - np.min(profile)
    if p.sum() <= 0:
        return None
    # keep only the main peak: zero everything below half max
    m = p.max()
    p = np.where(p >= 0.3 * m, p, 0.0)
    idx = np.arange(len(p))
    return float((idx * p).sum() / p.sum())


def refine_line(g, approx, span, orient, half=7, band=40, thresh=215, min_peak=15,
                exclude=None):
    """Refine one grid line.

    orient 'v': vertical line near x=approx, rows in span=(y0,y1).
    orient 'h': horizontal line near y=approx, columns in span=(x0,x1).
    Returns (a, b, pts, resid) with position = a + b*t, t the coordinate along the line.
    exclude: list of (t0,t1) intervals along the line to skip (legend boxes etc).
    """
    w = np.clip(thresh - g, 0, None)
    t0, t1 = span
    pts = []
    c = approx
    for s in range(int(t0), int(t1) - band + 1, band):
        tm = s + band / 2.0
        if exclude and any(e0 <= tm <= e1 for (e0, e1) in exclude):
            continue
        lo = int(round(c)) - half
        hi = int(round(c)) + half + 1
        if orient == 'v':
            prof = w[s:s + band, lo:hi].mean(axis=0)
        else:
            prof = w[lo:hi, s:s + band].mean(axis=1)
        if prof.max() - prof.min() < min_peak:
            continue
        cc = _centroid(prof)
        if cc is None:
            continue
        pts.append((tm, lo + cc, prof.max() - prof.min()))
    pts = np.array(pts)
    if len(pts) < 4:
        return None
    keep = np.ones(len(pts), bool)
    for _ in range(6):
        A = np.vstack([np.ones(keep.sum()), pts[keep, 0]]).T
        coef, *_ = np.linalg.lstsq(A, pts[keep, 1], rcond=None)
        r = pts[:, 1] - (coef[0] + coef[1] * pts[:, 0])
        sd = max(np.std(r[keep]), 0.3)
        newkeep = np.abs(r) < max(2.5 * sd, 0.8)
        if (newkeep == keep).all():
            break
        keep = newkeep
    return coef[0], coef[1], pts, r, keep


def intersect(vline, hline):
    # vertical: x = a1 + b1*y ; horizontal: y = a2 + b2*x
    a1, b1 = vline
    a2, b2 = hline
    y = (a2 + b2 * a1) / (1 - b2 * b1)
    x = a1 + b1 * y
    return x, y


def fit_affine(px, py, X):
    A = np.vstack([np.ones_like(px), px, py]).T
    coef, *_ = np.linalg.lstsq(A, X, rcond=None)
    return coef


def calibrate(g, vapprox, vvals, happrox, hvals, vspan, hspan, vexcl=None, hexcl=None,
              half=7, band=40):
    """Return a dict with line fits, the affine maps and residual tables."""
    vfits, hfits = [], []
    for k, (xa, xv) in enumerate(zip(vapprox, vvals)):
        ex = vexcl.get(k) if vexcl else None
        f = refine_line(g, xa, vspan, 'v', half=half, band=band, exclude=ex)
        vfits.append(f)
    for k, (ya, yv) in enumerate(zip(happrox, hvals)):
        ex = hexcl.get(k) if hexcl else None
        f = refine_line(g, ya, hspan, 'h', half=half, band=band, exclude=ex)
        hfits.append(f)
    rows = []
    for i, vf in enumerate(vfits):
        if vf is None:
            continue
        for j, hf in enumerate(hfits):
            if hf is None:
                continue
            x, y = intersect((vf[0], vf[1]), (hf[0], hf[1]))
            rows.append((i, j, x, y, vvals[i], hvals[j]))
    rows = np.array(rows)
    cx = fit_affine(rows[:, 2], rows[:, 3], rows[:, 4])
    cy = fit_affine(rows[:, 2], rows[:, 3], rows[:, 5])
    return dict(vfits=vfits, hfits=hfits, rows=rows, cx=cx, cy=cy)


def apply(c, px, py):
    return c[0] + c[1] * px + c[2] * py


def inverse(cx, cy, X, Y):
    M = np.array([[cx[1], cx[2]], [cy[1], cy[2]]])
    rhs = np.array([X - cx[0], Y - cy[0]])
    return np.linalg.solve(M, rhs)


def report(cal, vvals, hvals, name):
    out = []
    rows = cal['rows']
    cx, cy = cal['cx'], cal['cy']
    rx = rows[:, 4] - apply(cx, rows[:, 2], rows[:, 3])
    ry = rows[:, 5] - apply(cy, rows[:, 2], rows[:, 3])
    sx = 1.0 / np.hypot(cx[1], cx[2])  # px per unit along x
    sy = 1.0 / np.hypot(cy[1], cy[2])
    out.append(f'# {name}: affine X = {cx[0]:.6f} + {cx[1]:.8f}*px + {cx[2]:.8f}*py')
    out.append(f'# {name}: affine Y = {cy[0]:.6f} + {cy[1]:.8f}*px + {cy[2]:.8f}*py')
    out.append(f'# {name}: scale x {1/sx:.7f} units/px ({sx:.2f} px/unit); '
               f'scale y {1/sy:.7f} units/px ({sy:.2f} px/unit)')
    # rotation of each axis
    angx = np.degrees(np.arctan2(-cx[2], cx[1]))
    angy = np.degrees(np.arctan2(cy[1], -cy[2]) if cy[2] < 0 else np.arctan2(-cy[1], cy[2]))
    out.append(f'# {name}: rotation of x lines {angx:+.3f} deg, of y lines {angy:+.3f} deg, '
               f'skew = difference {angx-angy:+.3f} deg')
    out.append(f'# {name}: intersections used {len(rows)}; rms resid x {np.sqrt((rx**2).mean()):.5f} '
               f'max {np.abs(rx).max():.5f}; rms resid y {np.sqrt((ry**2).mean()):.5f} '
               f'max {np.abs(ry).max():.5f}')
    for i, v in enumerate(vvals):
        m = rows[:, 0] == i
        if m.sum() == 0:
            out.append(f'#   x line {v}: not found')
            continue
        f = cal['vfits'][i]
        out.append(f'#   x line {v}: mean resid {rx[m].mean():+.5f} (px {rx[m].mean()*sx:+.2f}); '
                   f'line fit rms {np.std(f[3][f[4]]):.2f} px over {f[4].sum()} bands, '
                   f'tilt {np.degrees(np.arctan(f[1])):+.3f} deg')
    for j, v in enumerate(hvals):
        m = rows[:, 1] == j
        if m.sum() == 0:
            out.append(f'#   y line {v}: not found')
            continue
        f = cal['hfits'][j]
        out.append(f'#   y line {v}: mean resid {ry[m].mean():+.5f} (px {ry[m].mean()*sy:+.2f}); '
                   f'line fit rms {np.std(f[3][f[4]]):.2f} px over {f[4].sum()} bands, '
                   f'tilt {np.degrees(np.arctan(f[1])):+.3f} deg')
    # leave one line out: refit without line i, predict that line
    loo = []
    for i in range(len(vvals)):
        m = rows[:, 0] == i
        if m.sum() == 0 or (~m).sum() < 6:
            continue
        c2 = fit_affine(rows[~m, 2], rows[~m, 3], rows[~m, 4])
        e = rows[m, 4] - apply(c2, rows[m, 2], rows[m, 3])
        loo.append(('x', vvals[i], np.abs(e).max()))
    for j in range(len(hvals)):
        m = rows[:, 1] == j
        if m.sum() == 0 or (~m).sum() < 6:
            continue
        c2 = fit_affine(rows[~m, 2], rows[~m, 3], rows[~m, 5])
        e = rows[m, 5] - apply(c2, rows[m, 2], rows[m, 3])
        loo.append(('y', hvals[j], np.abs(e).max()))
    lx = max([l[2] for l in loo if l[0] == 'x'] or [0])
    ly = max([l[2] for l in loo if l[0] == 'y'] or [0])
    out.append(f'# {name}: leave-one-line-out worst prediction error x {lx:.5f}, y {ly:.5f}')
    out.append('#   LOO per line: ' + '; '.join(f'{a} {v}: {e:.5f}' for a, v, e in loo))
    stats = dict(rmsx=np.sqrt((rx**2).mean()), rmsy=np.sqrt((ry**2).mean()), loox=lx, looy=ly,
                 sx=sx, sy=sy)
    return out, stats
