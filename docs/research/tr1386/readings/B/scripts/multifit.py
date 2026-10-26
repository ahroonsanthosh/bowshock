"""Joint fit of a cluster of overlapping hollow symbols (outlines drawn transparently).

usage: python3 -I multifit.py PAGE IN.csv OUT.csv OVERLAY.png [SEARCH] [ROUNDS]
IN.csv: id,shape,x,y,size   (size: symbol size parameter as in symfit; fixed during the fit)
Model: union of all outlines should be dark, union of interiors (minus outlines) light.
Coordinate-wise search: each symbol moved within +-SEARCH px (0.5 px steps in a final pass)
holding the others fixed, for ROUNDS rounds.
For each symbol the output also gives 'own': mean darkness on the outline pixels that belong
to that symbol only (not shared with any other symbol's outline). Low 'own' means weak evidence.
"""
import sys
import os
import csv
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import symfit  # noqa: E402

THICK = 2.2


def masks(shape, cx, cy, s, X, Y):
    r = symfit.shape_dist(shape, X - cx, Y - cy, s)
    band = THICK / s
    return np.abs(r - 1.0) <= band / 2, r <= 1.0 - band * 1.2


def total(sub, X, Y, syms):
    O = np.zeros(sub.shape, bool)
    I = np.zeros(sub.shape, bool)
    for (shp, x, y, s) in syms:
        o, i = masks(shp, x, y, s, X, Y)
        O |= o
        I |= i
    I &= ~O
    return sub[O].mean() - sub[I].mean()


def main():
    page = int(sys.argv[1])
    inp, outp, ov = sys.argv[2], sys.argv[3], sys.argv[4]
    search = int(sys.argv[5]) if len(sys.argv) > 5 else 3
    rounds = int(sys.argv[6]) if len(sys.argv) > 6 else 3
    rows = list(csv.DictReader(open(inp)))
    syms = [[r["shape"], float(r["x"]), float(r["y"]), float(r["size"])] for r in rows]
    g, d = symfit.load(page)
    R = 30
    x0 = int(min(s[1] for s in syms)) - R
    x1 = int(max(s[1] for s in syms)) + R
    y0 = int(min(s[2] for s in syms)) - R
    y1 = int(max(s[2] for s in syms)) + R
    sub = d[y0:y1, x0:x1]
    Y, X = np.mgrid[y0:y1, x0:x1].astype(np.float64)
    best = total(sub, X, Y, syms)
    for rnd in range(rounds + 1):
        steps = [(dx, dy) for dx in range(-search, search + 1) for dy in range(-search, search + 1)]
        if rnd == rounds:
            steps = [(dx, dy) for dx in (-0.5, 0, 0.5) for dy in (-0.5, 0, 0.5)]
        for k in range(len(syms)):
            bx, by = syms[k][1], syms[k][2]
            cand = (best, bx, by)
            for dx, dy in steps:
                syms[k][1], syms[k][2] = bx + dx, by + dy
                sc = total(sub, X, Y, syms)
                if sc > cand[0]:
                    cand = (sc, bx + dx, by + dy)
            best, syms[k][1], syms[k][2] = cand
    # own-evidence
    outs = [masks(s[0], s[1], s[2], s[3], X, Y)[0] for s in syms]
    res = []
    for k, s in enumerate(syms):
        others = np.zeros(sub.shape, bool)
        for j, o in enumerate(outs):
            if j != k:
                others |= o
        own = outs[k] & ~others
        res.append(dict(id=rows[k]["id"], shape=s[0], x=round(s[1], 1), y=round(s[2], 1), size=s[3],
                        own=round(float(sub[own].mean()) if own.sum() else 0.0, 2),
                        ownfrac=round(float(own.sum() / max(outs[k].sum(), 1)), 2)))
    with open(outp, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(res[0].keys()))
        w.writeheader()
        w.writerows(res)
    print(f"total score {best:.3f}")
    for r in res:
        print(r)
    sc = 8
    im = Image.fromarray(g[y0:y1, x0:x1].astype(np.uint8)).convert("RGB")
    im = im.resize((im.width * sc, im.height * sc), Image.NEAREST)
    dr = ImageDraw.Draw(im)
    cols = [(255, 0, 0), (0, 150, 255), (0, 170, 0), (255, 0, 255), (255, 140, 0), (0, 200, 200)]
    for k, s in enumerate(syms):
        pts = symfit.outline_points(s[0], (s[1] - x0 + 0.5) * sc, (s[2] - y0 + 0.5) * sc, s[3] * sc)
        dr.polygon(pts, outline=cols[k % len(cols)])
        dr.text(((s[1] - x0) * sc, (s[2] - y0) * sc), res[k]["id"], fill=cols[k % len(cols)])
    im.save(ov)


if __name__ == "__main__":
    main()
