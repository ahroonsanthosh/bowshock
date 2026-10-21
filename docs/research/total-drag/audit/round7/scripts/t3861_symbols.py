"""Locate the data symbols of NACA TN 3861 figs. 15 and 16 (PDF pp. 31, 32).

usage: python3 -I t3861_symbols.py FIG PAGE.png CALIB.json OUT.json

Each symbol was identified by eye on contact sheets (symsheet.py) against
the figure's legend; its approximate centre is listed below. Three centre
estimates are measured on the binary page (gray < 128):

  dot     a centre dot: the 8-connected dark component, of 15 to 250 px and
          at most 18 px across, nearest the approximate centre (within 22 px);
  cross   for crossed symbols, the darkness-weighted positions of the
          interior vertical and horizontal strokes (column and row profile
          peaks inside the outline, at least 9 px from its edges);
  outline the midpoint of the outer edges of the outline, from column and row
          projections (edges where the projection first and last exceeds
          40 percent of its maximum).

The value reported is the dot when found, else the cross centre, else the
outline centre; all three are kept in the output.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import localgrid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

# id, approx x, approx y, half size, shape, crossed, series, note, options
# options: method = "cross" | "dot" | "circle" | "rtri" | "bbox" (how the value is taken);
#          dot = (x, y) read by eye from a pixel map when the dot touches a line;
#          rtri = (x_right_side, y_base, width, height) centre-line geometry of a
#          right triangle, value = its centroid (the dot of 15-06 sits there).
SYMBOLS = {
    15: [
        ("15-01", 1558, 1567, 32, "quarter-round triangle", True, "Lord and Ulmann (crossflow)", "", dict(method="cross")),
        ("15-02", 1730, 1908, 32, "quarter-round triangle", True, "Lord and Ulmann (crossflow)", "", dict(method="cross")),
        ("15-03", 1775, 1992, 32, "right triangle", False, "Gowen and Perkins",
         "top hidden under the solid curve; dot hidden on the P = 1.5 gridline", dict(method="rtri", rtri=(1802, 2019.5, 64, 70))),
        ("15-04", 1890, 1636, 32, "square", True, "present data (crossflow)", "", dict(method="cross")),
        ("15-05", 2017, 1700, 32, "quarter-round triangle", True, "Lord and Ulmann (crossflow)",
         "vertical cross stroke lies on the M_c = 2 gridline; cross centre read from the pixel map", dict(method="dot", dot=(2019.0, 1709.0))),
        ("15-06", 2005, 1825, 32, "right triangle", False, "Gowen and Perkins",
         "dot touches the right side; dot read from the pixel map", dict(method="dot", dot=(2011.0, 1827.0))),
        ("15-07", 2247, 1758, 32, "circle", False, "Walter and Lange", "", dict(method="dot")),
        ("15-08", 2402, 1742, 30, "circle", False, "Walter and Lange", "overlaps 15-09; dot touches the triangle",
         dict(method="dot", dot=(2412.5, 1742.0))),
        ("15-09", 2438, 1742, 30, "right triangle", False, "Gowen and Perkins", "overlaps 15-08; centroid on the 1.75 gridline",
         dict(method="rtri", rtri=(2466, 1774.5, 64, 68.5))),
        ("15-10", 2605, 1733, 32, "circle", False, "Walter and Lange", "dashed curve passes through", dict(method="dot", dot=(2603.75, 1739.75))),
        ("15-11", 2708, 1742, 32, "square", True, "present data (crossflow)", "", dict(method="cross")),
        ("15-12", 3050, 1695, 32, "circle", False, "Walter and Lange", "dot merged with the dashed curve; dot read from the pixel map",
         dict(method="dot", dot=(3051.0, 1699.0))),
        ("15-13", 3370, 1655, 32, "square", True, "present data (crossflow)", "overlaps 15-14", dict(method="cross")),
        ("15-14", 3400, 1688, 30, "circle", False, "Walter and Lange", "overlaps 15-13; dot not visible, circle fit",
         dict(method="circle")),
        ("15-15", 3882, 1662, 32, "square", True, "present data (crossflow)", "", dict(method="cross")),
        ("15-16", 4220, 1675, 32, "square", True, "present data (crossflow)", "", dict(method="cross")),
        ("15-17", 4312, 1667, 32, "square", False, "present data (direct, no cross)", "", dict(method="dot")),
    ],
    16: [
        ("16-01", 2040, 3460, 32, "square", True, "Lord and Ulmann (crossflow)", "vertical gridline through the left part", dict(method="cross")),
        ("16-02", 2207, 2757, 32, "square", True, "Lord and Ulmann (crossflow)", "", dict(method="cross")),
        ("16-03", 2250, 2667, 32, "circle", False, "Gowen and Perkins", "vertical gridline through the centre; circle fit", dict(method="circle")),
        ("16-04", 2360, 2083, 34, "diamond", True, "present data (crossflow)", "", dict(method="cross")),
        ("16-05", 2470, 2210, 32, "circle", False, "Gowen and Perkins", "overlaps 16-06; gridline through it; circle fit", dict(method="circle")),
        ("16-06", 2495, 2236, 30, "square", True, "Lord and Ulmann (crossflow)",
         "overlaps 16-05; cross centre read from the pixel map (upper half of the cross hidden by the circle)",
         dict(method="dot", dot=(2494.5, 2236.0))),
        ("16-07", 2697, 1867, 32, "triangle", False, "Walter and Lange", "gridline through it", dict(method="dot")),
        ("16-08", 2860, 1773, 30, "triangle", False, "Walter and Lange", "overlaps 16-09; dot touches the circle, read from the pixel map",
         dict(method="dot", dot=(2861.0, 1778.5))),
        ("16-09", 2890, 1810, 30, "circle", False, "Gowen and Perkins", "overlaps 16-08; circle fit", dict(method="circle")),
        ("16-10", 3040, 1690, 32, "triangle", False, "Walter and Lange", "", dict(method="dot")),
        ("16-11", 3147, 1627, 34, "diamond", True, "present data (crossflow)", "", dict(method="cross")),
        ("16-12", 3477, 1620, 32, "triangle", False, "Walter and Lange", "", dict(method="dot")),
        ("16-13", 3787, 1577, 34, "diamond", True, "present data (crossflow)", "overlaps 16-14", dict(method="cross")),
        ("16-14", 3833, 1573, 30, "triangle", False, "Walter and Lange",
         "overlaps 16-13; dot hidden on the P = 0 gridline; centroid from apex (3829.5, 1550) and base (y 1604) read from the pixel map",
         dict(method="dot", dot=(3829.5, 1586.0), how="triangle centroid (pixel map)")),
        ("16-15", 4300, 1533, 34, "diamond", True, "present data (crossflow)", "", dict(method="cross")),
        ("16-16", 4620, 1517, 34, "diamond", True, "present data (crossflow)", "", dict(method="cross")),
        ("16-17", 4717, 1547, 34, "diamond", False, "present data (direct, no cross)", "", dict(method="bbox")),
    ],
}


def components_near(B, cx, cy, rad=22, amin=15, amax=250, ext=18):
    H, W = B.shape
    seen = np.zeros_like(B)
    best = None
    for y in range(max(0, int(cy - rad)), min(H, int(cy + rad) + 1)):
        for x in range(max(0, int(cx - rad)), min(W, int(cx + rad) + 1)):
            if not B[y, x] or seen[y, x]:
                continue
            stack = [(y, x)]
            seen[y, x] = True
            comp = []
            big = False
            while stack:
                a, b = stack.pop()
                comp.append((a, b))
                if len(comp) > amax:
                    big = True
                    break
                for da in (-1, 0, 1):
                    for db in (-1, 0, 1):
                        p, q = a + da, b + db
                        if 0 <= p < H and 0 <= q < W and B[p, q] and not seen[p, q]:
                            seen[p, q] = True
                            stack.append((p, q))
            if big or len(comp) < amin:
                continue
            ca = np.array(comp, float)
            if (ca.max(axis=0) - ca.min(axis=0)).max() > ext:
                continue
            c = (float(ca[:, 1].mean()), float(ca[:, 0].mean()), len(comp))
            dist = np.hypot(c[0] - cx, c[1] - cy)
            if dist <= rad and (best is None or dist < best[3]):
                best = (c[0], c[1], c[2], dist)
    return best


def edges(prof, frac=0.4):
    m = prof.max()
    idx = np.nonzero(prof > frac * m)[0]
    return (int(idx[0]), int(idx[-1])) if len(idx) else (None, None)


def main():
    fig, page, calib, out = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
    g = localgrid.LocalGrid.load(calib)
    gray = np.asarray(Image.open(page).convert("L")).astype(float)
    dark = 255.0 - gray
    res = []
    for sid, ax, ay, h, shape, crossed, series, note, opt in SYMBOLS[fig]:
        x0, y0 = int(ax - h - 6), int(ay - h - 6)
        D = dark[y0:y0 + 2 * h + 13, x0:x0 + 2 * h + 13]
        B = D > 70
        rec = dict(id=sid, shape=shape, crossed=crossed, series=series, note=note, approx=(ax, ay))
        # outline from projections of the binary crop
        cp = B.sum(axis=0).astype(float)
        rp = B.sum(axis=1).astype(float)
        fr = 0.12 if shape == "diamond" else 0.25
        l, r = edges(cp, fr)
        t, b = edges(rp, fr)
        if None not in (l, r, t, b):
            rec["outline_box"] = (x0 + l, y0 + t, x0 + r, y0 + b)
            rec["outline"] = (x0 + (l + r) / 2.0, y0 + (t + b) / 2.0)
        if crossed:
            # interior strokes searched within +-14 px of the approximate centre,
            # over the inner part of the symbol (+-20 px along the stroke)
            cxa, cya = ax - x0, ay - y0
            inner_c = D[int(cya) - 20:int(cya) + 21, :].sum(axis=0)
            inner_r = D[:, int(cxa) - 20:int(cxa) + 21].sum(axis=1)
            for k in range(len(g.vvals)):
                if np.sum(~np.isnan(g.X[k])) < 2:
                    continue
                xg = float(g.vline(k)(ay)) - x0
                lo, hi = int(np.floor(xg - 6)), int(np.ceil(xg + 6))
                inner_c[max(0, lo):max(0, hi + 1)] = 0
            for j in range(len(g.hvals)):
                if np.sum(~np.isnan(g.X[:, j])) < 2:
                    continue
                yg = float(g.hline(j)(ax)) - y0
                lo, hi = int(np.floor(yg - 6)), int(np.ceil(yg + 6))
                inner_r[max(0, lo):max(0, hi + 1)] = 0
            a0, a1 = int(cxa) - 14, int(cxa) + 15
            b0, b1 = int(cya) - 14, int(cya) + 15
            ci = a0 + int(np.argmax(inner_c[a0:a1]))
            ri = b0 + int(np.argmax(inner_r[b0:b1]))
            wc = inner_c[ci - 4:ci + 5]
            wr = inner_r[ri - 4:ri + 5]
            xc = (np.arange(ci - 4, ci + 5) * wc).sum() / wc.sum()
            yc = (np.arange(ri - 4, ri + 5) * wr).sum() / wr.sum()
            rec["cross"] = (x0 + float(xc), y0 + float(yc))
        meth = opt["method"]
        if "dot" in opt:
            rec["dot"] = (opt["dot"][0], opt["dot"][1], 0)
            rec["dot_how"] = "read by eye from the pixel map"
        elif not crossed:
            if False:
                rec["dot"] = (opt["dot"][0], opt["dot"][1], 0)
                rec["dot_how"] = "read by eye from the pixel map"
            else:
                dot = components_near(B, ax - x0, ay - y0)
                if dot:
                    rec["dot"] = (x0 + dot[0], y0 + dot[1], dot[2])
                    rec["dot_how"] = "auto"
        if shape == "circle":
            yy, xx = np.nonzero(B)
            sel = np.abs(np.hypot(xx - (ax - x0), yy - (ay - y0)) - 30) < 12
            xs, ys = xx[sel].astype(float), yy[sel].astype(float)
            keep = np.ones(len(xs), bool)
            for _ in range(12):
                A = np.c_[xs[keep], ys[keep], np.ones(keep.sum())]
                c, *_ = np.linalg.lstsq(A, xs[keep] ** 2 + ys[keep] ** 2, rcond=None)
                xc, yc = c[0] / 2, c[1] / 2
                r = np.sqrt(c[2] + xc ** 2 + yc ** 2)
                res_ = np.abs(np.hypot(xs - xc, ys - yc) - r)
                new = res_ < 3.0
                if (new == keep).all():
                    break
                keep = new
            rec["circle"] = (x0 + float(xc), y0 + float(yc), float(r), int(keep.sum()))
        if "rtri" in opt:
            xr, yb, w, hh = opt["rtri"]
            rec["rtri_centroid"] = (xr - w / 3.0, yb - hh / 3.0)
        if meth == "dot" and "dot" in rec:
            v, how = rec["dot"][:2], "centre dot" if not crossed else "cross centre (pixel map)"
        elif meth == "cross" and "cross" in rec:
            v, how = rec["cross"], "cross centre"
        elif meth == "circle":
            v, how = rec["circle"][:2], "circle fit centre"
        elif meth == "rtri":
            v, how = rec["rtri_centroid"], "right-triangle centroid"
        else:
            v, how = rec.get("outline"), "outline centre"
        how = opt.get("how", how)
        rec["value_px"] = v
        rec["value_from"] = how
        rec["value"] = g.to_data(*v)
        for k in ("dot", "cross", "outline", "circle", "rtri_centroid"):
            if k in rec:
                rec[k + "_data"] = g.to_data(rec[k][0], rec[k][1])
        x1d, y1d = g.to_data(v[0] + 10, v[1])
        x2d, y2d = g.to_data(v[0], v[1] + 10)
        sig = {"centre dot": 1.0, "cross centre": 1.0, "cross centre (pixel map)": 1.5, "circle fit centre": 1.2,
               "right-triangle centroid": 2.0, "outline centre": 1.5, "triangle centroid (pixel map)": 3.0}[how]
        s_all = 2 * np.sqrt(sig ** 2 + 0.6 ** 2)
        rec["err_x"] = float(s_all * abs(x1d - rec["value"][0]) / 10)
        rec["err_y"] = float(s_all * abs(y2d - rec["value"][1]) / 10)
        res.append(rec)
        print("   px value (%.1f, %.1f) cross %s outline box %s" % (v[0], v[1],
              tuple(round(c, 1) for c in rec["cross"]) if "cross" in rec else "-", rec.get("outline_box")))
        print("%s %-24s %-34s Mc %.3f y %.4f from %-14s %s" % (
            sid, shape + (" +" if crossed else ""), series, rec["value"][0], rec["value"][1], how,
            " ".join("%s(%.3f,%.4f)" % (k, *rec[k + "_data"]) for k in ("dot", "cross", "outline", "circle", "rtri_centroid")
                     if k + "_data" in rec)))
    with open(out, "w") as f:
        json.dump(res, f, indent=1)


if __name__ == "__main__":
    main()
