"""Fit a periodic comb of bold grid lines to a column or row profile.

Usage: python -I periodic.py IMG.png axis x0 y0 x1 y1 smin smax [ref_px]
axis: V (columns) or H (rows).  The ink fraction profile of the region
(grey < 128) is lightly smoothed; for spacings s in [smin, smax]
(0.02 px steps) and phases, the score is the mean profile value at the
comb teeth (linear interpolation).  The best comb is refined by
least-squares fitting each tooth to the profile's local
darkness-weighted centre (+-3 px), and the tooth positions, their
residuals from the straight comb and the fitted spacing are printed.
With ref_px, the tooth nearest to it is marked.
"""
import sys

import numpy as np
from PIL import Image


def main():
    a = sys.argv[1:]
    img = np.asarray(Image.open(a[0]).convert("L"))
    ax = a[1]
    x0, y0, x1, y1 = (int(v) for v in a[2:6])
    smin, smax = float(a[6]), float(a[7])
    ref = float(a[8]) if len(a) > 8 else None
    ink = img[y0:y1, x0:x1] < 128
    p = ink.mean(axis=0) if ax == "V" else ink.mean(axis=1)
    off = x0 if ax == "V" else y0
    p = np.convolve(p, [0.25, 0.5, 0.25], mode="same")
    n = len(p)
    best = None
    for s in np.arange(smin, smax + 1e-9, 0.02):
        for ph in np.arange(0, s, 0.25):
            t = np.arange(ph, n - 1, s)
            sc = np.interp(t, np.arange(n), p).mean()
            if best is None or sc > best[0]:
                best = (sc, s, ph)
    sc, s, ph = best
    teeth = np.arange(ph, n - 1, s)
    cents = []
    for t in teeth:
        i0, i1 = int(max(0, round(t) - 3)), int(min(n, round(t) + 4))
        w = p[i0:i1]
        if w.sum() <= 0:
            continue
        c = (np.arange(i0, i1) * w).sum() / w.sum()
        cents.append((t, c, p[int(round(t))]))
    k = np.arange(len(cents))
    c = np.array([q[1] for q in cents])
    A = np.vstack([k, np.ones_like(k)]).T
    (ss, cc), *_ = np.linalg.lstsq(A, c, rcond=None)
    print("score %.3f spacing %.3f (refined %.3f)  first tooth %.2f" % (sc, s, ss, cc + off))
    for i, (t, cpos, pv) in enumerate(cents):
        fitted = cc + ss * i
        mark = ""
        if ref is not None and abs(cpos + off - ref) < s / 2:
            mark = "  <-- nearest to ref"
        print("  tooth %2d at %.2f (comb %.2f, resid %.2f, frac %.2f)%s" % (i, cpos + off, fitted + off, cpos - fitted, pv, mark))


if __name__ == "__main__":
    main()
