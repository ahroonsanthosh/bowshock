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
        if np.sum(~np.isnan(g.X[k])) >= 2:
            m |= np.abs(xs[None, :] - g.vline(k)(ys)[:, None]) <= rad
    for j in range(len(g.hvals)):
        if np.sum(~np.isnan(g.X[:, j])) >= 2:
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


def main():
    page, calib, key, out = sys.argv[1:5]
    cfg = symlists.FIGS[key]
    g = localgrid.LocalGrid.load(calib)
    cal = json.load(open(calib))["leave_one_out_px"]
    ink = (np.asarray(Image.open(page).convert("L")) < 128).astype(np.uint8) * 255
    I = np.asarray(Image.fromarray(ink).filter(ImageFilter.BoxBlur(1))).astype(float) / 255.0
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
        else:
            rec["centre_px"] = best[1]
            rec["centre_from"] = "legend-glyph correlation"
            if best[0] < 0.6:
                e = 1.5
        ex = np.hypot(2 * e, 2 * cal["rms_x"])
        ey = np.hypot(2 * e, 2 * cal["rms_y"])
        x, y = rec["centre_px"]
        X, Y = g.to_data(x, y)
        dX = abs(g.to_data(x + 10, y)[0] - X) / 10
        dY = abs(g.to_data(x, y + 10)[1] - Y) / 10
        rec.update(x=X, y=Y, err_x=float(ex * dX), err_y=float(ey * dY), series=opt.get("series", cfg["series"][typ]))
        res.append(rec)
        print("%-6s %-6s score %.2f centre (%.1f, %.1f) -> %.4f +- %.4f, %.4f +- %.4f %s" % (
            sid, typ, best[0], x, y, X, rec["err_x"], Y, rec["err_y"], rec["note"]))
    json.dump(res, open(out, "w"), indent=1)


if __name__ == "__main__":
    main()
