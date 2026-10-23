"""Local grid calibration from gridline intersections.

Every gridline is sampled along its whole length (darkness centroid in short
strips across the line). The intersection of vertical line k with horizontal
line j is found from straight-line fits to each line's samples within a
window of +-`half` pixels of the crossing (crossing itself excluded), with
iterative outlier rejection. A data value for any pixel is then obtained by
inverse bilinear interpolation inside the grid cell that contains it, from the
cell's four measured corner intersections. Global distortions of the sheet
(bow, skew, rotation, uneven cell size) are absorbed cell by cell.

Quality reports:
- per line: rms of samples about a single global straight line, and about a
  quadratic;
- global affine and projective fits through all intersections (how far the
  sheet is from a perfect affine grid);
- leave-one-out: each interior intersection predicted from its four
  diagonal-free neighbours (mean of left/right and up/down linear
  predictions) compared with the measured one.
"""
import json
import numpy as np


def sample_line(d, orient, nominal, s0, s1, strip=20, step=10, win=8, cw=4,
                min_peak=35.0, exclude=None, track=True):
    """Centroid samples (s, pos) along one gridline.

    exclude: list of (a0, a1, b0, b1) boxes (x0, x1, y0, y1) to skip.
    track: let the search window follow the line (for skewed lines).
    """
    out = []
    pred = float(nominal)
    for s in range(int(s0), int(s1) - strip + 1, step):
        sc = s + strip / 2.0
        if exclude:
            skip = False
            for (x0, x1, y0, y1) in exclude:
                px, py = (pred, sc) if orient == "v" else (sc, pred)
                if x0 <= px <= x1 and y0 <= py <= y1:
                    skip = True
                    break
            if skip:
                continue
        a = int(round(pred)) - win
        b = int(round(pred)) + win + 1
        if orient == "v":
            prof = d[s:s + strip, a:b].mean(axis=0)
        else:
            prof = d[a:b, s:s + strip].mean(axis=1)
        base = np.median(np.r_[prof[:3], prof[-3:]])
        p = prof - base
        i = int(np.argmax(p))
        if p[i] < min_peak:
            continue
        lo, hi = max(0, i - cw), min(len(p), i + cw + 1)
        w = np.clip(p[lo:hi], 0, None)
        c = (np.arange(lo, hi) * w).sum() / w.sum()
        pos = a + c
        out.append((sc, pos))
        if track and abs(pos - pred) < 3:
            pred = 0.8 * pred + 0.2 * pos
    return np.array(out) if out else np.zeros((0, 2))


def robust_line(s, v, deg=1, clip=1.2, iters=10):
    keep = np.ones(len(s), bool)
    coef = np.polyfit(s, v, deg)
    for _ in range(iters):
        if keep.sum() < deg + 3:
            break
        coef = np.polyfit(s[keep], v[keep], deg)
        r = v - np.polyval(coef, s)
        sig = 1.4826 * np.median(np.abs(r[keep]))
        new = np.abs(r) < max(clip, 3 * sig)
        if (new == keep).all():
            break
        keep = new
    r = v - np.polyval(coef, s)
    return coef, keep, r


