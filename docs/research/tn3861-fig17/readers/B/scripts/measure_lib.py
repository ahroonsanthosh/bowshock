# Stroke-measurement helpers for symbol centres. Imported by measure.py (same folder, passed explicitly via sys.path).
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def load(path):
    a = np.asarray(Image.open(path), dtype=float)
    return np.clip((235.0 - a) / 235.0, 0, 1)   # ink darkness 0..1

def _peak_centroid(p, coords, near, halfwin=2):
    """Darkness-weighted centroid of the stroke whose peak is closest to `near` (local maxima above 0.45)."""
    q = p.copy()
    cand = [i for i in range(1, len(q) - 1) if q[i] >= 0.45 and q[i] >= q[i - 1] and q[i] >= q[i + 1]]
    if not cand:
        return None
    k = min(cand, key=lambda i: abs(coords[i] - near))
    lo, hi = max(k - halfwin, 0), min(k + halfwin + 1, len(q))
    w = q[lo:hi]
    return float((w * coords[lo:hi]).sum() / w.sum())

def vstroke(ink, x_near, y0, y1, half=5):
    """x position of a near-vertical stroke close to x_near, measured on rows y0..y1-1 (each row separately)."""
    xs = []
    for y in range(y0, y1):
        lo = int(round(x_near)) - half; hi = int(round(x_near)) + half + 1
        c = _peak_centroid(ink[y, lo:hi], np.arange(lo, hi, dtype=float), x_near)
        if c is not None:
            xs.append((y, c))
    return xs

def hstroke(ink, y_near, x0, x1, half=5):
    ys = []
    for x in range(x0, x1):
        lo = int(round(y_near)) - half; hi = int(round(y_near)) + half + 1
        c = _peak_centroid(ink[lo:hi, x], np.arange(lo, hi, dtype=float), y_near)
        if c is not None:
            ys.append((x, c))
    return ys

def robust_line(samples):
    """Fit s = a + b t to (t, s) samples with 2.5-sigma rejection; returns a, b, rms, n_kept."""
    t = np.array([q[0] for q in samples], float); s = np.array([q[1] for q in samples], float)
    keep = np.ones(len(t), bool)
    for _ in range(8):
        A = np.vstack([np.ones(keep.sum()), t[keep]]).T
        c, *_ = np.linalg.lstsq(A, s[keep], rcond=None)
        r = s - (c[0] + c[1] * t)
        sig = max(np.sqrt(np.mean(r[keep] ** 2)), 0.15)
        nk = np.abs(r) < 2.5 * sig
        if (nk == keep).all(): break
        keep = nk
    return float(c[0]), float(c[1]), float(np.sqrt(np.mean(r[keep] ** 2))), int(keep.sum())

def robust_mean(vals):
    v = np.array(vals, float); keep = np.ones(len(v), bool)
    for _ in range(8):
        m = v[keep].mean(); sd = max(v[keep].std(), 0.1)
        nk = np.abs(v - m) < 2.5 * sd
        if (nk == keep).all(): break
        keep = nk
    return float(v[keep].mean()), float(v[keep].std()), int(keep.sum())

def bilinear(ink, x, y):
    return ndi.map_coordinates(ink, [[y], [x]], order=1)[0]

def ray_samples(ink, cx, cy, r_lo, r_hi, angles_deg, step=0.25, exclude=()):
    """Radius of the ring stroke along rays from (cx, cy). Returns list of (x, y, angle) edge points."""
    pts = []
    rr = np.arange(r_lo, r_hi, step)
    for ang in angles_deg:
        if any(a0 <= ang % 360 <= a1 for a0, a1 in exclude):
            continue
        t = np.radians(ang)
        xs = cx + rr * np.cos(t); ys = cy - rr * np.sin(t)   # angle counter-clockwise, y down
        p = ndi.map_coordinates(ink, [ys, xs], order=1)
        if p.max() < 0.45:
            continue
        # require a single stroke: count separate runs above 0.45
        above = p > 0.45
        runs = np.sum(np.diff(above.astype(int)) == 1) + (1 if above[0] else 0)
        if runs != 1:
            continue
        k = int(np.argmax(p)); m = int(round(2.0 / step))
        lo, hi = max(k - m, 0), min(k + m + 1, len(p))
        w = p[lo:hi]; r = float((w * rr[lo:hi]).sum() / w.sum())
        pts.append((cx + r * np.cos(t), cy - r * np.sin(t), ang))
    return pts

def fit_circle(pts):
    """Algebraic (Kasa) circle fit with 2.5-sigma rejection on radial residuals."""
    x = np.array([p[0] for p in pts]); y = np.array([p[1] for p in pts])
    keep = np.ones(len(x), bool)
    for _ in range(10):
        A = np.vstack([2 * x[keep], 2 * y[keep], np.ones(keep.sum())]).T
        b = x[keep] ** 2 + y[keep] ** 2
        c, *_ = np.linalg.lstsq(A, b, rcond=None)
        cx, cy = c[0], c[1]; R = np.sqrt(c[2] + cx ** 2 + cy ** 2)
        res = np.hypot(x - cx, y - cy) - R
        sig = max(np.sqrt(np.mean(res[keep] ** 2)), 0.15)
        nk = np.abs(res) < 2.5 * sig
        if (nk == keep).all(): break
        keep = nk
    # centre uncertainty ~ sigma * sqrt(2/n)
    n = keep.sum()
    return float(cx), float(cy), float(R), float(np.sqrt(np.mean(res[keep] ** 2))), int(n), [pts[i][2] for i in range(len(pts)) if not keep[i]]

