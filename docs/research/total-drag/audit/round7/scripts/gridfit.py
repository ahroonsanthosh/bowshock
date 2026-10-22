"""Gridline detection and pixel-to-data calibration for scanned NACA graphs.

Each gridline is located independently: the scan is cut into short strips
across the line, the darkness centroid of the line is measured in every strip,
and a straight line (and, as a check, a quadratic) is fitted through those
centroids with iterative outlier rejection (text, curves and symbols that sit on
a gridline are rejected this way). Every gridline is therefore its own fitted
line, which absorbs skew, rotation and uneven spacing.

Pixel-to-data conversion (to_data) is local: for a point (x, y) the vertical
gridlines are evaluated at that y, the horizontal gridlines at that x, and the
data value is interpolated linearly between the two neighbouring gridlines in
each direction (iterated twice so the cross-evaluation uses the converged
point). A global affine and a global projective fit through all gridline
intersections are also made, only to report how far the sheet departs from a
perfect affine grid.
"""
import json
import numpy as np


def _centroid_profile(prof, cw):
    base = np.median(prof)
    p = prof - base
    i = int(np.argmax(p))
    peak = p[i]
    lo, hi = max(0, i - cw), min(len(p), i + cw + 1)
    w = np.clip(p[lo:hi], 0, None)
    if w.sum() <= 0:
        return None, 0.0
    c = (np.arange(lo, hi) * w).sum() / w.sum()
    return c, peak


def locate_line(d, orient, nominal, s0, s1, strip=30, win=14, cw=4,
                min_peak=35.0, step=None):
    """Return list of (s, pos) samples for one gridline.

    orient 'v': line roughly x = nominal, s runs along y from s0 to s1.
    orient 'h': line roughly y = nominal, s runs along x.
    """
    step = step or strip
    out = []
    pred = nominal
    for s in range(int(s0), int(s1) - strip + 1, step):
        a = int(round(pred)) - win
        b = int(round(pred)) + win + 1
        if orient == "v":
            blk = d[s:s + strip, a:b]
            prof = blk.mean(axis=0)
        else:
            blk = d[a:b, s:s + strip]
            prof = blk.mean(axis=1)
        c, peak = _centroid_profile(prof, cw)
        if c is None or peak < min_peak:
            continue
        out.append((s + strip / 2.0, a + c))
    return out


def robust_fit(samples, deg=1, clip=1.2, iters=8):
    s = np.array([p[0] for p in samples], float)
    v = np.array([p[1] for p in samples], float)
    keep = np.ones(len(s), bool)
    coef = None
    for _ in range(iters):
        if keep.sum() < deg + 3:
            break
        coef = np.polyfit(s[keep], v[keep], deg)
        r = v - np.polyval(coef, s)
        sig = 1.4826 * np.median(np.abs(r[keep] - np.median(r[keep])))
        lim = max(clip, 3.0 * sig)
        new = np.abs(r) < lim
        if (new == keep).all():
            break
        keep = new
    r = v - np.polyval(coef, s)
    return coef, keep, r


