"""Envelope of each stack of overlapping symbols at a station: the centres
of its topmost and bottommost symbols, and the number of symbols the stack
holds by its height.

Inside an open circle or square of half-size r centred on the station
column X, both sides of the outline cross the rows: ink near X - r and near
X + r. Rows with ink on both sides (within +-tol px of X +- r, gridlines
removed) are "inside a symbol". Contiguous groups of such rows (gaps under
gap px joined) are stacks; a stack's top symbol centre is its first row
plus r, its bottom symbol centre its last row less r (diamonds, wider at
mid-height, fit the same rows to within a few px; their tips are not
used). Symbols drawn off the station column by more than tol are missed.

Usage: python3 -I stacks.py <spec.json> <csv to append to>
spec["stacks"]: {"stations": [...], "r": 16, "tol": 5, "gap": 6,
                 "ylo": page y, "yhi": page y, "bands": [[y0, y1, label]]}
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

from fig import from_spec  # noqa: E402


def main():
    spec = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    f = from_spec(spec)
    bx = spec["box"]
    S = spec["stacks"]
    r, tol, gap = S.get("r", 16), S.get("tol", 5), S.get("gap", 6)
    cal = f.cal_report()
    uy = cal["y_per_px"]
    ylo, yhi = S["ylo"] - bx[1], S["yhi"] - bx[1]
    rows = []
    m = f.clean.copy()
    # blank the words of the page's text layer (labels such as "boattail
    # base"), words of at least three characters with two letters
    import re
    import subprocess
    txt = subprocess.run(["pdftotext", "-f", str(spec["page"]), "-l", str(spec["page"]), "-bbox", spec["pdf"], "-"],
                         capture_output=True, text=True).stdout
    k = 600.0 / 72.0
    nblank = 0
    for mm in re.finditer(r'xMin="([0-9.]+)" yMin="([0-9.]+)" xMax="([0-9.]+)" yMax="([0-9.]+)">([^<]*)<', txt):
        w = mm.group(5)
        if len(w) >= 3 and sum(ch.isalpha() for ch in w) >= 2:
            x0, y0, x1, y1 = (float(mm.group(i)) * k for i in range(1, 5))
            a0, a1 = int(x0 - bx[0] - 6), int(x1 - bx[0] + 6)
            b0, b1 = int(y0 - bx[1] - 6), int(y1 - bx[1] + 6)
            if a1 > 0 and b1 > 0 and a0 < m.shape[1] and b0 < m.shape[0]:
                m[max(0, b0):b1, max(0, a0):a1] = False
                nblank += 1
    print("text-layer words blanked:", nblank)
    for st in S["stations"]:
        X = int(round(f.ax.pixel(st, 0.5 * (ylo + yhi))))
        inside = []
        for y in range(ylo, yhi):
            left = m[y, X - r - tol:X - r + tol + 1].any()
            right = m[y, X + r - tol:X + r + tol + 1].any()
            centre = m[y, X - r + tol + 2:X + r - tol - 1].sum()
            inside.append(left and right and centre < 2 * r - 2 * tol)
        inside = np.array(inside)
        ys = np.nonzero(inside)[0]
        if len(ys) == 0:
            continue
        groups = [[ys[0], ys[0]]]
        for y in ys[1:]:
            if y - groups[-1][1] <= gap:
                groups[-1][1] = y
            else:
                groups.append([y, y])
        for g0, g1 in groups:
            h = g1 - g0 + 1
            if h < r:  # a crossing, not a symbol
                continue
            n_est = max(1, int(round((h - 2 * r) / (0.6 * r)) + 1)) if h > 2 * r else 1
            tops = [(g0 + ylo + r * 0.9, "top")] if n_est > 1 else [((g0 + g1) / 2.0 + ylo, "single")]
            if n_est > 1:
                tops.append((g1 + ylo - r * 0.9, "bottom"))
            for Y, which in tops:
                xv, yv = f.data(X, Y)
                lab = ""
                for b0, b1, name in S.get("bands", []):
                    if min(b0, b1) <= yv <= max(b0, b1):
                        lab = name
                err = float(np.hypot(4 * uy, 0.5 * uy))
                rows.append([spec["figure"], f"stack {which} symbol" + (f" / {lab}" if lab else ""), f"{st:g}",
                             f"{yv:.4f}", f"{err:.4f}",
                             f"stack envelope; stack height {h} px, about {n_est} symbols; series not identified"])
    with open(out, "a") as fh:
        for rr in rows:
            fh.write(",".join(rr) + "\n")
    for rr in rows:
        print(",".join(rr[1:5]))


if __name__ == "__main__":
    main()
