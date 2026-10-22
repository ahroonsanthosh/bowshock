"""Transcribe the data symbols of BRL Report 934 Graph I (PDF p. 24, page
rotated clockwise so the graph reads normally).

usage: python3 -I brl_symbols.py PAGE.png CALIB.json OUT.json [ids]

Identification. Each mark was called by eye on zoomed crops (crop.py,
brl_clean.py) and pixel maps (pixmap.py) against the legend's four symbols:
  crossed circle  thick ring with four small white quadrants  CONSOLIDATION OF PHASE I ROUNDS
  plus            two crossing strokes, arms about 25 px      ROUND VALUE
  dot             solid disc, no hole                         VALUE CORRECTED FOR YAW
  open circle     thick ring, one central white hole          CORRECTED FOR YAW AND FULL TURBLENT B.L. (sic)
The shape features seen are listed per symbol. As supporting evidence the
four legend symbols, cut from the page (+-34 px), are correlated with each
mark (weighted normalised correlation, zero mean, ink = gray < 128 box-blurred
radius 2, pixels within +-7 px of a calibrated vertical ruling given zero
weight, best over +-6 px about the centre). On this 300 dpi bilevel scan the
scores separate the types poorly (marks merge with the faired curve, the
rulings and the connecting lines, and the data symbols are drawn smaller than
the legend's), so they are reported but the calls rest on the shape features.

Centres. Read from the pixel maps as the midpoints of the outer extents of
each mark (for a plus, of its arms; for a ring, checked against its hole),
with a reading error e (px, about 2 sigma) set per mark by how much of the
outline is free of other ink. Value = calibration (localgrid, graph-paper
rulings) at the centre. Reported error (about 2 sigma):
  sqrt(e^2 + (2 x 1.0 px calibration)^2) times the local data-per-px scale.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402
import localgrid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

LEGEND = {
    "crossed circle": dict(c=(2825.0, 1775.0), text="CONSOLIDATION OF PHASE I ROUNDS"),
    "plus": dict(c=(2826.0, 1876.0), text="ROUND VALUE"),
    "dot": dict(c=(2826.0, 1964.0), text="VALUE CORRECTED FOR YAW"),
    "open circle": dict(c=(2823.0, 2066.0), text="CORRECTED FOR YAW AND FULL TURBLENT B.L. (sic)"),
}
HALF = 34
SEARCH = 6

# id, centre x, centre y, reading error (ex, ey) px, call, confidence, group, features
SYMBOLS = [
    ("A1", 1342, 1405, (6, 12), "plus", "low", "A",
     "top end of the vertical line at M 0.975 (the line reaches the C_D 0.90 ruling); a cross-like mark merged "
     "with the 0.90 ruling and the rising faired curve; arms cannot be separated, centre uncertain in C_D"),
    ("A2", 1340, 1643, (5, 5), "open circle", "medium", "A",
     "thick ring, single white hole at (1340, 1644); right half clean, left half merged with the dashed curve "
     "extension; the vertical line meets it top and bottom"),
    ("A4", 1336, 1817, (3, 3), "dot", "high", "A",
     "solid disc 40 x 38 px, no hole; vertical line from above ends on it"),
    ("B1", 1428, 1412, (5, 10), "plus", "low", "B",
     "vertical stroke 12 px wide hanging 30 px below the faired curve near its peak; no free horizontal arm "
     "(would lie inside the curve); only one arm visible"),
    ("B2", 1482, 1395, (5, 10), "plus", "low", "B",
     "vertical stroke 20 px tall standing above the faired curve at its peak; rest inside the curve; only one "
     "arm visible, could also be a pen flick"),
    ("B3", 1482, 1470, (5, 5), "plus", "medium", "B",
     "horizontal arm 1464-1516 px at y 1469, vertical stroke 1474-1484 px from y 1458 to the C_D 0.875 ruling; "
     "vertical arm runs beside the M 1.05 ruling"),
    ("B4", 1551, 1429, (3, 3), "plus", "high", "B", "clean plus, arms 48 and 45 px"),
    ("C1", 1660, 1694, (6, 6), "plus", "low", "C",
     "top arm and right arm stand out of the descending faired curve; left and bottom arms inside the curve"),
    ("C2", 1658, 1761, (4, 4), "dot", "medium", "C",
     "solid disc 40 px wide on the faired curve, no hole; M 1.15 ruling crosses its right part"),
    ("D1", 1891, 1958, (3, 3), "plus", "high", "D",
     "plus with horizontal arm 60 px; bottom arm continues as the vertical line to D2"),
    ("D2", 1891, 2028, (3, 3), "open circle", "high", "D",
     "ring 60 x 57 px with single hole 18 x 24 px; faired curve touches its lower right"),
    ("D3", 1883, 2104, (3, 4), "dot", "high", "D", "solid disc 42 x 30 px, vertical line from D2 ends on it"),
    ("E1", 2153, 1843, (4, 4), "plus", "medium", "E",
     "horizontal arm 50 px centred on the M 1.40 ruling; the vertical arm is hidden by the ruling and by the "
     "vertical line that runs from it down to E2b"),
    ("E2a", 2125, 2174, (5, 5), "plus", "medium", "E",
     "plus just left of E2b: vertical arm 2152-2198 px free above and below the curve, horizontal arm merged "
     "with the faired curve and E2b"),
    ("E2b", 2151, 2168, (5, 5), "dot", "medium", "E",
     "solid blob about 38 x 36 px on the faired curve at the foot of the vertical line from E1, no hole; its "
     "left edge merges with E2a"),
    ("F1", 2361, 2150, (5, 5), "plus", "medium", "F",
     "vertical stroke 2354-2368 px with top arm free; right arm to 2394 px; left arm reaches the M 1.5 ruling "
     "only; bottom arm continues as the line to F2"),
    ("F2", 2358, 2222, (4, 4), "dot", "high", "F", "solid disc about 40 x 33 px, left edge on the M 1.5 ruling"),
    ("G1", 2913, 2549, (4, 4), "crossed circle", "high", "G",
     "ring about 64 px with four small white quadrants and a horizontal cross stroke at y 2547; vertical cross "
     "stroke on the M 1.80 ruling; faired curve passes through it"),
    ("H1", 3279, 2651, (4, 4), "plus", "high", "H",
     "plus, arms 3256-3302 px and 2627-2675 px; bottom arm continues as the line to H2"),
    ("H2", 3270, 2738, (5, 5), "dot", "medium", "H",
     "solid disc about 32 x 36 px, faired curve passes through it; no hole"),
    ("I1", 3356, 2719, (3, 3), "plus", "medium", "I",
     "small plus (vertical arm 42 px, 3348-3364 px wide), horizontal arm lies on a fine ruling; not on the "
     "vertical line of I2 and I3 (0.02 in M to the left)"),
    ("I2", 3392, 2782, (4, 4), "open circle", "medium", "I",
     "ring 52 px wide with a single hole 14 x 12 px; faired curve passes through it"),
    ("I3", 3388, 2904, (3, 3), "dot", "high", "I",
     "solid disc 48 x 38 px at the foot of the vertical line from I2 (which runs along the M 2.05 ruling)"),
    ("J1", 4101, 3080, (5, 8), "plus", "low", "J",
     "free vertical stroke 4094-4108 px wide from y 3062 to 3098, symmetric about the heavy C_D 0.475 ruling at "
     "y 3080, standing on J2; a horizontal arm would lie on that ruling and cannot be seen, so the call rests on "
     "the stroke's length and symmetry and on the other groups (plus above, corrected values below)"),
    ("J2", 4096, 3116, (6, 6), "open circle", "low", "J",
     "blob 46 x 36 px on the faired curve with a small white hole (4102-4106, 3110-3116 px); called an open "
     "circle with the curve through it; could be a dot"),
    ("K1", 4194, 3086, (3, 3), "plus", "high", "K", "clean plus, arms 54 and 45 px, off the faired curve"),
]


def ruling_mask(g, x0, y0, w, h, rad=7):
    ys = np.arange(y0, y0 + h, dtype=float)
    xs = np.arange(x0, x0 + w, dtype=float)
    m = np.zeros((h, w), bool)
    for k in range(len(g.vvals)):
        if np.sum(~np.isnan(g.X[k])) < 2:
            continue
        xk = g.vline(k)(ys)
        if np.all(np.abs(xk - (x0 + w / 2)) > w):
            continue
        m |= np.abs(xs[None, :] - xk[:, None]) <= rad
    return m


def wncc(t, p, w):
    sw = w.sum()
    if sw < 50:
        return np.nan
    mt = (w * t).sum() / sw
    mp = (w * p).sum() / sw
    a, b = t - mt, p - mp
    den = np.sqrt((w * a * a).sum() * (w * b * b).sum())
    return float((w * a * b).sum() / den) if den > 0 else np.nan


def scores(I, g, temps, ax, ay):
    n = 2 * HALF + 1
    rx0, ry0 = int(round(ax)) - HALF - SEARCH, int(round(ay)) - HALF - SEARCH
    big = ruling_mask(g, rx0, ry0, n + 2 * SEARCH, n + 2 * SEARCH)
    out, loc = {}, {}
    for name, (t, tw, ox, oy) in temps.items():
        best = (-9.0, None)
        for dy in range(-SEARCH, SEARCH + 1):
            for dx in range(-SEARCH, SEARCH + 1):
                cx, cy = int(round(ax)) + dx, int(round(ay)) + dy
                x0, y0 = cx - HALF, cy - HALF
                p = I[y0:y0 + n, x0:x0 + n]
                pm = big[y0 - ry0:y0 - ry0 + n, x0 - rx0:x0 - rx0 + n]
                s = wncc(t, p, (tw & ~pm).astype(float))
                if s == s and s > best[0]:
                    best = (s, (cx + ox, cy + oy))
        out[name] = round(best[0], 3)
        loc[name] = best[1]
    return out, loc


def main():
    page, calib, out = sys.argv[1:4]
    only = set(sys.argv[4].split(",")) if len(sys.argv) > 4 else None
    g = localgrid.LocalGrid.load(calib)
    ink = (np.asarray(Image.open(page).convert("L")) < 128).astype(np.uint8) * 255
    I = np.asarray(Image.fromarray(ink).filter(ImageFilter.BoxBlur(2))).astype(float) / 255.0
    n = 2 * HALF + 1
    temps = {}
    for name, L in LEGEND.items():
        cx, cy = (int(round(v)) for v in L["c"])
        x0, y0 = cx - HALF, cy - HALF
        temps[name] = (I[y0:y0 + n, x0:x0 + n].copy(), ~ruling_mask(g, x0, y0, n, n),
                       L["c"][0] - cx, L["c"][1] - cy)
    res = []
    for sid, x, y, (ex, ey), call, conf, grp, feat in SYMBOLS:
        if only and sid not in only:
            continue
        M, C = g.to_data(x, y)
        dMx = abs(g.to_data(x + 10, y)[0] - M) / 10
        dCy = abs(g.to_data(x, y + 10)[1] - C) / 10
        errM = float(np.hypot(ex, 2.0) * dMx)
        errC = float(np.hypot(ey, 2.0) * dCy)
        sc, loc = scores(I, g, temps, x, y)
        tl = loc[call]
        rec = dict(id=sid, group=grp, symbol=call, legend_text=LEGEND[call]["text"], confidence=conf,
                   centre_px=(x, y), centre_err_px=(ex, ey), M=M, CD=C, err_M=errM, err_CD=errC,
                   features=feat, template_scores=sc, best_template=max(sc, key=sc.get),
                   template_centre_px=tl, template_centre_data=g.to_data(*tl) if tl else None)
        res.append(rec)
        print("%-4s %-14s %-6s M %.4f +- %.4f  C_D %.4f +- %.4f | scores %s | best %s | template centre (%s)" % (
            sid, call, conf, M, errM, C, errC,
            " ".join("%s=%.2f" % (k.split()[0][:5], v) for k, v in sc.items()), rec["best_template"],
            "%.0f, %.0f" % tl if tl else "-"))
    with open(out, "w") as f:
        json.dump(res, f, indent=1)


if __name__ == "__main__":
    main()
