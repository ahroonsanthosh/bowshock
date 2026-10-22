"""Add guided curve reads to a spec, the paths built from the symbols already
read for it: for each series prefix, the symbols' (x, page y), sorted by x,
are the path that picks the faired curve's ink (the curve passes through
its symbols). The reading itself is the curve's ink (read.py "guided").

Usage: python3 -I mkguide.py <spec.json> <csv> <series prefix::curve name> ... --xs x0 x1 step [--halfwin h]
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

from fig import from_spec  # noqa: E402


def main():
    a = sys.argv[1:]
    sp, cv = a[0], a[1]
    i = a.index("--xs")
    pairs = [p.split("::", 1) for p in a[2:i]]
    x0, x1, st = (float(v) for v in a[i + 1:i + 4])
    hw = float(a[a.index("--halfwin") + 1]) if "--halfwin" in a else 8
    MINSC = float(a[a.index("--minscore") + 1]) if "--minscore" in a else 0.85
    spec = json.load(open(sp))
    f = from_spec(dict(spec))
    bx = spec["box"]
    rows = [r for r in csv.DictReader(open(cv)) if r["y"] and r["x"] and "score" in r["how"]
            and float(r["how"].split("score ")[1].split(";")[0]) >= MINSC]
    g = []
    for pre, name in pairs:
        pts = sorted((float(r["x"]), float(r["y"])) for r in rows if r["series"].startswith(pre))
        path = []
        for x, y in pts:
            X, Y = f.px(x, y)
            path.append([round(x, 3), round(Y + bx[1], 1)])
        xs = [round(v, 4) for v in np.arange(x0, x1 + 1e-9, st) if pts[0][0] - 1e-9 <= v <= pts[-1][0] + 1e-9]
        g.append({"series": name, "path": path, "xs": xs, "halfwin": hw, "max_run": 30})
    spec["guided"] = g
    json.dump(spec, open(sp, "w"), indent=1)
    print("guided", [(q["series"], len(q["path"]), len(q["xs"])) for q in g])


if __name__ == "__main__":
    main()
