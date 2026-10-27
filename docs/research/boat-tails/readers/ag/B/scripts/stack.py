"""Find every outline symbol of one shape in a region (for stacks of
overlapping open symbols).

Usage: python -I stack.py PAGE.png thr shape size x0 y0 x1 y1 [mincov] [aspect]
For every centre on a 0.5 px grid in the region, computes the coverage
(fraction of template outline points lying on ink, ink = blurred binary
> 0.35) and a contrast score (outline ink minus ink 3.5 px inside and
outside).  Prints local maxima of coverage (3 px neighbourhood) above
mincov (default 0.85), refined to 0.1 px by the contrast score.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path = [p for p in sys.path if p]  # isolated mode: no cwd


def outline(shape, s, aspect=1.0, n=120):
    if shape == "circle":
        t = np.linspace(0, 2 * np.pi, n, endpoint=False)
        return np.c_[s * np.cos(t), s * np.sin(t)]
    h = s * aspect
    if shape == "square":
        v = [(-s, -h), (s, -h), (s, h), (-s, h)]
    elif shape == "diamond":
        v = [(0, -h), (s, 0), (0, h), (-s, 0)]
    elif shape == "tri_up":
        v = [(0, -h), (s, h), (-s, h)]
    elif shape == "tri_dn":
        v = [(0, h), (s, -h), (-s, -h)]
    elif shape == "tri_ur":
        v = [(-s, h), (s, h), (s, -h)]
    elif shape == "tri_r":
        v = [(s, 0), (-s, h), (-s, -h)]
    elif shape == "tri_l":
        v = [(-s, 0), (s, h), (s, -h)]
    elif shape == "octagon":
        a = s * np.tan(np.pi / 8)
        v = [(-a, -s), (a, -s), (s, -a), (s, a), (a, s), (-a, s), (-s, a), (-s, -a)]
    else:
        raise ValueError(shape)
    v = np.array(v, float)
    m = len(v)
    pts = []
    per = n // m
    for i in range(m):
        a, b = v[i], v[(i + 1) % m]
        for k in range(per):
            pts.append(a + (b - a) * k / per)
    return np.array(pts)


def scale(p, d):
    r = np.hypot(p[:, 0], p[:, 1])
    r[r == 0] = 1
    return p * ((r + d) / r)[:, None]


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    thr = float(a[1])
    shape = a[2]
    s = float(a[3])
    x0, y0, x1, y1 = (float(v) for v in a[4:8])
    mincov = float(a[8]) if len(a) > 8 else 0.85
    aspect = float(a[9]) if len(a) > 9 else 1.0
    ink = ndimage.gaussian_filter((img < thr).astype(float), 0.8)
    tpl = outline(shape, s, aspect)
    tin = scale(tpl, -3.5)
    tout = scale(tpl, 3.5)
    xs = np.arange(x0, x1 + 0.01, 0.5)
    ys = np.arange(y0, y1 + 0.01, 0.5)
    cov = np.zeros((len(ys), len(xs)))
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            v = ndimage.map_coordinates(ink, [tpl[:, 1] + y, tpl[:, 0] + x], order=1)
            cov[j, i] = (v > 0.35).mean()
    mx = ndimage.maximum_filter(cov, size=7)
    cand = np.argwhere((cov == mx) & (cov >= mincov))
    res = []
    for j, i in cand:
        bx, by = xs[i], ys[j]
        best = None
        for dy in np.arange(-0.5, 0.51, 0.1):
            for dx in np.arange(-0.5, 0.51, 0.1):
                cx, cy = bx + dx, by + dy
                on = ndimage.map_coordinates(ink, [tpl[:, 1] + cy, tpl[:, 0] + cx], order=1).mean()
                o = ndimage.map_coordinates(ink, [tout[:, 1] + cy, tout[:, 0] + cx], order=1).mean()
                ii = ndimage.map_coordinates(ink, [tin[:, 1] + cy, tin[:, 0] + cx], order=1).mean()
                sc = on - 0.5 * (o + ii)
                if best is None or sc > best[0]:
                    best = (sc, cx, cy)
        res.append((cov[j, i], best[1], best[2], best[0]))
    # merge near-duplicates (within 1.5 px)
    res.sort(key=lambda r: -r[0])
    kept = []
    for r in res:
        if all(np.hypot(r[1] - k[1], r[2] - k[2]) > 1.5 for k in kept):
            kept.append(r)
    kept.sort(key=lambda r: (r[2], r[1]))
    for c, x, y, sc in kept:
        print("cov=%.3f  c=(%.1f, %.1f)  contrast=%.3f" % (c, x, y, sc))


if __name__ == "__main__":
    main()
