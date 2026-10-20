"""A figure being read: calibration from gridlines, cleaned mask, curve
tracking and symbol centroids in data units, overlays for checking.

Every reading script builds one Fig per plot panel:

    f = Fig(pdf, page, work, box, xsel, xvals, ysel, yvals)

box: the plot panel (page px at 600 dpi), a little larger than its frame.
xsel/ysel: indices (into the detected vertical/horizontal lines, left to
right and top to bottom) of the lines whose values are given in xvals/yvals.
Lines not selected are ignored for calibration (but still removed from the
mask). At least two labelled lines per axis; normally every gridline is used,
its value counted from the labels.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import dig  # noqa: E402


class Fig:
    def __init__(self, pdf, page, work, box, xsel, xvals, ysel, yvals, xlog=False, ylog=False,
                 frac_v=0.5, frac_h=0.5, thr=0.55, half=6, extra_v=(), extra_h=(), name=""):
        self.name = name
        self.png = dig.render(pdf, page, work)
        self.box = box
        self.a = dig.load(self.png, box)
        self.m = dig.dark(self.a, thr)
        self.vf, self.hf = dig.grid_from_box(self.m, frac_v, frac_h, half=half)
        self.vf += [tuple(v) for v in extra_v]
        self.hf += [tuple(h) for h in extra_h]
        vsort = sorted(self.vf, key=lambda L: L[0])
        hsort = sorted(self.hf, key=lambda L: L[0])
        self.vsort, self.hsort = vsort, hsort
        if xsel == "all":
            xsel = list(range(len(vsort)))
        if ysel == "all":
            ysel = list(range(len(hsort)))
        if len(xsel) != len(xvals) or len(ysel) != len(yvals):
            raise ValueError(f"{name}: {len(vsort)} v-lines, {len(hsort)} h-lines; "
                             f"sel {len(xsel)}/{len(xvals)} {len(ysel)}/{len(yvals)}")
        xv = np.log10(xvals) if xlog else np.asarray(xvals, float)
        yv = np.log10(yvals) if ylog else np.asarray(yvals, float)
        self.ax = dig.Axis([(vsort[i][0], vsort[i][1]) for i in xsel], xv, log=xlog, name="x")
        self.ay = dig.Axis([(hsort[i][0], hsort[i][1]) for i in ysel], yv, log=ylog, name="y")
        self.xlog, self.ylog = xlog, ylog
        self.xline_rms = [vsort[i][2] for i in xsel]
        self.yline_rms = [hsort[i][2] for i in ysel]
        self.thick = float(np.nanmedian([L[3] for L in vsort + hsort])) if (vsort or hsort) else 4.0
        self.clean = dig.remove_lines(self.m, vsort, hsort)

    # -------- coordinates (local = box pixels)
    def data(self, X, Y):
        """local px -> data values"""
        return self.ax.value(X, Y), self.ay.value(Y, X)

    def px(self, xv, yv):
        """data values -> local px"""
        X = self.ax.pixel(xv, 0.0)
        Y = self.ay.pixel(yv, X)
        for _ in range(4):
            X = self.ax.pixel(xv, Y)
            Y = self.ay.pixel(yv, X)
        return X, Y

    def units_per_px(self):
        """(dx per px, dy per px) in data units (log10 units if log)."""
        return self.ax.per_px(), self.ay.per_px()

    def cal_report(self):
        rx = self.ax.linfit_resid()
        ry = self.ay.linfit_resid()
        ux, uy = self.units_per_px()
        return dict(nx=len(self.ax.vals), ny=len(self.ay.vals), x_per_px=ux, y_per_px=uy,
                    x_lin_rms=rx[0], x_lin_max=rx[1], y_lin_rms=ry[0], y_lin_max=ry[1],
                    x_line_rms_px=float(np.nanmedian(self.xline_rms)),
                    y_line_rms_px=float(np.nanmedian(self.yline_rms)), thick_px=self.thick)

    # -------- curves
    def track(self, seed, x_lo, x_hi, mask=None, orient="cols", **kw):
        """seed (X, Y) local px; tracks to both ends; returns local px points
        (X, Y, run). orient='rows' scans rows instead (for steep curves):
        x_lo, x_hi are then the Y limits."""
        mm = self.clean if mask is None else mask
        if orient == "rows":
            pts = dig.track_both(mm.T, int(seed[1]), seed[0], int(x_lo), int(x_hi), **kw)
            return sorted([(p[1], p[0], p[2]) for p in pts])
        return dig.track_both(mm, int(seed[0]), seed[1], int(x_lo), int(x_hi), **kw)

    def curve_data(self, pts):
        out = []
        for X, Y, ln in pts:
            x, y = self.data(X, Y)
            out.append((x, y, X, Y, ln))
        return out

    def read_at(self, cd, xq, half_px=8):
        """Value of a tracked curve at data abscissa xq: local linear fit in
        data space over the points within +-half_px pixels. Returns
        (y, err_trace, n, X, Y) with err_trace the rms scatter about the fit
        (data units) and X, Y the local px of the reading."""
        if not cd:
            return (float("nan"),) * 2 + (0, float("nan"), float("nan"))
        xs = np.array([c[0] for c in cd])
        ys = np.array([c[1] for c in cd])
        Xs = np.array([c[2] for c in cd])
        ux = self.ax.per_px()
        xt = np.log10(xs) if self.xlog else xs
        xqt = np.log10(xq) if self.xlog else xq
        yt = np.log10(ys) if self.ylog else ys
        sel = np.abs(xt - xqt) <= half_px * ux
        if sel.sum() < 4:
            return (float("nan"),) * 2 + (int(sel.sum()), float("nan"), float("nan"))
        k = np.polyfit(xt[sel], yt[sel], 1)
        r = yt[sel] - np.polyval(k, xt[sel])
        yq = float(np.polyval(k, xqt))
        y = 10 ** yq if self.ylog else yq
        X, Y = self.px(xq, y)
        return y, float(np.sqrt(np.mean(r ** 2))), int(sel.sum()), X, Y

    def has_ink_near(self, X, Y, rad=4):
        X, Y = int(round(X)), int(round(Y))
        sub = self.m[max(0, Y - rad):Y + rad + 1, max(0, X - rad):X + rad + 1]
        return bool(sub.any())

    # -------- symbols
    def symbol(self, X0, Y0, r, shape="circle", search=20, stroke=None, mask=None):
        """Locate a symbol of half-size r (px) near local (X0, Y0) by template
        correlation, then take its bounding box within the template's extent.
        shape: circle, square, diamond (bbox centre), triangle (apex up) or
        triangle_down: centre at one third of the height from the base.
        Returns dict with X, Y (local px), x, y (data), bbox, score."""
        mm = self.m if mask is None else mask
        t = stroke if stroke is not None else max(3.0, self.thick)
        R = int(r + t + search + 4)
        y0 = max(0, int(Y0) - R)
        x0 = max(0, int(X0) - R)
        sub = mm[y0:int(Y0) + R + 1, x0:int(X0) + R + 1]
        if shape in ("triangle", "triangle_down"):
            tpl = tri_template(r, t, down=(shape == "triangle_down"))
        else:
            tpl = dig.ring_template(r, t, shape)
        sc = dig.correlate(sub, tpl)
        # restrict to the search window
        cy, cx = int(Y0) - y0, int(X0) - x0
        win = np.zeros_like(sc, dtype=bool)
        win[max(0, cy - search):cy + search + 1, max(0, cx - search):cx + search + 1] = True
        sc2 = np.where(win, sc, -1)
        iy, ix = np.unravel_index(np.argmax(sc2), sc2.shape)
        score = float(sc2[iy, ix])
        # refine: bounding box of dark pixels on the template ring (dilated)
        Rt = tpl.shape[0] // 2
        yy, xx = np.mgrid[-Rt:Rt + 1, -Rt:Rt + 1]
        ring = dilate(tpl, 2)
        py0, px0 = iy - Rt, ix - Rt
        ok = []
        for (dy, dx) in zip(yy[ring], xx[ring]):
            Y = iy + dy
            X = ix + dx
            if 0 <= Y < sub.shape[0] and 0 <= X < sub.shape[1] and sub[Y, X]:
                ok.append((Y, X))
        if not ok:
            return None
        oy = np.array([o[0] for o in ok])
        ox = np.array([o[1] for o in ok])
        bx0, bx1 = ox.min(), ox.max()
        by0, by1 = oy.min(), oy.max()
        Xc = 0.5 * (bx0 + bx1) + x0
        if shape == "triangle":
            Yc = by1 - (by1 - by0) / 3.0 + y0
        elif shape == "triangle_down":
            Yc = by0 + (by1 - by0) / 3.0 + y0
        else:
            Yc = 0.5 * (by0 + by1) + y0
        x, y = self.data(Xc, Yc)
        return dict(X=float(Xc), Y=float(Yc), x=x, y=y, w=int(bx1 - bx0 + 1), h=int(by1 - by0 + 1),
                    tx=float(ix + x0), ty=float(iy + y0), score=score)

    def overlay(self, path, marks=(), scale=0.35, box=None, curves=()):
        """marks: (X, Y, colour, radius) local px; curves: list of (pts, colour)."""
        a = self.a
        ox = oy = 0
        if box is not None:
            ox, oy = box[0], box[1]
            a = a[box[1]:box[3], box[0]:box[2]]
        ms = [(X - ox, Y - oy, c, r) for X, Y, c, r in marks]
        ls = []
        for pts, c in curves:
            for p, q in zip(pts[:-1], pts[1:]):
                if abs(q[0] - p[0]) <= 3:
                    ls.append(((p[0] - ox, p[1] - oy, q[0] - ox, q[1] - oy), c))
        return dig.save_view(a, path, scale=scale, marks=ms, lines=ls)


def dilate(b, k):
    out = b.copy()
    for _ in range(k):
        o = out.copy()
        o[1:, :] |= out[:-1, :]
        o[:-1, :] |= out[1:, :]
        o[:, 1:] |= out[:, :-1]
        o[:, :-1] |= out[:, 1:]
        out = o
    return out


def tri_template(r, t, down=False):
    """Equilateral triangle outline, half-width r; origin at the centroid
    (one third of the height above the base)."""
    h = r * np.sqrt(3.0)
    R = int(np.ceil(h + t + 2))
    yy, xx = np.mgrid[-R:R + 1, -R:R + 1].astype(float)
    if down:
        yy = -yy
    # base at y = +h/3 (below centroid, image y down), apex at y = -2h/3
    yb = h / 3.0
    ya = -2.0 * h / 3.0
    # distance to the three sides
    d_base = np.abs(yy - yb)
    in_base = (np.abs(xx) <= r) & (d_base <= t / 2)
    # sides: from apex (0, ya) to (+-r, yb)
    out = in_base.copy()
    for sgn in (-1, 1):
        x1, y1, x2, y2 = 0.0, ya, sgn * r, yb
        L = np.hypot(x2 - x1, y2 - y1)
        d = np.abs((y2 - y1) * xx - (x2 - x1) * yy + x2 * y1 - y2 * x1) / L
        tpar = ((xx - x1) * (x2 - x1) + (yy - y1) * (y2 - y1)) / L ** 2
        out |= (d <= t / 2) & (tpar >= 0) & (tpar <= 1)
    return out


def fmt(v, nd=4):
    return "" if v is None or (isinstance(v, float) and not np.isfinite(v)) else f"{v:.{nd}f}"


def write_csv(path, header, rows):
    with open(path, "w") as fh:
        fh.write(",".join(header) + "\n")
        for r in rows:
            fh.write(",".join(str(c) for c in r) + "\n")
