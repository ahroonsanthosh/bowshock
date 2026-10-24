"""Calibrate a plot from its labelled gridlines (or ticks drawn as full lines).

usage: python3 -I gridcal.py CONFIG.json KEY OUT.json

CONFIG[KEY] holds:
  page:   page image (300 dpi, as extracted by pdfimages)
  ink:    grey level below which a pixel is ink (default 128)
  vlines: [[value, approx_x], ...]  vertical gridlines (abscissa values)
  hlines: [[value, approx_y], ...]  horizontal gridlines (ordinate values)
  yspan:  [y0, y1] rows along which vertical lines are followed
  xspan:  [x0, x1] columns along which horizontal lines are followed
  skip:   optional [[x0, y0, x1, y1], ...] boxes (lettering, legends) left out
  win:    optional half-width in px of the search window (default 6)

Each line is followed by taking, in every row (column) of its span, the ink
run nearest the line's current estimate within +-win px and its centre, then
fitting a straight line x = a + b*y (y = a + b*x) with iterative rejection
of samples more than 1.5 px off (symbols and lettering that touch a line).
Output: the fitted lines, their rms and sample counts, the intersections, and
the leave-one-out check: each line dropped in turn and its position at the
plot centre predicted by linear interpolation (or extrapolation at the ends)
from its two neighbours in value; the rms of those misses (px) measures how
far the printed grid departs from a uniform scale, and is the calibration
error used for the symbols.
"""
import json
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None


def load_grey(path):
    im = Image.open(path)
    if im.mode == "1":
        return np.array(im.convert("L"), dtype=float)
    return np.array(im.convert("L"), dtype=float)


def follow(ink, approx, span, vertical, win, skip):
    pts = []
    cur = float(approx)
    for t in range(span[0], span[1]):
        lo, hi = int(round(cur)) - win, int(round(cur)) + win + 1
        if vertical:
            prof = ink[t, lo:hi]
            coord = lambda s: (s, t)  # noqa: E731
        else:
            prof = ink[lo:hi, t]
            coord = lambda s: (t, s)  # noqa: E731
        idx = np.nonzero(prof)[0]
        if len(idx) == 0:
            continue
        # split into runs; take the run whose centre is nearest cur
        runs = np.split(idx, np.nonzero(np.diff(idx) > 1)[0] + 1)
        best = None
        for r in runs:
            if len(r) > 2 * win - 2:
                continue  # a crossing line or a blob, not this line
            c = lo + (r[0] + r[-1]) / 2.0
            if best is None or abs(c - cur) < abs(best - cur):
                best = c
        if best is None:
            continue
        x, y = coord(best)
        if any(b[0] <= x <= b[2] and b[1] <= y <= b[3] for b in skip):
            continue
        pts.append((t, best))
    pts = np.array(pts)
    keep = np.ones(len(pts), bool)
    for _ in range(6):
        A = np.vstack([np.ones(keep.sum()), pts[keep, 0]]).T
        coef, *_ = np.linalg.lstsq(A, pts[keep, 1], rcond=None)
        res = pts[:, 1] - (coef[0] + coef[1] * pts[:, 0])
        nk = np.abs(res) <= max(1.5, 2.5 * np.std(res[keep]) if keep.sum() > 5 else 1.5)
        nk &= np.abs(res) <= 1.5
        if (nk == keep).all():
            break
        keep = nk
    return coef, float(np.sqrt(np.mean(res[keep] ** 2))), int(keep.sum()), len(pts)


def loo(vals, pos):
    vals, pos = np.array(vals, float), np.array(pos, float)
    o = np.argsort(vals)
    vals, pos = vals[o], pos[o]
    miss = []
    for k in range(len(vals)):
        if k == 0:
            i, j = 1, 2
        elif k == len(vals) - 1:
            i, j = k - 2, k - 1
        else:
            i, j = k - 1, k + 1
        if j >= len(vals) or i < 0:
            continue
        p = pos[i] + (pos[j] - pos[i]) * (vals[k] - vals[i]) / (vals[j] - vals[i])
        miss.append(p - pos[k])
    return [round(m, 3) for m in miss], float(np.sqrt(np.mean(np.square(miss))))


def main():
    cfg = json.load(open(sys.argv[1]))[sys.argv[2]]
    g = load_grey(cfg["page"])
    ink = g < cfg.get("ink", 128)
    win = cfg.get("win", 6)
    skip = cfg.get("skip", [])
    V, H = [], []
    for v, ax in cfg["vlines"]:
        coef, rms, n, n0 = follow(ink, ax, cfg["yspan"], True, win, skip)
        V.append({"value": v, "a": coef[0], "b": coef[1], "rms": round(rms, 3), "n": n, "n_sampled": n0})
    for v, ay in cfg["hlines"]:
        coef, rms, n, n0 = follow(ink, ay, cfg["xspan"], False, win, skip)
        H.append({"value": v, "a": coef[0], "b": coef[1], "rms": round(rms, 3), "n": n, "n_sampled": n0})
    xs = []
    for vl in V:
        row = []
        for hl in H:
            # x = a1 + b1 y ; y = a2 + b2 x
            y = (hl["a"] + hl["b"] * vl["a"]) / (1 - hl["b"] * vl["b"])
            x = vl["a"] + vl["b"] * y
            row.append([round(x, 3), round(y, 3)])
        xs.append(row)
    ymid = (cfg["yspan"][0] + cfg["yspan"][1]) / 2
    xmid = (cfg["xspan"][0] + cfg["xspan"][1]) / 2
    lv, rv = loo([l["value"] for l in V], [l["a"] + l["b"] * ymid for l in V])
    lh, rh = loo([l["value"] for l in H], [l["a"] + l["b"] * xmid for l in H])
    pxv = abs((V[-1]["a"] - V[0]["a"]) / (V[-1]["value"] - V[0]["value"]))
    pxh = abs((H[-1]["a"] - H[0]["a"]) / (H[-1]["value"] - H[0]["value"]))
    out = {"key": sys.argv[2], "page": cfg["page"], "vlines": V, "hlines": H, "intersections": xs,
           "loo_x_px": lv, "loo_x_rms_px": round(rv, 3), "loo_y_px": lh, "loo_y_rms_px": round(rh, 3),
           "px_per_unit_x": round(pxv, 3), "px_per_unit_y": round(pxh, 3),
           "tilt_deg_v": [round(float(np.degrees(np.arctan(l["b"]))), 3) for l in V],
           "tilt_deg_h": [round(float(np.degrees(np.arctan(l["b"]))), 3) for l in H]}
    json.dump(out, open(sys.argv[3], "w"), indent=1)
    print("vlines:", [(l["value"], round(l["a"] + l["b"] * ymid, 2), l["rms"], l["n"], l["n_sampled"]) for l in V])
    print("hlines:", [(l["value"], round(l["a"] + l["b"] * xmid, 2), l["rms"], l["n"], l["n_sampled"]) for l in H])
    print("loo x px", lv, "rms", round(rv, 3), "| loo y px", lh, "rms", round(rh, 3))
    print("px/unit x", round(pxv, 3), "y", round(pxh, 3))


if __name__ == "__main__":
    main()