class Grid:
    """Holds fitted vertical and horizontal gridlines with their data values."""

    def __init__(self):
        self.v = []  # list of dict(value, coef, rms, n, nrej, slope)
        self.h = []

    def add(self, orient, value, samples, deg=1):
        coef, keep, r = robust_fit(samples, deg=deg)
        coef2, keep2, r2 = robust_fit(samples, deg=2)
        rec = dict(value=value, coef=coef.tolist(), n=int(keep.sum()),
                   nrej=int((~keep).sum()), rms=float(np.sqrt(np.mean(r[keep] ** 2))),
                   maxres=float(np.max(np.abs(r[keep]))),
                   quad=float(coef2[0]), rms_quad=float(np.sqrt(np.mean(r2[keep2] ** 2))),
                   s_range=[float(min(p[0] for p in samples)), float(max(p[0] for p in samples))])
        (self.v if orient == "v" else self.h).append(rec)
        return rec

    def sort(self):
        self.v.sort(key=lambda r: r["value"])
        self.h.sort(key=lambda r: r["value"])

    @staticmethod
    def _pos(rec, s):
        return float(np.polyval(rec["coef"], s))

    def to_data(self, x, y):
        """Local interpolation between neighbouring gridlines."""
        xv = yv = None
        for _ in range(3):
            xs = np.array([self._pos(r, y) for r in self.v])
            vals = np.array([r["value"] for r in self.v])
            xv = _interp_lines(x, xs, vals)
            ys = np.array([self._pos(r, x) for r in self.h])
            hv = np.array([r["value"] for r in self.h])
            yv = _interp_lines(y, ys, hv)
        return xv, yv

    def to_pixel(self, xval, yval, x0=None, y0=None):
        """Inverse of to_data by fixed-point iteration."""
        vals = np.array([r["value"] for r in self.v])
        hv = np.array([r["value"] for r in self.h])
        y = y0 if y0 is not None else np.mean([self._pos(r, 0) for r in self.h])
        x = x0 if x0 is not None else np.mean([self._pos(r, 0) for r in self.v])
        for _ in range(6):
            xs = np.array([self._pos(r, y) for r in self.v])
            x = _interp_lines(xval, vals, xs)
            ys = np.array([self._pos(r, x) for r in self.h])
            y = _interp_lines(yval, hv, ys)
        return x, y

    def intersections(self):
        pts = []
        for rv in self.v:
            for rh in self.h:
                # solve x = fv(y), y = fh(x)
                x = self._pos(rv, 0.0)
                y = self._pos(rh, x)
                for _ in range(8):
                    x = self._pos(rv, y)
                    y = self._pos(rh, x)
                pts.append((x, y, rv["value"], rh["value"]))
        return np.array(pts)

    def global_fits(self):
        P = self.intersections()
        x, y, X, Y = P.T
        A = np.c_[np.ones_like(x), x, y]
        cX, *_ = np.linalg.lstsq(A, X, rcond=None)
        cY, *_ = np.linalg.lstsq(A, Y, rcond=None)
        rX = X - A @ cX
        rY = Y - A @ cY
        # projective: X = (a0 + a1 x + a2 y)/(1 + c1 x + c2 y), linearised
        B = np.c_[np.ones_like(x), x, y, -X * x, -X * y]
        pX, *_ = np.linalg.lstsq(B, X, rcond=None)
        prX = X - (pX[0] + pX[1] * x + pX[2] * y) / (1 + pX[3] * x + pX[4] * y)
        Bv = np.c_[np.ones_like(x), x, y, -Y * x, -Y * y]
        pY, *_ = np.linalg.lstsq(Bv, Y, rcond=None)
        prY = Y - (pY[0] + pY[1] * x + pY[2] * y) / (1 + pY[3] * x + pY[4] * y)
        return dict(
            n_intersections=int(len(x)),
            affine_X=cX.tolist(), affine_Y=cY.tolist(),
            affine_rms_X=float(np.sqrt(np.mean(rX ** 2))), affine_max_X=float(np.max(np.abs(rX))),
            affine_rms_Y=float(np.sqrt(np.mean(rY ** 2))), affine_max_Y=float(np.max(np.abs(rY))),
            proj_rms_X=float(np.sqrt(np.mean(prX ** 2))), proj_max_X=float(np.max(np.abs(prX))),
            proj_rms_Y=float(np.sqrt(np.mean(prY ** 2))), proj_max_Y=float(np.max(np.abs(prY))),
        )

    def dump(self, path, extra=None):
        out = dict(vertical=self.v, horizontal=self.h, global_fit=self.global_fits())
        if extra:
            out.update(extra)
        with open(path, "w") as f:
            json.dump(out, f, indent=1)
        return out


def _interp_lines(p, pos, vals):
    """Linear interpolation of value at coordinate p between gridline positions
    (positions need not be increasing in value order; they are sorted here)."""
    order = np.argsort(pos)
    pos = np.asarray(pos)[order]
    vals = np.asarray(vals)[order]
    if p <= pos[0]:
        i = 0
    elif p >= pos[-1]:
        i = len(pos) - 2
    else:
        i = int(np.searchsorted(pos, p)) - 1
    t = (p - pos[i]) / (pos[i + 1] - pos[i])
    return float(vals[i] + t * (vals[i + 1] - vals[i]))
