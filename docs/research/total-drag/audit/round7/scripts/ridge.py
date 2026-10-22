"""Ink-ridge follower for curves on a scanned graph.

The follower walks along a drawn line in steps of `step` pixels. At each step
it predicts the next point from the current direction, samples the darkness
(255 - gray, bilinear) along the normal to the direction over +-`half` px,
and moves the point to the darkness-weighted centroid of the nearest peak
(within `tol` px of the prediction). Through dashes, gaps and masked gridline
crossings it coasts on the current direction for up to `max_gap` px.

Pixels within `grid_halfwidth` px of a fitted gridline centre are treated as
masked: they are ignored when the centroid is taken, and a sample whose
centroid window touches masked pixels is flagged `near_grid` (kept for the
overlay, left out of value fits).
"""
import numpy as np


def bilinear(d, x, y):
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx = x - x0
    fy = y - y0
    h, w = d.shape
    x0 = np.clip(x0, 0, w - 2)
    y0 = np.clip(y0, 0, h - 2)
    return ((1 - fx) * (1 - fy) * d[y0, x0] + fx * (1 - fy) * d[y0, x0 + 1]
            + (1 - fx) * fy * d[y0 + 1, x0] + fx * fy * d[y0 + 1, x0 + 1])


def grid_mask(shape, vlines, hlines, halfwidth, box):
    """Boolean mask of gridline pixels inside box (x0, x1, y0, y1).

    vlines: list of callables y -> x ; hlines: list of callables x -> y.
    """
    m = np.zeros(shape, bool)
    x0, x1, y0, y1 = box
    ys = np.arange(y0, y1)
    xs = np.arange(x0, x1)
    for f in vlines:
        xc = f(ys)
        for yy, xx in zip(ys, xc):
            a = int(np.ceil(xx - halfwidth))
            b = int(np.floor(xx + halfwidth))
            if b >= x0 and a < x1:
                m[yy, max(a, x0):min(b, x1 - 1) + 1] = True
    for f in hlines:
        yc = f(xs)
        for xx, yy in zip(xs, yc):
            a = int(np.ceil(yy - halfwidth))
            b = int(np.floor(yy + halfwidth))
            if b >= y0 and a < y1:
                m[max(a, y0):min(b, y1 - 1) + 1, xx] = True
    return m


def follow(d, mask, p0, dir0, n_max=4000, step=1.5, half=8.0, tol=3.0, cw=3.5,
           min_peak=40.0, max_gap=45.0, dir_span=14.0, stop=None, smooth_dir=True):
    """Follow a ridge from p0 (x, y) in direction dir0. Returns list of dicts."""
    maskf = mask if mask.dtype == np.float32 else mask.astype(np.float32)
    p = np.array(p0, float)
    t = np.array(dir0, float)
    t /= np.linalg.norm(t)
    offs = np.arange(-half, half + 0.01, 0.5)
    pts = []
    gap = 0.0
    hist = [p.copy()]
    for _ in range(n_max):
        q = p + step * t
        nrm = np.array([-t[1], t[0]])
        xs = q[0] + offs * nrm[0]
        ys = q[1] + offs * nrm[1]
        prof = bilinear(d, xs, ys)
        msk = bilinear(maskf, xs, ys) > 0.01
        prof = np.where(msk, 0.0, prof)
        base = np.median(np.r_[prof[:3], prof[-3:]])
        pr = prof - base
        # local maxima within tol of prediction
        cand = [i for i in range(1, len(pr) - 1)
                if pr[i] >= pr[i - 1] and pr[i] >= pr[i + 1] and pr[i] > min_peak
                and abs(offs[i]) <= tol]
        found = False
        if cand:
            i = min(cand, key=lambda k: abs(offs[k]) - 0.002 * pr[k])
            win = np.abs(offs - offs[i]) <= cw
            w = np.clip(pr[win], 0, None)
            if w.sum() > 0:
                c = (offs[win] * w).sum() / w.sum()
                near_grid = bool(msk[win].any())
                q = q + c * nrm
                found = True
                pts.append(dict(x=float(q[0]), y=float(q[1]), peak=float(pr[i]),
                                near_grid=near_grid, tx=float(t[0]), ty=float(t[1])))
        if found:
            gap = 0.0
            hist.append(q.copy())
            # direction from recent points spanning about dir_span px
            if smooth_dir and len(hist) > 3:
                H = np.array(hist)
                dd = np.linalg.norm(H - H[-1], axis=1)
                sel = H[dd <= dir_span]
                if len(sel) >= 3:
                    u = sel[-1] - sel[0]
                    if np.linalg.norm(u) > 1e-6:
                        u = u / np.linalg.norm(u)
                        if u @ t > 0.5:
                            t = u
        else:
            gap += step
            if gap > max_gap:
                break
        p = q
        if stop is not None and stop(p):
            break
    return pts
