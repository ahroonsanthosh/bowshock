"""Check, on a figure's legend glyphs, where the centre dot sits relative to
0008's centroid rule: the bounding-box centre (and, for triangles, the point
one third of the height above the base). Prints offsets in render px.

Usage: python3 -I legendcheck.py <spec.json>
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import dig  # noqa: E402
import dots  # noqa: E402
from fig import SCRATCH  # noqa: E402


def main():
    spec = json.load(open(sys.argv[1]))
    nid = spec["ntrs"]
    png = dig.render(f"{SCRATCH}/dl/{nid}/{nid}.pdf", spec["page"], f"{SCRATCH}/work/{nid}")
    full = dig.dark(dig.load(png), spec.get("thr", 0.55))
    D = spec["dots"]
    R = D.get("R", 40)
    for L in D["legend"]:
        X, Y = L["at"]
        bl = dots.dot_blobs(full, (X - 30, Y - 30, X + 31, Y + 31), D.get("dot_min", 3), D.get("dot_max", 16))
        cx, cy, w, h, n = min(bl, key=lambda q: (q[0] - X) ** 2 + (q[1] - Y) ** 2)
        g = dots.glyph(full, cx, cy, R, max(w, h) / 2 + 2)
        # the outline: the component of g nearest the centre
        comps, lab = dig.components(g, min_px=20)
        if not comps:
            print(L["series"], "no outline")
            continue
        c = max(comps, key=lambda q: q["n"])
        x0, y0, x1, y1 = c["bbox"]
        bxc, byc = 0.5 * (x0 + x1) - R, 0.5 * (y0 + y1) - R
        third = (y1 - (y1 - y0) / 3.0) - R
        print(f"{L['series']}: bbox {x1 - x0 + 1}x{y1 - y0 + 1} px; dot - bbox centre = ({-bxc:+.1f}, {-byc:+.1f}) px;"
              f" dot - (1/3 height above base) = {-third:+.1f} px")


if __name__ == "__main__":
    main()
