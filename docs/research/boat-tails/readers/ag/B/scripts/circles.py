"""Fixed-size Hough search for open symbols (circles or squares) whose
outlines overlap or are partly hidden.

Usage: python -I circles.py PAGE.png shape size x0 y0 x1 y1 [minbins] [thr]
shape: circle (size = radius) or square (size = half side) or diamond
(size = half diagonal).
Stroke centre-line pixels (ridges: grey < thr and a local grey minimum
across the stroke, horizontally or vertically) are found in the region.
Every candidate centre on a 0.25 px grid is scored by the number of the
36 angular sectors (10 deg each) of the template outline that contain a
ridge pixel within 1.0 px of the outline.  Local maxima with at least
minbins sectors (default 12, i.e. 120 deg of outline) are printed with
their sector pattern (top of the symbol first, counterclockwise: 'X' =
sector inked), the centre refined as the mean over the plateau of
maximal score.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def ridges(g, thr):
    r = np.zeros(g.shape, bool)
    dark = g < thr
    h = (g[:, 1:-1] <= g[:, :-2]) & (g[:, 1:-1] <= g[:, 2:])
    v = (g[1:-1, :] <= g[:-2, :]) & (g[1:-1, :] <= g[2:, :])
    r[:, 1:-1] |= h
    r[1:-1, :] |= v
    return r & dark


def dist_to_outline(dx, dy, shape, s):
    if shape == "circle":
        return np.abs(np.hypot(dx, dy) - s)
    if shape == "square":
        # distance to the square boundary of half side s
        ax, ay = np.abs(dx), np.abs(dy)
        out = np.hypot(np.maximum(ax - s, 0), np.maximum(ay - s, 0))
        inside = np.minimum(s - ax, s - ay)
        return np.where((ax <= s) & (ay <= s), inside, out)
    if shape == "diamond":
        u = (np.abs(dx) + np.abs(dy) - s) / np.sqrt(2)
        return np.abs(u)
    raise ValueError(shape)


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"), float)
    shape = a[1]
    s = float(a[2])
    x0, y0, x1, y1 = (int(v) for v in a[3:7])
    minb = int(a[7]) if len(a) > 7 else 12
    thr = float(a[8]) if len(a) > 8 else 190
    m = int(s * 1.5) + 4
    X0, Y0 = x0 - m, y0 - m
    sub = img[Y0:y1 + m, X0:x1 + m]
    rg = ridges(ndimage.gaussian_filter(sub, 0.6), thr)
    ys, xs = np.nonzero(rg)
    xs = xs + X0
    ys = ys + Y0
    cxs = np.arange(x0, x1 + 0.001, 0.25)
    cys = np.arange(y0, y1 + 0.001, 0.25)
    score = np.zeros((len(cys), len(cxs)), int)
    for j, cy in enumerate(cys):
        for i, cx in enumerate(cxs):
            dx = xs - cx
            dy = ys - cy
            sel = dist_to_outline(dx, dy, shape, s) <= 1.0
            if not sel.any():
                continue
            ang = (np.degrees(np.arctan2(-dy[sel], dx[sel])) % 360) // 10
            score[j, i] = len(np.unique(ang))
    mx = ndimage.maximum_filter(score, size=9)
    lab, n = ndimage.label((score == mx) & (score >= minb))
    out = []
    for k in range(1, n + 1):
        jj, ii = np.nonzero(lab == k)
        cx, cy = cxs[ii].mean(), cys[jj].mean()
        sc = score[jj[0], ii[0]]
        dx = xs - cx
        dy = ys - cy
        sel = dist_to_outline(dx, dy, shape, s) <= 1.0
        ang = (np.degrees(np.arctan2(-dy[sel], dx[sel])) % 360) // 10
        bins = set(ang.astype(int))
        # pattern from 90 deg (top) going counterclockwise
        pat = "".join("X" if ((9 + q) % 36) in bins else "." for q in range(36))
        out.append((cy, cx, sc, pat, len(ii)))
    out.sort()
    for cy, cx, sc, pat, npl in out:
        print("c=(%.2f, %.2f) sectors=%d plateau=%d  top>left>bottom>right: %s" % (cx, cy, sc, npl, pat))


if __name__ == "__main__":
    main()
