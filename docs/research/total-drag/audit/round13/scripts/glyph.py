"""Glyph models and centre fits (round 13's own implementation).

A glyph is modelled as soft ink along an ideal outline: ink(d) =
exp(-(d / s)^2 / 2) with d the distance from the outline's stroke centre and
s the stroke's half-width / 1.2. Filled glyphs are modelled as ink inside the
outline (and on its stroke). Shapes (sizes in px, to the stroke centre):
  ("circle", r)            ("square", a)  a = half side
  ("rect", ax, ay)         ("diamond", a)  a = half diagonal
  ("tri_up", b, h)         ("tri_down", b, h)  half base b, height h, centred
                           on the bounding box
  ("plus", L), ("xcross", L)   arms of reach L
A trailing "_f" on the kind (e.g. "circle_f") means filled.

Fits compare model and page ink by a normalised correlation over a window,
with pixels near calibrated gridlines (and axes) given zero weight, so that
lines crossing a glyph do not pull it. A centre is searched over +-search px
in 0.25 px steps. Pairs (two glyphs merged in ink) are fitted jointly, with
the model the pixelwise maximum of the two glyphs' inks.
"""
import numpy as np


def ink_map(g, bg=None, dark=None):
    """Grey page -> ink in 0..1 (1 = darkest)."""
    if bg is None:
        bg = float(np.percentile(g, 75))
    if dark is None:
        dark = float(np.percentile(g, 0.5))
    return np.clip((bg - g) / max(bg - dark, 1.0), 0.0, 1.0)


def sdist(shape, xx, yy):
    """Signed distance (negative inside) to the shape's outline, centred at 0."""
    k = shape[0].replace("_f", "")
    if k == "circle":
        return np.hypot(xx, yy) - shape[1]
    if k == "square":
        a = shape[1]
        return _box(xx, yy, a, a)
    if k == "rect":
        return _box(xx, yy, shape[1], shape[2])
    if k == "diamond":
        return (np.abs(xx) + np.abs(yy) - shape[1]) / np.sqrt(2.0)
    if k in ("tri_up", "tri_down"):
        b, h = shape[1], shape[2]
        yy2 = yy if k == "tri_up" else -yy
        pts = [(0.0, -h / 2), (-b, h / 2), (b, h / 2)]
        ds = []
        for (x1, y1), (x2, y2) in ((pts[0], pts[1]), (pts[1], pts[2]), (pts[2], pts[0])):
            nx, ny = (y2 - y1), -(x2 - x1)
            L = np.hypot(nx, ny)
            cx, cy = 0.0, h / 6
            sg = 1.0 if ((cx - x1) * nx + (cy - y1) * ny) < 0 else -1.0
            ds.append(sg * ((xx - x1) * nx + (yy2 - y1) * ny) / L)
        return np.max(ds, axis=0)
    if k == "plus":
        L = shape[1]
        d1 = np.maximum(np.abs(xx), np.abs(yy) - L)
        d2 = np.maximum(np.abs(yy), np.abs(xx) - L)
        return np.minimum(d1, d2)
    if k == "xcross":
        L = shape[1]
        u, v = (xx + yy) / np.sqrt(2), (xx - yy) / np.sqrt(2)
        Ld = L * np.sqrt(2)
        d1 = np.maximum(np.abs(u), np.abs(v) - Ld)
        d2 = np.maximum(np.abs(v), np.abs(u) - Ld)
        return np.minimum(d1, d2)
    raise ValueError(shape)


def _box(xx, yy, ax, ay):
    qx, qy = np.abs(xx) - ax, np.abs(yy) - ay
    out = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
    ins = np.minimum(np.maximum(qx, qy), 0)
    return out + ins


def model(shape, xx, yy, sw):
    d = sdist(shape, xx, yy)
    s = sw / 1.2
    if shape[0] in ("plus", "xcross"):
        d = np.abs(d)  # these are strokes only: distance to the arms
        return np.exp(-0.5 * (d / s) ** 2)
    m = np.exp(-0.5 * (d / s) ** 2)
    if shape[0].endswith("_f"):
        m = np.where(d < 0, 1.0, m)
    return m


