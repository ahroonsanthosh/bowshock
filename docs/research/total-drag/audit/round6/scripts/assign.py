"""Assign scanned symbols to the curve they lie on, for figures that draw
several curves on shifted origins (TN 2960 fig. 5(b)): each curve has a
hand path (data x, page y) and an offset added to the axis value to give
the curve's own value. A symbol goes to the curve whose path passes
nearest it (in page px, at the symbol's x); its value becomes axis value +
offset. Rows farther than max_px from every path are dropped (legend,
specks). Guided rows (the curves read on their own ink) get their offset
too. Rewrites the csv.

Usage: python3 -I assign.py <spec.json> <csv>
spec["assign"]: {"max_px": 30, "curves": [{"name", "path": [[x, page y]...], "offset"}]}
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

from fig import from_spec  # noqa: E402


def main():
    spec = json.load(open(sys.argv[1]))
    path = sys.argv[2]
    f = from_spec(dict(spec))
    bx = spec["box"]
    A = spec["assign"]
    rows = list(csv.DictReader(open(path)))
    out = []
    for r in rows:
        if not r["y"]:
            out.append(r)
            continue
        x, y = float(r["x"]), float(r["y"])
        gname = None
        for c in A["curves"]:
            if r["series"].startswith(c["name"]):
                gname = c
        X, Y = f.px(x, y)
        Y += bx[1]
        if gname is None:
            best = None
            for c in A["curves"]:
                px = np.array([p[0] for p in c["path"]], float)
                py = np.array([p[1] for p in c["path"]], float)
                if not (px.min() - 3 <= x <= px.max() + 3):
                    continue
                d = abs(np.interp(x, px, py) - Y)
                if best is None or d < best[0]:
                    best = (d, c)
            if best is None or best[0] > A.get("max_px", 30):
                continue
            c = best[1]
            r["series"] = f"{c['name']} {r['series']}"
            r["how"] += f"; on the {c['name']} curve ({best[0]:.0f} px from its path)"
        else:
            c = gname
        r["y"] = f"{y + c['offset']:.4f}"
        r["how"] += f"; axis value {y:.4f} + origin shift {c['offset']:g}"
        out.append(r)
    with open(path, "w") as fh:
        w = csv.DictWriter(fh, fieldnames=["figure", "series", "x", "y", "err_y", "how"])
        w.writeheader()
        for r in out:
            w.writerow(r)
    print(len(out), "rows")


if __name__ == "__main__":
    main()
