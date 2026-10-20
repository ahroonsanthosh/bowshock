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
                 frac_v=0.5, frac_h=0.5, thr=0.55, half=6, extra_v=(), extra_h=(), name="", grid_thr=0.55, longruns=False, skews=(None, None)):
        self.name = name
        self.png = dig.render(pdf, page, work)
        self.box = box
        self.a = dig.load(self.png, box)
        self.m = dig.dark(self.a, thr)
        self.vf, self.hf = dig.grid_from_box(dig.dark(self.a, grid_thr), frac_v, frac_h, half=half,
                                           longruns=longruns, skews=skews)
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
        self.clean = dig.remove_lines(self.m, [vsort[i] for i in xsel], [hsort[i] for i in ysel])

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
        """Locate a symbol near local (X0, Y0) by outline-template correlation,
        trying half-sizes r-4..r+4 px and keeping the largest that scores at
        least 0.92 of the best; the centre is the
        template's (sub-pixel) peak, which for these symmetric outlines is
        the bounding-box centre (circles, squares, diamonds) and, for the
        triangle template, the point one third of the height above the base.
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
        cy, cx = int(Y0) - y0, int(X0) - x0
        cands = []
        for rr in np.arange(max(4.0, r - 4), r + 4.5, 1.0):
            if shape in ("triangle", "triangle_down"):
                tpl = tri_template(rr, t, down=(shape == "triangle_down"))
            else:
                tpl = dig.ring_template(rr, t, shape)
            sc = dig.correlate(sub, tpl)
            win = np.full(sc.shape, -1.0)
            ys0, xs0 = max(0, cy - search), max(0, cx - search)
            win[ys0:cy + search + 1, xs0:cx + search + 1] = sc[ys0:cy + search + 1, xs0:cx + search + 1]
            iy, ix = np.unravel_index(np.argmax(win), win.shape)
            score = float(win[iy, ix])
            cands.append((score, rr, iy, ix, sc))
        top = max(c[0] for c in cands)
        # the largest size that fits nearly as well as the best: the outer
        # outline rather than a smaller figure inside a thick stroke
        score, rr, iy, ix, sc = max((c for c in cands if c[0] >= 0.92 * top), key=lambda c: c[1])
        # sub-pixel peak (parabola through the neighbours on each axis)
        def para(a, b, c):
            d = a - 2 * b + c
            return 0.0 if d >= 0 else 0.5 * (a - c) / d
        fx = para(sc[iy, ix - 1], sc[iy, ix], sc[iy, ix + 1]) if 0 < ix < sc.shape[1] - 1 else 0.0
        fy = para(sc[iy - 1, ix], sc[iy, ix], sc[iy + 1, ix]) if 0 < iy < sc.shape[0] - 1 else 0.0
        Xc = ix + fx + x0
        Yc = iy + fy + y0
        x, y = self.data(Xc, Yc)
        size = int(round(2 * rr + t))
        return dict(X=float(Xc), Y=float(Yc), x=x, y=y, w=size, h=size, r=float(rr), score=score)

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


SCRATCH = "/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/r6b"


def from_spec(spec):
    """spec["ntrs"]: NTRS citation id; the PDF is read from <dl>/<id>/<id>.pdf
    and pages rendered into <work>/<id> (R6_DL, R6_WORK, defaulting to the
    reader's scratch directories)."""
    bx = spec["box"]
    if "ntrs" in spec:
        dl = os.environ.get("R6_DL", SCRATCH + "/dl")
        wk = os.environ.get("R6_WORK", SCRATCH + "/work")
        spec["pdf"] = f"{dl}/{spec['ntrs']}/{spec['ntrs']}.pdf"
        spec["work"] = f"{wk}/{spec['ntrs']}"
    return Fig(spec["pdf"], spec["page"], spec["work"], tuple(bx), spec["xsel"], spec["xvals"], spec["ysel"],
               spec["yvals"], xlog=spec.get("xlog", False), ylog=spec.get("ylog", False),
               frac_v=spec.get("frac_v", 0.5), frac_h=spec.get("frac_h", 0.5), thr=spec.get("thr", 0.55),
               name=spec.get("name", ""), grid_thr=spec.get("grid_thr", 0.55),
               longruns=spec.get("longruns", False),
               skews=(spec.get("skew_v"), spec.get("skew_h")))


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
