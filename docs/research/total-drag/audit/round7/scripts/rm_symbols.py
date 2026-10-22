"""Locate data symbols in panel (d) of NACA RM L52J21a figs. 31 to 33.

usage: python3 -I rm_symbols.py FIG PAGE.png CALIB.json OUT.json

Every symbol in the Reynolds-number range of interest is listed below with its
shape (as identified by eye on zoomed crops against the figure's legend) and
an approximate centre picked by eye. The centre is then measured from the
outline on the binary scan (dark = gray < 128), with pixels within 4 px of a
fitted gridline centre ignored:

  square   each side is located as the darkness centroid of the strongest
           column (row) profile peak near its expected position; the centre
           is the midpoint of opposite sides. A side lying on a gridline
           cannot be located; then the opposite side plus the median side
           length of the squares of that figure is used (flagged).
  circle   algebraic (Kasa) circle fit to the dark pixels in an annulus
           around the approximate centre, iterated with outlier rejection;
           pixels of the connecting fairing line are rejected as outliers.
  triangle straight lines are fitted to the centres of the left and right
           sides (row by row) and the base is located from the row profile;
           the vertices are their intersections and the centre reported is
           the centroid of the three vertices.

A centre dot is looked for inside each outline (a small dark blob, not
connected to the outline, within 9 px of the outline centre); when found
its centroid is reported too. Overlapping symbols are measured with windows
chosen to exclude the other symbol where possible; what could not be
separated is flagged in the notes.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import localgrid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

# id, shape, approx x, approx y, half window, options
SYMBOLS = {
    31: [
        ("31-T1", "triangle", 3131, 3619, 30, {"apex": (3132.5, 3596), "base": 3631, "nodot": True,
                                               "note": "two fairing lines cross the interior; no centre dot visible"}),
        ("31-S1", "square", 3185, 3619, 30, {}),
        ("31-T2", "triangle", 3240, 3627, 30, {"apex": (3235, 3602), "base": 3639.5, "nodot": True,
                                               "note": "R = 8 gridline runs through the apex; no centre dot visible"}),
        ("31-S2", "square", 3339, 3628, 30, {"note": "right side within 3 px of the R = 9 gridline"}),
        ("31-C1", "circle", 3111, 3711, 30, {"r": 23.5}),
        ("31-C2", "circle", 3239, 3724, 30, {"r": 23.5, "dot": (3238.5, 3725.0),
                                             "note": "centre dot touches the R = 8 gridline; dot centre read "
                                                     "from its free right edge and height (pixel map)"}),
        ("31-C3", "circle", 3352, 3722, 30, {"r": 23.5}),
    ],
    32: [
        ("32-T1", "triangle", 3484, 3570, 30, {"manual_tri": dict(apex=(3484, 3543), H=41.0), "nodot": True,
                                               "stack": "32-A (R 7.3)", "conf": "high (apex free)",
                                               "note": "apex free; base hidden in the heavy fairing-line band; "
                                                       "centroid from apex and the figure's nominal height"}),
        ("32-SA", "square", 3498, 3578, 30, {"manual_sides": dict(left=3475, right=3521, top=3557.5, bottom=3599.5),
                                             "side": 43.0, "nodot": True, "stack": "32-A (R 7.3)",
                                             "conf": "medium (two square outlines superposed)",
                                             "note": "two square outlines share the left and right sides and are "
                                                     "offset vertically by about 10 px (top sides 3557.5 and about "
                                                     "3567, bottom sides 3599.5 and 3609.5): either two conical-nose "
                                                     "points or one redrawn square; this is the upper outline"}),
        ("32-SB", "square", 3498, 3588, 30, {"manual_sides": dict(left=3475, right=3521, top=None, bottom=3609.5),
                                             "side": 43.0, "nodot": True, "stack": "32-A (R 7.3)",
                                             "conf": "medium (two square outlines superposed)",
                                             "note": "lower of the two superposed square outlines; its top side "
                                                     "is hidden in the fairing-line band"}),
        ("32-S2", "square", 3593, 3580, 30, {"manual_sides": dict(left=3573, right=3614, top=3558.5, bottom=3602.5),
                                             "nodot": True, "stack": "32-B (R 8.0)",
                                             "note": "R = 8 gridline and the triangle's left side cross the interior"}),
        ("32-T2", "triangle", 3612, 3573, 30, {"manual_tri": dict(apex=(3612, 3546), base=3586.5), "nodot": True,
                                               "stack": "32-B (R 8.0)",
                                               "note": "apex free above the square; base merged with the fairing "
                                                       "line to the right"}),
        ("32-S3", "square", 3730, 3581, 30, {"manual_sides": dict(left=3709, right=3751, top=3559.5, bottom=3602.5),
                                             "nodot": True, "stack": "32-C (R 9.0)",
                                             "note": "R = 9 gridline crosses the interior"}),
        ("32-T3", "triangle", 3716, 3600, 30, {"manual_tri": dict(apex=(3716, 3572.5), base=3613.5, xc=3716),
                                               "apex_hidden": True, "nodot": True, "stack": "32-C (R 9.0)",
                                               "conf": "medium (apex hidden inside the square)",
                                               "note": "base and lower sides free below the square; apex hidden, "
                                                       "placed from the nominal height 41 px"}),
        ("32-C1", "circle", 3503, 3660, 30, {"r": 24.0, "nodot": True,
                                             "note": "centre dot merged with the fairing line through the circle; outline centre used"}),
        ("32-C2", "circle", 3614, 3660, 30, {"r": 24.0, "nodot": True,
                                             "note": "centre dot merged with the fairing line through the circle; outline centre used"}),
        ("32-C3", "circle", 3731, 3651, 30, {"r": 24.0, "nodot": True,
                                             "note": "centre dot merged with the fairing line through the circle; outline centre used"}),
    ],
    33: [
        ("33-SB", "square", 3100, 3496, 30, {"manual_sides": dict(left=3079, right=3121, top=None, bottom=3516.5),
                                             "side": 41.0, "nodot": True,
                                             "note": "centre on the R = 7, P_B = -0.12 gridline crossing; top side "
                                                     "merged with the incoming fairing line"}),
        ("33-TA", "triangle", 3110, 3472, 30, {"manual_tri": dict(apex=(3110, 3447), base=3485), "nodot": True,
                                               "note": "base overlaps the square's upper half"}),
        ("33-C1", "circle", 3132, 3530, 30, {"r": 24.0}),
        ("33-TC", "triangle", 3156, 3480, 30, {"manual_tri": dict(apex=(3156, 3454), H=38.75), "nodot": True,
                                               "note": "base hidden on the P_B = -0.12 gridline; centroid from "
                                                       "apex and nominal height"}),
        ("33-SD", "square", 3166, 3499, 30, {"manual_sides": dict(left=3146, right=3187, top=3479.5, bottom=3519.5),
                                             "dot": (3163.5, 3503.0)}),
        ("33-TE", "triangle", 3249, 3496, 30, {"manual_tri": dict(apex=(3249, 3470), base=3509.5), "nodot": True,
                                               "stack": "33-A (R 8.2)",
                                               "note": "apex free above the square; base is the full-width line "
                                                       "inside the square"}),
        ("33-SF", "square", 3244, 3500, 30, {"manual_sides": dict(left=3223, right=3264, top=3479.5, bottom=3519.5),
                                             "nodot": True, "stack": "33-A (R 8.2)",
                                             "note": "left side merged with the R = 8 gridline"}),
        ("33-C2", "circle", 3253, 3542, 30, {"r": 24.0, "note": "clear centre dot 7 px left of the fitted outline centre (outline R 8.12)"}),
    ],
}


def gridmask(g, box, hw=4.0):
    x0, x1, y0, y1 = box
    m = np.zeros((y1 - y0, x1 - x0), bool)
    ys = np.arange(y0, y1)
    xs = np.arange(x0, x1)
    for k in range(len(g.vvals)):
        f = g.vline(k)
        xc = f(ys)
        for yy, xx in zip(ys, xc):
            a, b = int(np.ceil(xx - hw)), int(np.floor(xx + hw))
            if b >= x0 and a < x1:
                m[yy - y0, max(a, x0) - x0:min(b, x1 - 1) - x0 + 1] = True
    for j in range(len(g.hvals)):
        f = g.hline(j)
        yc = f(xs)
        for xx, yy in zip(xs, yc):
            a, b = int(np.ceil(yy - hw)), int(np.floor(yy + hw))
            if b >= y0 and a < y1:
                m[max(a, y0) - y0:min(b, y1 - 1) - y0 + 1, xx - x0] = True
    return m


def peak_centroid(prof, lo, hi, cw=4):
    lo, hi = max(0, lo), min(len(prof), hi)
    if hi - lo < 3:
        return None, 0.0
    i = lo + int(np.argmax(prof[lo:hi]))
    a, b = max(0, i - cw), min(len(prof), i + cw + 1)
    w = prof[a:b]
    if w.sum() <= 0:
        return None, 0.0
    return float((np.arange(a, b) * w).sum() / w.sum()), float(prof[i])


def measure_square(B, M, cx, cy, side):
    """B: binary dark crop, M: gridline mask crop; (cx, cy) approx centre in crop."""
    h = side / 2.0
    Bm = np.where(M, 0, B).astype(float)
    valid = (~M).astype(float)
    rows = slice(int(cy - h + 7), int(cy + h - 6))
    cols = slice(int(cx - h + 7), int(cx + h - 6))
    colprof = Bm[rows, :].sum(axis=0) / np.maximum(valid[rows, :].sum(axis=0), 1)
    rowprof = Bm[:, cols].sum(axis=1) / np.maximum(valid[:, cols].sum(axis=1), 1)
    colvalid = valid[rows, :].mean(axis=0)
    rowvalid = valid[:, cols].mean(axis=1)
    res = {}
    for name, prof, vld, c in (("left", colprof, colvalid, cx - h), ("right", colprof, colvalid, cx + h),
                               ("top", rowprof, rowvalid, cy - h), ("bottom", rowprof, rowvalid, cy + h)):
        pos, pk = peak_centroid(prof, int(c - 7), int(c + 8))
        blocked = vld[max(0, int(c - 4)):int(c + 5)].min() < 0.5
        res[name] = (pos, pk, bool(blocked))
    return res


def kasa(xs, ys):
    A = np.c_[xs, ys, np.ones_like(xs)]
    b = xs ** 2 + ys ** 2
    c, *_ = np.linalg.lstsq(A, b, rcond=None)
    xc, yc = c[0] / 2, c[1] / 2
    r = np.sqrt(c[2] + xc ** 2 + yc ** 2)
    return xc, yc, r


def measure_circle(B, M, cx, cy, r0):
    yy, xx = np.nonzero(B & ~M)
    d = np.hypot(xx - cx, yy - cy)
    sel = np.abs(d - r0) < 9
    xs, ys = xx[sel].astype(float), yy[sel].astype(float)
    keep = np.ones(len(xs), bool)
    xc, yc, r = cx, cy, r0
    for _ in range(12):
        xc, yc, r = kasa(xs[keep], ys[keep])
        res = np.hypot(xs - xc, ys - yc) - r
        new = np.abs(res) < 4.0
        if (new == keep).all():
            break
        keep = new
    res = np.hypot(xs[keep] - xc, ys[keep] - yc) - r
    # angular coverage of kept points
    ang = np.degrees(np.arctan2(ys[keep] - yc, xs[keep] - xc))
    cov = len(np.unique((ang // 15).astype(int)))
    return dict(xc=float(xc), yc=float(yc), r=float(r), n=int(keep.sum()), rms=float(np.sqrt(np.mean(res ** 2))),
                coverage_deg=15 * cov)


def measure_triangle(B, M, cx, cy, H0=37.0, W0=43.0, apex=None, base=None):
    """Fit a triangle outline. (cx, cy) approx centroid; H0, W0 nominal
    centreline height and base width. Iterates: predicted side lines ->
    nearest short dark run per row within 4 px -> robust line fits -> apex;
    base row from the row profile between the sides."""
    Bm = B & ~M
    H, W = B.shape
    xa, ya = cx, cy - 2.0 * H0 / 3.0
    yb = cy + H0 / 3.0
    if apex is not None:
        xa, ya = apex
    if base is not None:
        yb = base
    hw = W0 / 2.0
    out = {}
    for it in range(4):
        # base row
        xl0, xr0 = int(xa - hw + 8), int(xa + hw - 7)
        rowprof = Bm[:, max(0, xl0):min(W, xr0)].mean(axis=1).astype(float)
        by, _ = peak_centroid(rowprof, int(round(yb)) - 4, int(round(yb)) + 5, cw=3)
        if by is None:
            return out
        yb = by
        left, right = [], []
        for y in range(int(np.ceil(ya + 5)), int(yb - 5)):
            t = (y - ya) / (yb - ya)
            exl, exr = xa - t * hw, xa + t * hw
            xs = np.nonzero(Bm[y, :])[0]
            if len(xs) == 0:
                continue
            runs = np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1)
            cents = [r.mean() for r in runs if len(r) <= 12]
            cl = [c for c in cents if abs(c - exl) <= 4]
            cr = [c for c in cents if abs(c - exr) <= 4]
            if cl:
                left.append((y, min(cl, key=lambda c: abs(c - exl))))
            if cr:
                right.append((y, min(cr, key=lambda c: abs(c - exr))))

        def fit(pts):
            if len(pts) < 5:
                return None, 0, 0.0
            P = np.array(pts, float)
            keep = np.ones(len(P), bool)
            coef = np.polyfit(P[:, 0], P[:, 1], 1)
            for _ in range(10):
                coef = np.polyfit(P[keep, 0], P[keep, 1], 1)
                r = P[:, 1] - np.polyval(coef, P[:, 0])
                new = np.abs(r) < 2.0
                if (new == keep).all() or new.sum() < 5:
                    break
                keep = new
            r = P[keep, 1] - np.polyval(coef, P[keep, 0])
            return coef, int(keep.sum()), float(np.sqrt(np.mean(r ** 2)))

        cl_, nl, rl = fit(left)
        cr_, nr, rr = fit(right)
        if cl_ is None or cr_ is None:
            out.update(n_left=len(left), n_right=len(right), base_y=yb)
            return out
        ya = (cr_[1] - cl_[1]) / (cl_[0] - cr_[0])
        xa = float(np.polyval(cl_, ya))
        xbl, xbr = float(np.polyval(cl_, yb)), float(np.polyval(cr_, yb))
        hw = (xbr - xbl) / 2.0
    out.update(base_y=float(yb), left=cl_.tolist(), n_left=nl, rms_left=rl, right=cr_.tolist(),
               n_right=nr, rms_right=rr, apex=(float(xa), float(ya)), base_left=(xbl, float(yb)),
               base_right=(xbr, float(yb)), height=float(yb - ya), base_width=float(xbr - xbl),
               centroid=(float((xa + xbl + xbr) / 3), float((ya + 2 * yb) / 3)),
               midheight=(float((xa + (xbl + xbr) / 2) / 2), float((ya + yb) / 2)))
    return out


def find_dot(B, cx, cy, rad=9):
    """Small dark blob near (cx, cy) whose 8-connected component stays
    inside a 13 px box (i.e. not part of an outline or line)."""
    H, W = B.shape
    y0, y1 = int(cy - rad), int(cy + rad + 1)
    x0, x1 = int(cx - rad), int(cx + rad + 1)
    seen = np.zeros_like(B, bool)
    best = None
    for y in range(max(0, y0), min(H, y1)):
        for x in range(max(0, x0), min(W, x1)):
            if not B[y, x] or seen[y, x]:
                continue
            stack = [(y, x)]
            comp = []
            seen[y, x] = True
            big = False
            while stack:
                a, b = stack.pop()
                comp.append((a, b))
                if len(comp) > 120:
                    big = True
                    break
                for da in (-1, 0, 1):
                    for db in (-1, 0, 1):
                        p, q = a + da, b + db
                        if 0 <= p < H and 0 <= q < W and B[p, q] and not seen[p, q]:
                            seen[p, q] = True
                            stack.append((p, q))
            if big:
                continue
            ca = np.array(comp, float)
            ext = ca.max(axis=0) - ca.min(axis=0)
            if len(comp) >= 6 and ext.max() <= 13:
                c = (float(ca[:, 1].mean()), float(ca[:, 0].mean()), len(comp))
                if best is None or np.hypot(c[0] - cx, c[1] - cy) < np.hypot(best[0] - cx, best[1] - cy):
                    best = c
    return best


LEGEND = {"square": "conical nose", "triangle": "ogive nose", "circle": "radome nose"}


def main():
    fig, page, calib, out = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
    gray = np.asarray(Image.open(page).convert("L"))
    g = localgrid.LocalGrid.load(calib)
    results = []
    for sid, shape, ax, ay, hw, opt in SYMBOLS[fig]:
        box = (ax - hw - 12, ax + hw + 13, ay - hw - 12, ay + hw + 13)
        B = gray[box[2]:box[3], box[0]:box[1]] < 128
        M = gridmask(g, box)
        cx, cy = ax - box[0], ay - box[2]
        rec = dict(id=sid, shape=shape, series=LEGEND[shape], approx=(ax, ay), method="auto",
                   note=opt.get("note", ""), stack=opt.get("stack", ""), conf=opt.get("conf", "high"))
        s_meas = 0.7
        if "manual_sides" in opt:
            m = opt["manual_sides"]
            side = opt.get("side", 42.0)
            L, R_, T, Bo = m.get("left"), m.get("right"), m.get("top"), m.get("bottom")
            xc = (L + R_) / 2 if L is not None and R_ is not None else (
                L + side / 2 if L is not None else R_ - side / 2)
            yc = (T + Bo) / 2 if T is not None and Bo is not None else (
                T + side / 2 if T is not None else Bo - side / 2)
            hidden = sum(v is None for v in (L, R_, T, Bo))
            rec.update(method="manual sides" + (" (%d hidden, nominal side %.0f px)" % (hidden, side) if hidden else ""),
                       sides=dict(left=(L if L is not None else xc - side / 2, 0, L is None),
                                  right=(R_ if R_ is not None else xc + side / 2, 0, R_ is None),
                                  top=(T if T is not None else yc - side / 2, 0, T is None),
                                  bottom=(Bo if Bo is not None else yc + side / 2, 0, Bo is None)),
                       centre=(xc, yc))
            s_meas = 1.0 + 1.0 * hidden
        elif "manual_tri" in opt:
            m = opt["manual_tri"]
            xa, ya = m["apex"]
            H = m.get("H", 40.0)
            base = m.get("base")
            xb = m.get("xc", xa)
            if base is None:
                base = ya + H
            cyv = (ya + 2 * base) / 3.0
            rec.update(method="manual vertices" + (" (base hidden, nominal height %.1f px)" % H
                                                   if m.get("base") is None else ""),
                       triangle=dict(apex=(xa, ya), base_left=(xb - 22, base), base_right=(xb + 22, base)),
                       centre=((xa + 2 * xb) / 3.0, cyv))
            s_meas = 1.0 if (m.get("base") is not None and not opt.get("apex_hidden")) else 1.5
        elif shape == "square":
            side = opt.get("side", 44.0)
            r = measure_square(B, M, cx, cy, side)
            rec["sides"] = {k: (None if v[0] is None else v[0] + (box[0] if k in ("left", "right") else box[2]),
                                v[1], v[2]) for k, v in r.items()}
            L, R_, T, Bo = (rec["sides"][k][0] for k in ("left", "right", "top", "bottom"))
            rec["centre"] = ((L + R_) / 2 if L and R_ else None, (T + Bo) / 2 if T and Bo else None)
            rec["size"] = (R_ - L if L and R_ else None, Bo - T if T and Bo else None)
        elif shape == "circle":
            r = measure_circle(B, M, cx, cy, opt.get("r", 22.0))
            r["xc"] += box[0]
            r["yc"] += box[2]
            rec.update(circle=r)
            rec["centre"] = (r["xc"], r["yc"])
            s_meas = 0.5
        else:
            ap = opt.get("apex")
            ap = (ap[0] - box[0], ap[1] - box[2]) if ap else None
            bs = opt["base"] - box[2] if "base" in opt else None
            r = measure_triangle(B, M, cx, cy, opt.get("H", 37.0), opt.get("W", 43.0), ap, bs)
            for k in ("apex", "base_left", "base_right", "centroid", "midheight"):
                if k in r:
                    r[k] = (r[k][0] + box[0], r[k][1] + box[2])
            if r.get("base_y") is not None:
                r["base_y"] += box[2]
            rec.update(triangle=r)
            rec["centre"] = r.get("centroid")
            s_meas = 1.0
        c = rec.get("centre")
        if not (c and c[0] is not None and c[1] is not None):
            results.append(rec)
            print("FAILED", sid)
            continue
        rec["centre_data"] = g.to_data(c[0], c[1])
        if "dot" in opt:
            rec["dot"] = (opt["dot"][0], opt["dot"][1], 0)
            rec["dot_how"] = "manual (pixel map)"
        elif not opt.get("nodot"):
            dot = find_dot(B, c[0] - box[0], c[1] - box[2])
            if dot:
                rec["dot"] = (dot[0] + box[0], dot[1] + box[2], dot[2])
                rec["dot_how"] = "auto"
        # local scale: data units per pixel
        x0v, y0v = rec["centre_data"]
        dRdx = abs(g.to_data(c[0] + 10, c[1])[0] - x0v) / 10.0
        dPdy = abs(g.to_data(c[0], c[1] + 10)[1] - y0v) / 10.0
        s_cal = 0.4
        if "dot" in rec:
            rec["dot_data"] = g.to_data(rec["dot"][0], rec["dot"][1])
            vx, vy = rec["dot"][0], rec["dot"][1]
            sx = sy = np.hypot(0.7, s_cal)
            rec["value_from"] = "centre dot"
            rec["dot_minus_outline_px"] = (rec["dot"][0] - c[0], rec["dot"][1] - c[1])
        else:
            vx, vy = c
            s_tx, s_ty = 1.8, (2.5 if shape == "triangle" else 1.5)
            sx = np.sqrt(s_meas ** 2 + s_cal ** 2 + s_tx ** 2)
            sy = np.sqrt(s_meas ** 2 + s_cal ** 2 + s_ty ** 2)
            rec["value_from"] = "outline centre" if shape != "triangle" else "outline centroid"
        rec["value_px"] = (vx, vy)
        rec["value_data"] = g.to_data(vx, vy)
        rec["err_R"] = float(2 * sx * dRdx)
        rec["err_P"] = float(2 * sy * dPdy)
        results.append(rec)
        print("%s %-8s R %.3f P %.4f +-%.4f (R +-%.3f) from %s; outline centre R %.3f P %.4f %s" % (
            sid, shape, rec["value_data"][0], rec["value_data"][1], rec["err_P"], rec["err_R"],
            rec["value_from"], rec["centre_data"][0], rec["centre_data"][1], rec["method"]))
    with open(out, "w") as f:
        json.dump(results, f, indent=1, default=float)


if __name__ == "__main__":
    main()
