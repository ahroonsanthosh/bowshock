"""Centre and read symbols identified by eye, using the figure's legend glyphs.

usage: python3 -I sym_refine.py PAGE.png CALIB.json FIGKEY OUT.json

FIGKEY selects a list in symlists.py: legend glyph centres (page px, bbox
centres measured on pixel maps) and, per plotted symbol, its id, type (the
legend entry it was identified as, by eye on zoomed crops) and approximate
centre. Each symbol's centre is the position, within +-SEARCH px of the
approximate one, that maximises the zero-mean normalised correlation of the
legend glyph of its type with the page (ink = gray < 128, box-blurred 1 px),
with pixels within 3 px of a calibrated gridline given zero weight in both
(gridlines cross many symbols). A symbol can instead carry a manual centre
read from a pixel map (stated in its note). Value = calibration at the
centre. Error (about 2 sigma) per axis: sqrt((2 x 0.8 px)^2 + (2 x cal)^2)
in px for a fitted centre (0.8 px fit scatter, cal = the calibration's
leave-one-out rms), larger for manual centres and low scores, times the
local data-per-px scale.

Options in a figure's entry: "blur" (box-blur radius of the ink, default 1;
2 for a halftone scan) and "dot_types" (legend types drawn with a centre
dot). For those the centre is the dot itself: within +-SEARCH px of the
approximate centre, the point that maximises the mean ink of the 1 px
blurred page over a disc of radius 2 minus its mean over the ring 4 to 7 px
(gridline pixels left out), then the ink centroid within 4 px of it; the dot
contrast is reported as the score (1 = black dot in a white ring) and a
contrast below 0.35 counts as a low score. For every symbol the
masked correlation of each legend glyph at the centre (best within +-3 px)
is also reported as a check of the type called by eye. Types listed in
"dot_check" are centred by correlation but also searched for a dot (within
+-SEARCH px of that centre), reported beside it.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402
import localgrid  # noqa: E402
import symlists  # noqa: E402

Image.MAX_IMAGE_PIXELS = None
SEARCH = 6


def grid_mask(g, x0, y0, w, h, rad=3):
    ys = np.arange(y0, y0 + h, dtype=float)
    xs = np.arange(x0, x0 + w, dtype=float)
    m = np.zeros((h, w), bool)
    for k in range(len(g.vvals)):
        if np.sum(~np.isnan(g.X[k])) >= 2 and g.is_ink("v", k):
            m |= np.abs(xs[None, :] - g.vline(k)(ys)[:, None]) <= rad
    for j in range(len(g.hvals)):
        if np.sum(~np.isnan(g.X[:, j])) >= 2 and g.is_ink("h", j):
            m |= np.abs(ys[:, None] - g.hline(j)(xs)[None, :]) <= rad
    return m


def wncc(t, p, w):
    sw = w.sum()
    if sw < 20:
        return np.nan
    a = t - (w * t).sum() / sw
    b = p - (w * p).sum() / sw
    den = np.sqrt((w * a * a).sum() * (w * b * b).sum())
    return float((w * a * b).sum() / den) if den > 0 else np.nan


def dot_centre(raw, B1, g, ax, ay):
    """Centre dot of a dotted symbol near (ax, ay); returns (x, y, contrast)."""
    R = 7
    yy, xx = np.mgrid[-R:R + 1, -R:R + 1]
    rr = np.hypot(xx, yy)
    core, ring = rr <= 2, (rr >= 4) & (rr <= 7)
    best = (-9, None)
    x0, y0 = int(round(ax)), int(round(ay))
    gm = grid_mask(g, x0 - SEARCH - R, y0 - SEARCH - R, 2 * (SEARCH + R) + 1, 2 * (SEARCH + R) + 1, rad=2.5)
    for dy in range(-SEARCH, SEARCH + 1):
        for dx in range(-SEARCH, SEARCH + 1):
            cx, cy = x0 + dx, y0 + dy
            p = B1[cy - R:cy + R + 1, cx - R:cx + R + 1]
            m = ~gm[dy + SEARCH:dy + SEARCH + 2 * R + 1, dx + SEARCH:dx + SEARCH + 2 * R + 1]
            if (ring & m).sum() < 20:
                continue
            sc = p[core].mean() - p[ring & m].mean()
            if sc > best[0]:
                best = (sc, (cx, cy))
    cx, cy = best[1]
    w = raw[cy - 4:cy + 5, cx - 4:cx + 5] * (rr[R - 4:R + 5, R - 4:R + 5] <= 4)
    if w.sum() == 0:
        return float(cx), float(cy), best[0]
    gy, gx = np.mgrid[cy - 4:cy + 5, cx - 4:cx + 5]
    return float((w * gx).sum() / w.sum()), float((w * gy).sum() / w.sum()), best[0]


def outline_offsets(shape):
    """Sample offsets (0.25 px grid) on the stroke of an ideal glyph outline and
    inside it. shape: ("circle", r), ("square", a) with a = half side, or
    ("triangle", b, h) with half base b and apex-to-base height h, centred on
    its bounding box; all measured to the stroke centre."""
    st = np.arange(-12.0, 12.01, 0.25)
    xx, yy = np.meshgrid(st, st)
    kind = shape[0]
    if kind == "circle":
        d = np.hypot(xx, yy) - shape[1]
    elif kind == "square":
        d = np.maximum(np.abs(xx), np.abs(yy)) - shape[1]
    elif kind == "rect":
        # round 11: a "square" drawn wider than tall; shape = ("rect", half width, half height)
        d = np.maximum(np.abs(xx) - shape[1], np.abs(yy) - shape[2])
    elif kind == "xcross":
        # round 11: a diagonal cross (x) of arm reach L (half the bounding box): the "stroke" is the two
        # diagonals, the "inside" the four notches between the arms
        L = shape[1]
        inbox = np.maximum(np.abs(xx), np.abs(yy)) <= L
        off = np.abs(np.abs(xx) - np.abs(yy)) / np.sqrt(2.0)
        ring = inbox & (off <= 1.0)
        inner = inbox & (off >= 2.5) & (np.maximum(np.abs(xx), np.abs(yy)) >= 2.0)
        return (xx[ring], yy[ring]), (xx[inner], yy[inner])
    elif kind == "plus":
        # round 11: an upright cross (+) of arm reach L
        L = shape[1]
        inbox = np.maximum(np.abs(xx), np.abs(yy)) <= L
        off = np.minimum(np.abs(xx), np.abs(yy))
        ring = inbox & (off <= 1.0)
        inner = inbox & (off >= 2.5)
        return (xx[ring], yy[ring]), (xx[inner], yy[inner])
    elif kind == "diamond":
        # round 11: a square standing on a corner; shape = ("diamond", half diagonal)
        d = (np.abs(xx) + np.abs(yy) - shape[1]) / np.sqrt(2.0)
    else:
        b, h = shape[1], shape[2]
        # signed distance to the three edges, negative inside (sign fixed at the centroid)
        p = [(0.0, -h / 2), (-b, h / 2), (b, h / 2)]
        cx, cy = 0.0, h / 6
        ds = []
        for (x1, y1), (x2, y2) in ((p[0], p[1]), (p[1], p[2]), (p[2], p[0])):
            nx, ny = (y2 - y1), -(x2 - x1)
            L = np.hypot(nx, ny)
            sg = 1.0 if ((cx - x1) * nx + (cy - y1) * ny) < 0 else -1.0
            ds.append(sg * ((xx - x1) * nx + (yy - y1) * ny) / L)
        d = np.max(ds, axis=0)
    ring = np.abs(d) <= 1.0
    inner = d <= -2.25
    return (xx[ring], yy[ring]), (xx[inner], yy[inner])


def outline_centre(B1, g, shape, ax, ay, search=4.0):
    """Centre maximising ink on the ideal outline minus ink inside it (1 px
    blurred ink, bilinear), over +-search px in 0.25 px steps; gridline
    pixels are left out of both means."""
    (rx, ry), (ix, iy) = outline_offsets(shape)
    x0, y0 = int(round(ax)), int(round(ay))
    W = int(search + 14)
    gm = grid_mask(g, x0 - W, y0 - W, 2 * W + 1, 2 * W + 1, rad=2.5).astype(float)
    best = (-9.0, None)
    for dy in np.arange(-search, search + 0.01, 0.25):
        for dx in np.arange(-search, search + 0.01, 0.25):
            cx, cy = ax + dx, ay + dy
            a = bilin(B1, cx + rx, cy + ry)
            ma = bilin(gm, cx + rx - (x0 - W), cy + ry - (y0 - W)) < 0.5
            b = bilin(B1, cx + ix, cy + iy)
            mb = bilin(gm, cx + ix - (x0 - W), cy + iy - (y0 - W)) < 0.5
            if ma.sum() < 10 or mb.sum() < 3:
                continue
            sc = a[ma].mean() - b[mb].mean()
            if sc > best[0]:
                best = (float(sc), (float(cx), float(cy)))
    return best


def bilin(img, x, y):
    x0 = np.floor(x).astype(int)
    y0 = np.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    x0 = np.clip(x0, 0, img.shape[1] - 2)
    y0 = np.clip(y0, 0, img.shape[0] - 2)
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) +
            img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)


def type_check(I, g, temps, x, y):
    out = {}
    for name, (t, ox, oy, h) in temps.items():
        n = 2 * h + 1
        rx0, ry0 = int(round(x - ox)) - h - 3, int(round(y - oy)) - h - 3
        big = grid_mask(g, rx0, ry0, n + 6, n + 6)
        b = -9
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                cx, cy = int(round(x - ox)) + dx, int(round(y - oy)) + dy
                p = I[cy - h:cy + h + 1, cx - h:cx + h + 1]
                pm = big[cy - h - ry0:cy + h + 1 - ry0, cx - h - rx0:cx + h + 1 - rx0]
                sc = wncc(t, p, (~pm).astype(float))
                if sc == sc:
                    b = max(b, sc)
        out[name] = round(b, 3)
    return out


def main():
    page, calib, key, out = sys.argv[1:5]
    cfg = symlists.FIGS[key]
    g = localgrid.LocalGrid.load(calib)
    cal = json.load(open(calib))["leave_one_out_px"]
    ink = (np.asarray(Image.open(page).convert("L")) < 128).astype(np.uint8) * 255
    I = np.asarray(Image.fromarray(ink).filter(ImageFilter.BoxBlur(cfg.get("blur", 1)))).astype(float) / 255.0
    raw = ink.astype(float) / 255.0
    B1 = np.asarray(Image.fromarray(ink).filter(ImageFilter.BoxBlur(1))).astype(float) / 255.0
    dot_types = cfg.get("dot_types", ())
    temps = {}
    for name, spec in cfg["legend"].items():
        tx, ty = spec[:2]
        h = spec[2] if len(spec) > 2 else cfg["half"]
        cx, cy = int(round(tx)), int(round(ty))
        temps[name] = (I[cy - h:cy + h + 1, cx - h:cx + h + 1].copy(), tx - cx, ty - cy, h)
    res = []
    for s in cfg["symbols"]:
        sid, typ, ax, ay = s[:4]
        opt = s[4] if len(s) > 4 else {}
        t, ox, oy, h = temps[typ]
        n = 2 * h + 1
        rx0, ry0 = int(round(ax)) - h - SEARCH, int(round(ay)) - h - SEARCH
        big = grid_mask(g, rx0, ry0, n + 2 * SEARCH, n + 2 * SEARCH)
        best = (-9, None)
        for dy in range(-SEARCH, SEARCH + 1):
            for dx in range(-SEARCH, SEARCH + 1):
                cx, cy = int(round(ax)) + dx, int(round(ay)) + dy
                p = I[cy - h:cy + h + 1, cx - h:cx + h + 1]
                pm = big[cy - h - ry0:cy + h + 1 - ry0, cx - h - rx0:cx + h + 1 - rx0]
                sc = wncc(t, p, (~pm).astype(float))
                if sc == sc and sc > best[0]:
                    best = (sc, (cx + ox, cy + oy))
        rec = dict(id=sid, type=typ, approx=(ax, ay), score=round(best[0], 3), fit_px=best[1],
                   note=opt.get("note", ""))
        e = 0.8
        if "manual" in opt:
            rec["centre_px"] = opt["manual"]
            rec["centre_from"] = "pixel map (manual)"
            e = opt.get("e", 1.5)
        elif typ in cfg.get("outline", {}):
            osc, oc = outline_centre(B1, g, cfg["outline"][typ], ax, ay, search=cfg.get("outline_search", 4.0))
            rec["centre_px"] = oc
            rec["centre_from"] = "outline fit"
            rec["glyph_ncc"] = rec["score"]
            rec["score"] = round(osc, 3)
            if osc < 0.45:
                e = 1.5
        elif typ in dot_types:
            dx_, dy_, dsc = dot_centre(raw, B1, g, ax, ay)
            rec["centre_px"] = (dx_, dy_)
            rec["centre_from"] = "centre dot"
            rec["glyph_ncc"] = rec["score"]
            rec["score"] = round(float(dsc), 3)
            if dsc < 0.35:
                e = 1.5
        else:
            rec["centre_px"] = best[1]
            rec["centre_from"] = "legend-glyph correlation"
            if best[0] < 0.6:
                e = 1.5
        if "manual" not in opt and "e" in opt:
            e = opt["e"]
        if typ in cfg.get("dot_check", ()):
            qx, qy, qs = dot_centre(raw, B1, g, *rec["centre_px"])
            rec["dot_check"] = dict(x=round(qx, 2), y=round(qy, 2), score=round(float(qs), 3))
        if dot_types:
            rec["type_check"] = type_check(I, g, temps, *rec["centre_px"])
        ex = np.hypot(2 * e, 2 * cal["rms_x"])
        ey = np.hypot(2 * e, 2 * cal["rms_y"])
        x, y = rec["centre_px"]
        X, Y = g.to_data(x, y)
        dX = abs(g.to_data(x + 10, y)[0] - X) / 10
        dY = abs(g.to_data(x, y + 10)[1] - Y) / 10
        rec.update(x=X, y=Y, err_x=float(ex * dX), err_y=float(ey * dY), series=opt.get("series", cfg["series"][typ]))
        res.append(rec)
        tc = rec.get("type_check")
        tcs = "" if not tc else " check " + " ".join("%s=%.2f" % kv for kv in tc.items())
        print("%-6s %-6s score %.2f centre (%.1f, %.1f) -> %.4f +- %.4f, %.4f +- %.4f%s %s" % (
            sid, typ, rec["score"], x, y, X, rec["err_x"], Y, rec["err_y"], tcs, rec["note"]))
    json.dump(res, open(out, "w"), indent=1)


if __name__ == "__main__":
    main()