def wncc(a, b, w):
    sw = w.sum()
    if sw < 20:
        return -9.0
    a = a - (w * a).sum() / sw
    b = b - (w * b).sum() / sw
    den = np.sqrt((w * a * a).sum() * (w * b * b).sum())
    return float((w * a * b).sum() / den) if den > 0 else -9.0


def window(ink, wmask, cx, cy, R):
    x0, y0 = int(round(cx)) - R, int(round(cy)) - R
    sub = ink[y0:y0 + 2 * R + 1, x0:x0 + 2 * R + 1]
    w = wmask[y0:y0 + 2 * R + 1, x0:x0 + 2 * R + 1]
    yy, xx = np.mgrid[y0:y0 + 2 * R + 1, x0:x0 + 2 * R + 1].astype(float)
    return sub, w, xx, yy


def fit_one(ink, wmask, shape, ax, ay, sw=1.6, search=4.0, R=None, step=0.25, others=()):
    """Best centre of one glyph near (ax, ay). others: fixed glyphs [(shape, x, y)] in the window
    (their ink is part of the model, so a neighbour does not pull the fit)."""
    size = max(shape[1:]) if len(shape) > 1 else 8
    R = R or int(size + search + 5)
    sub, w, xx, yy = window(ink, wmask, ax, ay, R)
    fixed = np.zeros_like(sub)
    for sh, ox, oy in others:
        fixed = np.maximum(fixed, model(sh, xx - ox, yy - oy, sw))
    best = (-9.0, ax, ay)
    for dy in np.arange(-search, search + 1e-9, step):
        for dx in np.arange(-search, search + 1e-9, step):
            m = np.maximum(model(shape, xx - (ax + dx), yy - (ay + dy), sw), fixed)
            sc = wncc(m, sub, w)
            if sc > best[0]:
                best = (sc, ax + dx, ay + dy)
    return best


def fit_pair(ink, wmask, sh1, a1, sh2, a2, sw=1.6, search=4.0, R=None, others=()):
    """Joint fit of two merged glyphs: coordinate ascent from a 1 px grid, then 0.25 px."""
    size = max(max(sh1[1:]), max(sh2[1:]))
    cx, cy = (a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2
    R = R or int(size + search + 5 + max(abs(a1[0] - a2[0]), abs(a1[1] - a2[1])) / 2)
    sub, w, xx, yy = window(ink, wmask, cx, cy, R)
    p = [a1[0], a1[1], a2[0], a2[1]]
    fixed = np.zeros_like(sub)
    for sh, ox, oy in others:
        fixed = np.maximum(fixed, model(sh, xx - ox, yy - oy, sw))

    def score(q):
        m = np.maximum(model(sh1, xx - q[0], yy - q[1], sw), model(sh2, xx - q[2], yy - q[3], sw))
        m = np.maximum(m, fixed)
        return wncc(m, sub, w)

    best = score(p)
    for st in (1.0, 0.5, 0.25):
        improved = True
        while improved:
            improved = False
            for i in range(4):
                for sgn in (-1, 1):
                    q = list(p)
                    q[i] += sgn * st
                    base = [a1[0], a1[1], a2[0], a2[1]][i]
                    if abs(q[i] - base) > search:
                        continue
                    s = score(q)
                    if s > best + 1e-6:
                        best, p, improved = s, q, True
    # profile: how much the score drops when the pair is forced concentric (separation test)
    return best, p, score


def ncc_map_1d(ink, wmask, shape, cx, cy, sw=1.6, span=4.0):
    """Score along x and y through the centre, for the curvature (width) of the optimum."""
    out = {}
    for ax in ("x", "y"):
        vals = []
        for d in np.arange(-span, span + 1e-9, 0.5):
            x, y = (cx + d, cy) if ax == "x" else (cx, cy + d)
            sc, _, _ = fit_one(ink, wmask, shape, x, y, sw=sw, search=0.0)
            vals.append(round(sc, 3))
        out[ax] = vals
    return out
