"""Ink sampling along lines of constant plot coordinate.

Given a gray image and an affine calibration (cx, cy: plot = c0 + c1*px + c2*py), sample
the image along a line of constant X (or constant Y) in plot units, and split the ink along
it into runs. Each run gives a weighted centroid (weight = max(0, wthr - gray)) in plot units,
its extent and its darkest gray value. No smoothing across runs is done here.
"""
import numpy as np


def inv(cx, cy, X, Y):
    M = np.array([[cx[1], cx[2]], [cy[1], cy[2]]])
    rhs = np.vstack([np.asarray(X, float) - cx[0], np.asarray(Y, float) - cy[0]])
    return np.linalg.solve(M, rhs)


def fwd(cx, cy, px, py):
    return (cx[0] + cx[1] * px + cx[2] * py, cy[0] + cy[1] * px + cy[2] * py)


def bilinear(g, px, py):
    x0 = np.floor(px).astype(int)
    y0 = np.floor(py).astype(int)
    fx = px - x0
    fy = py - y0
    x0 = np.clip(x0, 0, g.shape[1] - 2)
    y0 = np.clip(y0, 0, g.shape[0] - 2)
    return (g[y0, x0] * (1 - fx) * (1 - fy) + g[y0, x0 + 1] * fx * (1 - fy)
            + g[y0 + 1, x0] * (1 - fx) * fy + g[y0 + 1, x0 + 1] * fx * fy)


def sample(g, cx, cy, fixed, value, lo, hi, step):
    v = np.arange(lo, hi + step / 2, step)
    if fixed == 'x':
        X = np.full_like(v, value)
        Y = v
    else:
        Y = np.full_like(v, value)
        X = v
    p = inv(cx, cy, X, Y)
    return v, bilinear(g, p[0], p[1]), p


def runs(v, prof, thr, wthr, minlen=1, darkmax=255):
    ink = prof < thr
    out = []
    i = 0
    n = len(v)
    while i < n:
        if ink[i]:
            j = i
            while j + 1 < n and ink[j + 1]:
                j += 1
            # widen by 3 samples each side for the weighted centroid
            a = max(0, i - 3)
            b = min(n - 1, j + 3)
            w = np.clip(wthr - prof[a:b + 1], 0, None)
            if w.sum() > 0 and (j - i + 1) >= minlen and prof[i:j + 1].min() <= darkmax:
                c = float((v[a:b + 1] * w).sum() / w.sum())
                out.append(dict(c=c, lo=float(v[i]), hi=float(v[j]), n=j - i + 1,
                                gmin=float(prof[i:j + 1].min())))
            i = j + 1
        else:
            i += 1
    return out
