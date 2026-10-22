"""Edges of a band of merged ink (symbols and a line drawn over each other that
cannot be separated), read column by column (round 11, RM A51J25 fig. 7).

usage: python3 -I band_edges.py PAGE.png CALIB.json OUT.json seed_x,seed_y x_from x_to xstep_data \
           [mask x0,y0,x1,y1;...]

Ink = grey < 128. The band is the 8-connected ink component that contains
the seed pixel, after the mask boxes (open symbols touching the band, read
separately) are blanked. For every pixel column the band's top and bottom
ink rows are found; each is moved half a pixel outwards to the ink edge and
converted to data with the calibration. Rows are then reported at abscissae
x_from, x_from + xstep_data, ... (data units; nearest column), plus the
band's first and last columns inside the range. The reading is an envelope:
the ink's outer edges, not a symbol centre or a line centre.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import localgrid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None


def main():
    page, calib, out, seed = sys.argv[1:5]
    x_from, x_to, xstep = (float(v) for v in sys.argv[5:8])
    masks = [tuple(int(v) for v in b.split(",")) for b in sys.argv[8].split(";")] if len(sys.argv) > 8 else []
    g = localgrid.LocalGrid.load(calib)
    ink = np.asarray(Image.open(page).convert("L")) < 128
    ink = ink.copy()
    for x0, y0, x1, y1 in masks:
        ink[y0:y1 + 1, x0:x1 + 1] = False
    sx, sy = (int(v) for v in seed.split(","))
    if not ink[sy, sx]:
        raise SystemExit("seed is not on ink")
    comp = np.zeros_like(ink)
    stack = [(sy, sx)]
    comp[sy, sx] = True
    H, W = ink.shape
    while stack:
        y, x = stack.pop()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and ink[yy, xx] and not comp[yy, xx]:
                    comp[yy, xx] = True
                    stack.append((yy, xx))
    ys, xs = np.nonzero(comp)
    cols = {}
    for x in range(xs.min(), xs.max() + 1):
        r = ys[xs == x]
        if len(r):
            top, bot = r.min() - 0.5, r.max() + 0.5
            Mt, Pt = g.to_data(float(x), float(top))
            Mb, Pb = g.to_data(float(x), float(bot))
            cols[x] = dict(x_px=x, top_px=float(top), bottom_px=float(bot), x_top=Mt, y_top=Pt, x_bottom=Mb,
                           y_bottom=Pb)
    xcols = sorted(cols)
    inrange = [c for c in xcols if x_from - 1e-9 <= cols[c]["x_top"] <= x_to + 1e-9]
    res = []
    first, last = cols[xcols[0]], cols[inrange[-1]] if inrange else None
    res.append(dict(kind="first column", **first))
    v = x_from
    while v <= x_to + 1e-9:
        c = min(xcols, key=lambda k: abs(cols[k]["x_top"] - v))
        if abs(cols[c]["x_top"] - v) < 0.006:
            res.append(dict(kind="at abscissa", at=round(v, 4), **cols[c]))
        v += xstep
    if last:
        res.append(dict(kind="last column in range", **last))
    json.dump(res, open(out, "w"), indent=1)
    print("component: %d px, columns %d to %d" % (len(xs), xs.min(), xs.max()))
    for r in res:
        print("%-22s x %4d  M' %.4f  top %.1f -> %.4f  bottom %.1f -> %.4f" % (
            r["kind"], r["x_px"], r["x_top"], r["top_px"], r["y_top"], r["bottom_px"], r["y_bottom"]))


if __name__ == "__main__":
    main()