def perp_samples(ink, p0, p1, half=5, step=1.0, trim=0.2):
    """Edge points of a straight stroke running from p0 to p1 (approximate ends), measured on profiles perpendicular to it,
    skipping `trim` of the length at each end. Returns list of (x, y)."""
    p0 = np.array(p0, float); p1 = np.array(p1, float)
    d = p1 - p0; L = np.hypot(*d); u = d / L; nrm = np.array([-u[1], u[0]])
    out = []
    oo = np.arange(-half, half + 0.001, 0.25)
    for s in np.arange(trim * L, (1 - trim) * L + 0.001, step):
        c = p0 + u * s
        xs = c[0] + oo * nrm[0]; ys = c[1] + oo * nrm[1]
        p = ndi.map_coordinates(ink, [ys, xs], order=1)
        above = p > 0.45
        runs = np.sum(np.diff(above.astype(int)) == 1) + (1 if above[0] else 0)
        if p.max() < 0.45 or runs != 1:
            continue
        k = int(np.argmax(p)); lo, hi = max(k - 8, 0), min(k + 9, len(p))
        w = p[lo:hi]; o = float((w * oo[lo:hi]).sum() / w.sum())
        out.append(tuple(c + o * nrm))
    return out

def fit_line_xy(pts):
    """Total-least-squares line through points with 2.5-sigma rejection: returns point on line, unit direction, rms, n."""
    P = np.array(pts, float); keep = np.ones(len(P), bool)
    for _ in range(8):
        m = P[keep].mean(axis=0); U, S, Vt = np.linalg.svd(P[keep] - m)
        d = Vt[0]; nrm = np.array([-d[1], d[0]])
        r = (P - m) @ nrm
        sig = max(np.sqrt(np.mean(r[keep] ** 2)), 0.15)
        nk = np.abs(r) < 2.5 * sig
        if (nk == keep).all(): break
        keep = nk
    return m, d, float(np.sqrt(np.mean(r[keep] ** 2))), int(keep.sum())

def intersect(m1, d1, m2, d2):
    A = np.array([d1, -d2]).T
    t = np.linalg.solve(A, m2 - m1)
    return m1 + t[0] * d1

def side(ink, o, near, ranges, half=4):
    """Position of a straight near-vertical (o='v') or near-horizontal (o='h') stroke: robust line over the given
    row (or column) ranges, evaluated at the middle of the sampled span. Returns (pos, slope, rms, n, tmid)."""
    samples = []
    for a0, a1 in ranges:
        samples += (vstroke if o == 'v' else hstroke)(ink, near, a0, a1 + 1, half=half)
    a, b, rms, n = robust_line(samples)
    t = [s[0] for s in samples]; tm = 0.5 * (min(t) + max(t))
    return a + b * tm, b, rms, n, tm, (a, b)

def line_at(ab, t):
    return ab[0] + ab[1] * t

def cross_point(vab, hab):
    """Intersection of x = a + b*y (vertical stroke) and y = c + d*x (horizontal stroke)."""
    a, b = vab; c, d = hab
    y = (c + d * a) / (1 - d * b); return a + b * y, y

def dot(ink, x, y, r=3, floor=0.15):
    xi, yi = int(round(x)), int(round(y))
    w = ink[yi - r:yi + r + 1, xi - r:xi + r + 1].copy(); w[w < floor] = 0
    yy, xx = np.mgrid[yi - r:yi + r + 1, xi - r:xi + r + 1]
    return float((w * xx).sum() / w.sum()), float((w * yy).sum() / w.sum()), float(w.max())

def stroke_end(ink, o, pos, start, step, thr=0.45, half=2, limit=60):
    """Walk along a vertical (o='v', pos = x) or horizontal stroke from `start` in direction `step` (+1/-1) and return
    the last coordinate whose profile maximum within +-half px of pos is above thr (the outer end of the ink)."""
    p = int(round(pos)); t = int(round(start)); last = t
    for _ in range(limit):
        prof = ink[t, p - half:p + half + 1] if o == 'v' else ink[p - half:p + half + 1, t]
        if prof.max() < thr: break
        last = t; t += step
    return last

def faint_side(ink, o, lo, hi, ranges):
    """Position of a faint straight stroke: for each row (o='v') or column (o='h') in ranges, the centroid of the ink between
    lo and hi (inclusive) after subtracting the smaller of the two end values; returns mean, std, n."""
    vals = []
    for a0, a1 in ranges:
        for t in range(a0, a1 + 1):
            p = ink[t, lo:hi + 1] if o == 'v' else ink[lo:hi + 1, t]
            p = p - min(p[0], p[-1]); p[p < 0] = 0
            if p.sum() > 0.2:
                vals.append(float((p * np.arange(lo, hi + 1)).sum() / p.sum()))
    v = np.array(vals); return float(v.mean()), float(v.std()), len(v)

def residual_stroke(ink, o, lo, hi, ref_ranges, in_ranges):
    """A stroke overlapping a grid line: average profile of the grid line alone (ref rows/cols) is subtracted from the
    average profile where both overlap (in rows/cols); returns centroid of the remainder, its integrated ink, and the
    grid-alone centroid."""
    def mean_prof(ranges):
        ps = []
        for a0, a1 in ranges:
            for t in range(a0, a1 + 1):
                ps.append(ink[t, lo:hi + 1] if o == 'v' else ink[lo:hi + 1, t])
        return np.mean(ps, axis=0)
    g = mean_prof(ref_ranges); c = mean_prof(in_ranges); d = c - g; d[d < 0] = 0
    x = np.arange(lo, hi + 1)
    return float((d * x).sum() / d.sum()), float(d.sum()), float((g * x).sum() / g.sum())
