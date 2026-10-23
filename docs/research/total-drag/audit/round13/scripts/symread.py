"""Centre and read the symbols of one figure, from a list typed by eye.

usage: python3 -I symread.py SYMS.json KEY CAL.json OUT_PREFIX

SYMS[KEY] holds:
  page, shapes: {type: [kind, size...]}, sw (stroke half-width, px),
  c_good, c_low (1-sigma centre scatter in px for a good and for a low or
  joint fit; defaults 0.8 and 1.5), low (score below which a fit is low,
  default 0.6), search (px, default 4),
  conditions: free text copied to every row (e.g. the panel's Mach number),
  symbols: list of
    {"id", "series", "type", "at": [x, y]}                     fitted alone
    + "pair": id of another symbol, fitted jointly with it
    + "manual": [x, y, sigma_px]                                centre by eye on a pixel map
    + "merged": [x0, y0, x1, y1]                                ink not separable: no point is
                                                                read; the box's extent in data
                                                                values is reported instead
    + "legend": "no legend entry" (and anything else) copied to the notes
    + "note"
Pass 1 fits every glyph alone (pairs jointly); pass 2 refits each alone-
fitted glyph with every other glyph within 30 px held fixed in the model.
Writes OUT_PREFIX.json (everything) and OUT_PREFIX.csv (one row a symbol).
Error (about 2 sigma) per axis, in data units: sqrt((2 c)^2 + (2 loo)^2) px
times the local scale, c = c_good, or c_low for a low score or a joint fit,
or the manual sigma; loo = the calibration's leave-one-out rms on that axis.
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import calmap  # noqa: E402
import glyph  # noqa: E402

Image.MAX_IMAGE_PIXELS = None


def blob_box(ink, wm, x, y, win, thr=0.5, reach=10):
    """Bounding box (x0, y0, x1, y1) of the ink (ink > thr, gridline pixels left out) in the
    8-connected blobs that come within `reach` px of (x, y), searched within +-win px. (A glyph's
    centre dot is a blob of its own, so all blobs near the point are taken.)"""
    xi, yi = int(round(x)), int(round(y))
    sub = (ink[yi - win:yi + win + 1, xi - win:xi + win + 1] > thr) & (wm[yi - win:yi + win + 1, xi - win:xi + win + 1] > 0)
    yy, xx = np.mgrid[0:sub.shape[0], 0:sub.shape[1]]
    near = sub & (np.hypot(xx - win, yy - win) <= reach)
    seen = np.zeros_like(sub)
    stack = [tuple(p) for p in np.argwhere(near)]
    for a, b in stack:
        seen[a, b] = True
    while stack:
        a, b = stack.pop()
        for da in (-1, 0, 1):
            for db in (-1, 0, 1):
                u, v = a + da, b + db
                if 0 <= u < sub.shape[0] and 0 <= v < sub.shape[1] and sub[u, v] and not seen[u, v]:
                    seen[u, v] = True
                    stack.append((u, v))
    ys, xs = np.nonzero(seen)
    return (int(xi - win + xs.min()), int(yi - win + ys.min()), int(xi - win + xs.max()), int(yi - win + ys.max()))


def main():
    cfg = json.load(open(sys.argv[1]))[sys.argv[2]]
    cal = calmap.Cal(sys.argv[3])
    out = sys.argv[4]
    g = np.array(Image.open(cfg["page"]).convert("L"), float)
    pts = ([s["at"] for s in cfg["symbols"] if "at" in s] + [s["merged"][:2] for s in cfg["symbols"] if "merged" in s]
           + [s["manual"][:2] for s in cfg["symbols"] if "manual" in s])
    X0 = int(min(p[0] for p in pts)) - 80
    Y0 = int(min(p[1] for p in pts)) - 80
    X1 = int(max(p[0] for p in pts)) + 80
    Y1 = int(max(p[1] for p in pts)) + 80
    ink = glyph.ink_map(g[Y0:Y1, X0:X1], cfg.get("bg"), cfg.get("dark"))
    c2 = calmap.Cal(sys.argv[3])
    for l in c2.V:
        l["a"] = l["a"] - X0 + l["b"] * Y0
    for l in c2.H:
        l["a"] = l["a"] - Y0 + l["b"] * X0
    extra = [(e[0], e[1] - (X0 if e[0] == "v" else Y0), e[2], e[3]) for e in cfg.get("extra_lines", [])]
    wm = (~c2.mask(ink.shape, cfg.get("mask_rad", 2.0), extra)).astype(float)
    shapes = {k: tuple([v[0]] + [float(t) for t in v[1:]]) for k, v in cfg["shapes"].items()}
    sw = cfg.get("sw", 1.6)
    search = cfg.get("search", 4.0)
    low = cfg.get("low", 0.6)
    byid = {s["id"]: s for s in cfg["symbols"]}
    res = {}
    # pass 1
    for s in cfg["symbols"]:
        sid = s["id"]
        if sid in res or "merged" in s:
            continue
        if "manual" in s:
            res[sid] = {"x": s["manual"][0], "y": s["manual"][1], "how": "manual", "score": None, "sig": s["manual"][2]}
            continue
        ax, ay = s["at"][0] - X0, s["at"][1] - Y0
        if "pair" in s:
            o = byid[s["pair"]]
            sc, p, _ = glyph.fit_pair(ink, wm, shapes[s["type"]], (ax, ay), shapes[o["type"]],
                                      (o["at"][0] - X0, o["at"][1] - Y0), sw=sw, search=search)
            res[sid] = {"x": p[0] + X0, "y": p[1] + Y0, "how": "joint fit with " + o["id"], "score": round(sc, 3)}
            res[o["id"]] = {"x": p[2] + X0, "y": p[3] + Y0, "how": "joint fit with " + sid, "score": round(sc, 3)}
            continue
        sc, x, y = glyph.fit_one(ink, wm, shapes[s["type"]], ax, ay, sw=sw, search=search)
        res[sid] = {"x": x + X0, "y": y + Y0, "how": "fit alone", "score": round(sc, 3)}
    # pass 2: refit alone-fitted glyphs with neighbours held fixed
    for s in cfg["symbols"]:
        sid = s["id"]
        if sid not in res or res[sid]["how"] != "fit alone":
            continue
        r = res[sid]
        others = []
        for t in cfg["symbols"]:
            if t["id"] == sid or t["id"] not in res:
                continue
            q = res[t["id"]]
            if abs(q["x"] - r["x"]) < 30 and abs(q["y"] - r["y"]) < 30:
                others.append((shapes[t["type"]], q["x"] - X0, q["y"] - Y0))
        if others:
            sc, x, y = glyph.fit_one(ink, wm, shapes[s["type"]], s["at"][0] - X0, s["at"][1] - Y0, sw=sw,
                                     search=search, others=others)
            res[sid] = {"x": x + X0, "y": y + Y0, "how": "fit with %d neighbour(s) fixed" % len(others),
                        "score": round(sc, 3)}
    # pass 2b: refit joint pairs with every other glyph within 40 px held fixed
    done = set()
    for s in cfg["symbols"]:
        sid = s["id"]
        if "pair" not in s or sid in done:
            continue
        o = byid[s["pair"]]
        done |= {sid, o["id"]}
        r = res[sid]
        others = []
        for t in cfg["symbols"]:
            if t["id"] in (sid, o["id"]) or t["id"] not in res:
                continue
            q = res[t["id"]]
            if abs(q["x"] - r["x"]) < 40 and abs(q["y"] - r["y"]) < 40:
                others.append((shapes[t["type"]], q["x"] - X0, q["y"] - Y0))
        if others:
            sc, p, _ = glyph.fit_pair(ink, wm, shapes[s["type"]], (s["at"][0] - X0, s["at"][1] - Y0), shapes[o["type"]],
                                      (o["at"][0] - X0, o["at"][1] - Y0), sw=sw, search=search, others=others)
            how = "joint fit with %s, %d neighbour(s) fixed" % (o["id"], len(others))
            res[sid] = {"x": p[0] + X0, "y": p[1] + Y0, "how": how, "score": round(sc, 3)}
            res[o["id"]] = {"x": p[2] + X0, "y": p[3] + Y0, "how": how.replace(o["id"], sid), "score": round(sc, 3)}
    # check fits for centres read from pixel maps: the glyph's outline fitted from the manual centre,
    # with every other glyph within 30 px held fixed at its own centre
    checks = {}
    for s in cfg["symbols"]:
        sid = s["id"]
        if sid not in res or res[sid]["how"] != "manual" or not cfg.get("check_fit"):
            continue
        r = res[sid]
        others = [(shapes[t["type"]], res[t["id"]]["x"] - X0, res[t["id"]]["y"] - Y0) for t in cfg["symbols"]
                  if t["id"] != sid and t["id"] in res and abs(res[t["id"]]["x"] - r["x"]) < 30
                  and abs(res[t["id"]]["y"] - r["y"]) < 30]
        sc, x, y = glyph.fit_one(ink, wm, shapes[s["type"]], r["x"] - X0, r["y"] - Y0, sw=sw, search=3.0,
                                 others=others)
        checks[sid] = (round(x + X0 - r["x"], 2), round(y + Y0 - r["y"], 2), round(sc, 3))
    rows = []
    for s in cfg["symbols"]:
        sid = s["id"]
        notes = "; ".join(v for v in (s.get("legend"), s.get("note")) if v)
        row = {"id": sid, "series": s.get("series", ""), "symbol": s["type"], "conditions": cfg.get("conditions", "")}
        if "merged" in s:
            m = s["merged"]
            if len(m) == 2:
                x0, y0, x1, y1 = blob_box(ink, wm, m[0] - X0, m[1] - Y0, cfg.get("blob_win", 16))
                x0, y0, x1, y1 = x0 + X0, y0 + Y0, x1 + X0, y1 + Y0
            else:
                x0, y0, x1, y1 = m
            s["merged_box"] = [x0, y0, x1, y1]
            # every glyph lies wholly inside the merged ink, so each centre lies inside the box shrunk by
            # the smallest glyph's outer half-size (less 1 px for the ink threshold)
            hs = cfg.get("merged_shrink", 6.0)
            a = cal.value(x0 + hs, y1 - hs)
            b = cal.value(x1 - hs, y0 + hs)
            row.update({"x_val": "", "x_err": "", "y_val": "", "y_err": "", "px_x": "", "px_y": "",
                        "how": "merged ink, not separated: no point read; extent = where every centre must lie",
                        "score": "", "extent_x": "%.4f..%.4f" % (min(a[0], b[0]), max(a[0], b[0])),
                        "extent_y": "%.4f..%.4f" % (min(a[1], b[1]), max(a[1], b[1])),
                        "ink_box_px": [x0, y0, x1, y1], "notes": notes})
            rows.append(row)
            continue
        r = res[sid]
        X, Y, sx, sy = cal.value(r["x"], r["y"])
        if r["how"] == "manual":
            c = r["sig"]
            if sid in checks:
                # where the outline fit and the pixel-map centre disagree by more than the stated sigma,
                # the sigma is raised to the disagreement, so the error covers both
                c = max(c, abs(checks[sid][0]), abs(checks[sid][1]))
        elif r["how"].startswith("joint") or (r["score"] is not None and r["score"] < low):
            c = cfg.get("c_low", 1.5)
        else:
            c = cfg.get("c_good", 0.8)
        ex = np.hypot(2 * c, 2 * cal.loo_x) * sx
        ey = np.hypot(2 * c, 2 * cal.loo_y) * sy
        row.update({"x_val": round(X, 4), "x_err": round(float(ex), 4), "y_val": round(Y, 4),
                    "y_err": round(float(ey), 4), "px_x": round(r["x"], 2), "px_y": round(r["y"], 2),
                    "how": r["how"], "score": r["score"], "extent_x": "", "extent_y": "", "ink_box_px": "",
                    "check_fit_dx_px": checks.get(sid, ("", "", ""))[0], "check_fit_dy_px": checks.get(sid, ("", "", ""))[1],
                    "check_fit_score": checks.get(sid, ("", "", ""))[2], "notes": notes})
        rows.append(row)
    keys = ["id", "series", "symbol", "conditions", "x_val", "x_err", "y_val", "y_err", "px_x", "px_y", "how",
            "score", "extent_x", "extent_y", "ink_box_px", "check_fit_dx_px", "check_fit_dy_px", "check_fit_score", "notes"]
    with open(out + ".csv", "w", newline="") as f:
        w = csv.DictWriter(f, keys, restval="")
        w.writeheader()
        w.writerows(rows)
    json.dump({"key": sys.argv[2], "rows": rows}, open(out + ".json", "w"), indent=1)
    for r in rows:
        print(r["id"], r["series"], r["symbol"], r["x_val"], r["x_err"], r["y_val"], r["y_err"], r["px_x"], r["px_y"],
              r["how"], r["score"], r["extent_x"], r["extent_y"], r.get("check_fit_dx_px", ""), r.get("check_fit_dy_px", ""),
              r.get("check_fit_score", ""))


if __name__ == "__main__":
    main()