class LocalGrid:
    def __init__(self, vvals, hvals, vsamples, hsamples, half=200, gap=10):
        self.vvals = list(vvals)
        self.hvals = list(hvals)
        self.vs = vsamples  # list of arrays (y, x)
        self.hs = hsamples  # list of arrays (x, y)
        self.half = half
        self.gap = gap
        nv, nh = len(vvals), len(hvals)
        self.X = np.full((nv, nh), np.nan)
        self.Y = np.full((nv, nh), np.nan)
        self.SE = np.full((nv, nh), np.nan)
        # global straight fits as starting points
        self.vfit = [robust_line(a[:, 0], a[:, 1])[0] if len(a) > 5 else None for a in self.vs]
        self.hfit = [robust_line(a[:, 0], a[:, 1])[0] if len(a) > 5 else None for a in self.hs]
        for k in range(nv):
            for j in range(nh):
                self._intersect(k, j)

    def _intersect(self, k, j):
        if self.vfit[k] is None or self.hfit[j] is None:
            return
        cv, ch = self.vfit[k], self.hfit[j]
        x = np.polyval(cv, 0.0)
        y = np.polyval(ch, x)
        for _ in range(6):
            x = np.polyval(cv, y)
            y = np.polyval(ch, x)
        a = self.vs[k]
        b = self.hs[j]
        # window grows (x2, x3) where lettering or a label box hides a line
        for f in (1, 2, 3):
            ma = (np.abs(a[:, 0] - y) < f * self.half) & (np.abs(a[:, 0] - y) > self.gap)
            mb = (np.abs(b[:, 0] - x) < f * self.half) & (np.abs(b[:, 0] - x) > self.gap)
            if ma.sum() >= 8 and mb.sum() >= 8:
                break
        if ma.sum() < 8 or mb.sum() < 8:
            return
        # require samples on both sides of the crossing for at least one line,
        # so that the crossing is interpolated rather than extrapolated far
        if not hasattr(self, "W"):
            self.W = np.zeros(self.X.shape, int)
        self.W[k, j] = f
        lv, kv, rv = robust_line(a[ma, 0], a[ma, 1])
        lh, kh, rh = robust_line(b[mb, 0], b[mb, 1])
        if kv.sum() < 6 or kh.sum() < 6:
            return
        for _ in range(6):
            x = np.polyval(lv, y)
            y = np.polyval(lh, x)
        sev = np.std(rv[kv]) / np.sqrt(kv.sum())
        seh = np.std(rh[kh]) / np.sqrt(kh.sum())
        self.X[k, j] = x
        self.Y[k, j] = y
        self.SE[k, j] = np.hypot(sev, seh)

    # ---------- conversion ----------
    def _cell(self, x, y):
        """Find cell (k, j) whose corners bracket (x, y)."""
        nv, nh = self.X.shape
        if not hasattr(self, "_aff"):
            m = ~np.isnan(self.X)
            kk, jj = np.where(m)
            A = np.c_[np.ones(m.sum()), self.X[m], self.Y[m]]
            self._aff = (np.linalg.lstsq(A, kk.astype(float), rcond=None)[0],
                         np.linalg.lstsq(A, jj.astype(float), rcond=None)[0])
        k0 = int(np.floor(self._aff[0] @ [1, x, y]))
        j0 = int(np.floor(self._aff[1] @ [1, x, y]))
        best = None
        for k in range(max(0, k0 - 2), min(nv - 1, k0 + 3)):
            for j in range(max(0, j0 - 2), min(nh - 1, j0 + 3)):
                c = [(self.X[k, j], self.Y[k, j]), (self.X[k + 1, j], self.Y[k + 1, j]),
                     (self.X[k + 1, j + 1], self.Y[k + 1, j + 1]), (self.X[k, j + 1], self.Y[k, j + 1])]
                if any(np.isnan(v) for p in c for v in p):
                    continue
                u, w = self._inv_bilinear(k, j, x, y)
                if -1e-6 <= u <= 1 + 1e-6 and -1e-6 <= w <= 1 + 1e-6:
                    return k, j, u, w
                dist = max(0, -u, u - 1) + max(0, -w, w - 1)
                if best is None or dist < best[0]:
                    best = (dist, k, j, u, w)
        return best[1:]

    def _inv_bilinear(self, k, j, x, y):
        P00 = np.array([self.X[k, j], self.Y[k, j]])
        P10 = np.array([self.X[k + 1, j], self.Y[k + 1, j]])
        P01 = np.array([self.X[k, j + 1], self.Y[k, j + 1]])
        P11 = np.array([self.X[k + 1, j + 1], self.Y[k + 1, j + 1]])
        u, w = 0.5, 0.5
        t = np.array([x, y])
        for _ in range(20):
            P = (1 - u) * (1 - w) * P00 + u * (1 - w) * P10 + (1 - u) * w * P01 + u * w * P11
            du = -(1 - w) * P00 + (1 - w) * P10 - w * P01 + w * P11
            dw = -(1 - u) * P00 - u * P10 + (1 - u) * P01 + u * P11
            J = np.c_[du, dw]
            step = np.linalg.solve(J, t - P)
            u += step[0]
            w += step[1]
            if np.abs(step).max() < 1e-9:
                break
        return u, w

    def to_data(self, x, y):
        k, j, u, w = self._cell(x, y)
        xv = self.vvals[k] + u * (self.vvals[k + 1] - self.vvals[k])
        yv = self.hvals[j] + w * (self.hvals[j + 1] - self.hvals[j])
        return xv, yv

    def to_pixel(self, xv, yv):
        vv = np.array(self.vvals)
        hv = np.array(self.hvals)
        k = int(np.clip(np.searchsorted(vv, xv) - 1, 0, len(vv) - 2))
        j = int(np.clip(np.searchsorted(hv, yv) - 1, 0, len(hv) - 2))
        u = (xv - vv[k]) / (vv[k + 1] - vv[k])
        w = (yv - hv[j]) / (hv[j + 1] - hv[j])
        P = lambda a, b: np.array([self.X[a, b], self.Y[a, b]])  # noqa: E731
        p = ((1 - u) * (1 - w) * P(k, j) + u * (1 - w) * P(k + 1, j)
             + (1 - u) * w * P(k, j + 1) + u * w * P(k + 1, j + 1))
        return float(p[0]), float(p[1])

    # ---------- reports ----------
    def report(self):
        rep = {"lines": []}
        for name, vals, smp in (("v", self.vvals, self.vs), ("h", self.hvals, self.hs)):
            for val, a in zip(vals, smp):
                if len(a) < 6:
                    rep["lines"].append(dict(orient=name, value=val, n=int(len(a))))
                    continue
                c1, k1, r1 = robust_line(a[:, 0], a[:, 1], 1)
                c2, k2, r2 = robust_line(a[:, 0], a[:, 1], 2)
                rep["lines"].append(dict(orient=name, value=val, n=int(k1.sum()), rejected=int((~k1).sum()),
                                         slope=float(c1[0]), rms_line=float(np.sqrt(np.mean(r1[k1] ** 2))),
                                         max_line=float(np.abs(r1[k1]).max()),
                                         rms_quad=float(np.sqrt(np.mean(r2[k2] ** 2)))))
        m = ~np.isnan(self.X)
        kk, jj = np.where(m)
        x, y = self.X[m], self.Y[m]
        V = np.array(self.vvals)[kk]
        H = np.array(self.hvals)[jj]
        A = np.c_[np.ones_like(x), x, y]
        cV, *_ = np.linalg.lstsq(A, V, rcond=None)
        cH, *_ = np.linalg.lstsq(A, H, rcond=None)
        rV, rH = V - A @ cV, H - A @ cH
        B = np.c_[np.ones_like(x), x, y, -V * x, -V * y]
        pV, *_ = np.linalg.lstsq(B, V, rcond=None)
        prV = V - (pV[0] + pV[1] * x + pV[2] * y) / (1 + pV[3] * x + pV[4] * y)
        B = np.c_[np.ones_like(x), x, y, -H * x, -H * y]
        pH, *_ = np.linalg.lstsq(B, H, rcond=None)
        prH = H - (pH[0] + pH[1] * x + pH[2] * y) / (1 + pH[3] * x + pH[4] * y)
        # rotation and skew from the affine fit (pixel per unit)
        rep["global"] = dict(n=int(m.sum()), affine_x=cV.tolist(), affine_y=cH.tolist(),
                             affine_rms_x=float(np.sqrt(np.mean(rV ** 2))), affine_max_x=float(np.abs(rV).max()),
                             affine_rms_y=float(np.sqrt(np.mean(rH ** 2))), affine_max_y=float(np.abs(rH).max()),
                             proj_rms_x=float(np.sqrt(np.mean(prV ** 2))), proj_max_x=float(np.abs(prV).max()),
                             proj_rms_y=float(np.sqrt(np.mean(prH ** 2))), proj_max_y=float(np.abs(prH).max()))
        # leave-one-out
        loo = []
        nv, nh = self.X.shape
        for k in range(1, nv - 1):
            for j in range(1, nh - 1):
                q = [self.X[k - 1, j], self.X[k + 1, j], self.X[k, j - 1], self.X[k, j + 1], self.X[k, j]]
                if any(np.isnan(q)):
                    continue
                px = 0.25 * (self.X[k - 1, j] + self.X[k + 1, j] + self.X[k, j - 1] + self.X[k, j + 1])
                py = 0.25 * (self.Y[k - 1, j] + self.Y[k + 1, j] + self.Y[k, j - 1] + self.Y[k, j + 1])
                loo.append((self.X[k, j] - px, self.Y[k, j] - py))
        loo = np.array(loo)
        rep["leave_one_out_px"] = dict(n=int(len(loo)), rms_x=float(np.sqrt(np.mean(loo[:, 0] ** 2))),
                                       rms_y=float(np.sqrt(np.mean(loo[:, 1] ** 2))),
                                       max_x=float(np.abs(loo[:, 0]).max()), max_y=float(np.abs(loo[:, 1]).max()))
        se = self.SE[m]
        rep["intersection_se_px"] = dict(median=float(np.median(se)), max=float(np.max(se)))
        return rep

    def dump(self, path, extra=None):
        rep = self.report()
        rep["vvals"] = self.vvals
        rep["hvals"] = self.hvals
        rep["X"] = np.where(np.isnan(self.X), None, self.X).tolist()
        rep["Y"] = np.where(np.isnan(self.Y), None, self.Y).tolist()
        if extra:
            rep.update(extra)
        with open(path, "w") as f:
            json.dump(rep, f, indent=1)
        return rep

    def vline(self, k):
        """Callable y -> x for vertical gridline k (piecewise linear through
        its measured intersections, linear extrapolation at the ends)."""
        m = ~np.isnan(self.X[k])
        ys, xs = self.Y[k][m], self.X[k][m]
        o = np.argsort(ys)
        ys, xs = ys[o], xs[o]

        def f(y):
            y = np.asarray(y, float)
            r = np.interp(y, ys, xs)
            lo, hi = y < ys[0], y > ys[-1]
            r = np.where(lo, xs[0] + (y - ys[0]) * (xs[1] - xs[0]) / (ys[1] - ys[0]), r)
            r = np.where(hi, xs[-1] + (y - ys[-1]) * (xs[-1] - xs[-2]) / (ys[-1] - ys[-2]), r)
            return r
        return f

    def hline(self, j):
        """Callable x -> y for horizontal gridline j."""
        m = ~np.isnan(self.X[:, j])
        xs, ys = self.X[:, j][m], self.Y[:, j][m]
        o = np.argsort(xs)
        xs, ys = xs[o], ys[o]

        def f(x):
            x = np.asarray(x, float)
            r = np.interp(x, xs, ys)
            lo, hi = x < xs[0], x > xs[-1]
            r = np.where(lo, ys[0] + (x - xs[0]) * (ys[1] - ys[0]) / (xs[1] - xs[0]), r)
            r = np.where(hi, ys[-1] + (x - xs[-1]) * (ys[-1] - ys[-2]) / (xs[-1] - xs[-2]), r)
            return r
        return f

    @classmethod
    def load(cls, path):
        with open(path) as f:
            rep = json.load(f)
        g = cls.__new__(cls)
        g.vvals, g.hvals = rep["vvals"], rep["hvals"]
        g.X = np.array([[np.nan if v is None else v for v in row] for row in rep["X"]])
        g.Y = np.array([[np.nan if v is None else v for v in row] for row in rep["Y"]])
        # a tick calibration (tick_calib.py) has virtual lines; only the ones listed here are ink
        g.mask_lines = rep.get("mask_lines")
        return g

    def is_ink(self, orient, idx):
        """True if line idx ("v" or "h") is drawn on the page (all are, unless the calibration lists
        which ones are)."""
        ml = getattr(self, "mask_lines", None)
        return ml is None or [orient, idx] in [list(m) for m in ml]
