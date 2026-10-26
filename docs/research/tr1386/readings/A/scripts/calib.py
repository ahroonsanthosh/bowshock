"""Local grid calibration.

Each grid line is tracked at several clean positions along its length and
fitted as a straight line (x = a + b*y for vertical lines, y = c + d*x for
horizontal lines). A point is converted by piecewise-linear interpolation
between the two fitted grid lines that bracket it, evaluated at the point's
own position, so small scan skew and paper warp are followed locally.
"""
import numpy as np


def _centre(prof, base, approx_idx, win):
    i0 = max(0, int(approx_idx - win))
    seg = prof[i0:int(approx_idx + win) + 1] - base
    w = np.clip(seg - 0.08, 0, None)
    if w.sum() <= 0:
        return None, 0.0
    return i0 + (w * np.arange(len(seg))).sum() / w.sum(), float(seg.max())


def track_h(page, y_approx, xs, half=12, win=7, minpeak=0.15):
    """Measure a horizontal line near y_approx at each x in xs
    (column strip x-half..x+half). Returns list of (x, y)."""
    out = []
    for x in xs:
        y0 = int(y_approx) - 40
        prof = page[y0:y0 + 81, int(x) - half:int(x) + half + 1].mean(axis=1)
        base = np.median(prof)
        c, pk = _centre(prof, base, 40, win)
        if c is not None and pk > minpeak:
            out.append((float(x), y0 + c))
    return out


def track_v(page, x_approx, ys, half=12, win=7, minpeak=0.15):
    out = []
    for y in ys:
        x0 = int(x_approx) - 40
        prof = page[int(y) - half:int(y) + half + 1, x0:x0 + 81].mean(axis=0)
        base = np.median(prof)
        c, pk = _centre(prof, base, 40, win)
        if c is not None and pk > minpeak:
            out.append((x0 + c, float(y)))
    return out


def fit(pts, horizontal, reject=2.5):
    """Robust straight-line fit. horizontal: y = c + d*x; else x = a + b*y."""
    p = np.array(pts, dtype=float)
    if horizontal:
        u, v = p[:, 0], p[:, 1]
    else:
        u, v = p[:, 1], p[:, 0]
    keep = np.ones(len(u), bool)
    for _ in range(4):
        if keep.sum() >= 2:
            A = np.vstack([np.ones(keep.sum()), u[keep]]).T
            coef, *_ = np.linalg.lstsq(A, v[keep], rcond=None)
        else:
            coef = np.array([v[keep].mean() if keep.any() else v.mean(), 0.0])
        r = v - (coef[0] + coef[1] * u)
        s = max(np.median(np.abs(r[keep])) * 1.5, 0.8)
        nk = np.abs(r) < reject * s
        if (nk == keep).all():
            break
        keep = nk
    rms = float(np.sqrt(np.mean(r[keep] ** 2))) if keep.any() else float("nan")
    return dict(c0=float(coef[0]), c1=float(coef[1]), n=int(keep.sum()), ntot=len(u), rms=rms)


def at(line, s):
    return line["c0"] + line["c1"] * s


def interp(lines, vals, pos, s):
    """lines: fitted grid lines (all same orientation), vals: their data
    values, pos: point pixel coordinate across the lines, s: point pixel
    coordinate along the lines. Linear between the two bracketing lines,
    extrapolated from the nearest pair outside."""
    ps = np.array([at(l, s) for l in lines])
    v = np.array(vals, float)
    o = np.argsort(ps)
    ps, v = ps[o], v[o]
    if pos <= ps[0]:
        i = 0
    elif pos >= ps[-1]:
        i = len(ps) - 2
    else:
        i = int(np.searchsorted(ps, pos)) - 1
    return float(v[i] + (pos - ps[i]) * (v[i + 1] - v[i]) / (ps[i + 1] - ps[i])), float(abs((v[i + 1] - v[i]) / (ps[i + 1] - ps[i])))
