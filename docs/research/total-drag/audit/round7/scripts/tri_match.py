"""Find and centre triangle symbols on a halftone scan by template matching.

usage: python3 -I tri_match.py PAGE.png CALIB.json OUT.json x0 y0 x1 y1 [--list x,y;x,y;...]

A synthetic triangle outline is drawn from geometry measured on a clean
symbol of NASA CR-149372 fig. 8b (centre-line apex to base 44 px, centre-line
base width 54 px, stroke 10 px, at 600 dpi), blurred like the page (box
radius 2), and correlated (normalised, zero-mean) with the blurred page. The
template's reference point is the centroid of its three centre-line
vertices, so every match returns a symbol centroid. With --list, each given
approximate centre is refined within +-14 px; otherwise every local maximum
of the correlation above 0.55 inside the box is reported.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter  # noqa: E402
import localgrid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None
H, BW, SW = 44.0, 54.0, 10


def template():
    W, Hh = 90, 80
    im = Image.new("L", (W, Hh), 0)
    dr = ImageDraw.Draw(im)
    cx = W / 2.0
    apex = (cx, 12.0)
    bl = (cx - BW / 2, 12.0 + H)
    br = (cx + BW / 2, 12.0 + H)
    for a, b in ((apex, bl), (apex, br), (bl, br)):
        dr.line((a, b), fill=255, width=SW)
    t = np.asarray(im.filter(ImageFilter.BoxBlur(2))).astype(float)
    ref = (cx, (apex[1] + 2 * bl[1]) / 3.0)
    return t, ref


def ncc_map(d, t, x0, y0, x1, y1):
    th, tw = t.shape
    tz = t - t.mean()
    tn = np.sqrt((tz ** 2).sum())
    out = np.full((y1 - y0, x1 - x0), -1.0)
    for yy in range(y0, y1):
        for xx in range(x0, x1):
            p = d[yy:yy + th, xx:xx + tw]
            if p.shape != t.shape:
                continue
            pz = p - p.mean()
            den = np.sqrt((pz ** 2).sum()) * tn
            out[yy - y0, xx - x0] = (pz * tz).sum() / den if den > 0 else -1
    return out


def subpix(m, i, j):
    def par(a, b, c):
        den = a - 2 * b + c
        return 0.0 if den == 0 else 0.5 * (a - c) / den
    di = par(m[i - 1, j], m[i, j], m[i + 1, j]) if 0 < i < m.shape[0] - 1 else 0.0
    dj = par(m[i, j - 1], m[i, j], m[i, j + 1]) if 0 < j < m.shape[1] - 1 else 0.0
    return i + di, j + dj


def main():
    page, calib, out = sys.argv[1:4]
    bx0, by0, bx1, by1 = (int(v) for v in sys.argv[4:8])
    lst = None
    if "--list" in sys.argv:
        lst = [tuple(float(v) for v in s.split(",")) for s in sys.argv[sys.argv.index("--list") + 1].split(";")]
    d = 255.0 - np.asarray(Image.open(page).convert("L").filter(ImageFilter.BoxBlur(2))).astype(float)
    g = localgrid.LocalGrid.load(calib)
    t, ref = template()
    th, tw = t.shape
    res = []
    if lst:
        for ax, ay in lst:
            x0, y0 = int(ax - ref[0]) - 14, int(ay - ref[1]) - 14
            m = ncc_map(d, t, x0, y0, x0 + 29, y0 + 29)
            i, j = np.unravel_index(np.argmax(m), m.shape)
            si, sj = subpix(m, i, j)
            cx, cy = x0 + sj + ref[0], y0 + si + ref[1]
            res.append(dict(approx=(ax, ay), x=cx, y=cy, ncc=float(m[i, j]), data=g.to_data(cx, cy),
                            edge=bool(i in (0, 28) or j in (0, 28))))
    else:
        step = 3
        m = ncc_map(d[::1, ::1], t, bx0, by0, bx1, by1) if False else None
        # coarse search on a 3 px lattice, then refine
        cand = []
        for yy in range(by0, by1, step):
            for xx in range(bx0, bx1, step):
                p = d[yy:yy + th, xx:xx + tw]
                if p.shape != t.shape or p.max() < 80:
                    continue
                pz = p - p.mean()
                tz = t - t.mean()
                den = np.sqrt((pz ** 2).sum() * (tz ** 2).sum())
                c = (pz * tz).sum() / den if den > 0 else -1
                if c > 0.5:
                    cand.append((c, xx, yy))
        cand.sort(reverse=True)
        kept = []
        for c, xx, yy in cand:
            if all(abs(xx - k[1]) > 30 or abs(yy - k[2]) > 30 for k in kept):
                kept.append((c, xx, yy))
        for c, xx, yy in kept:
            mm = ncc_map(d, t, xx - 4, yy - 4, xx + 5, yy + 5)
            i, j = np.unravel_index(np.argmax(mm), mm.shape)
            si, sj = subpix(mm, i, j)
            cx, cy = xx - 4 + sj + ref[0], yy - 4 + si + ref[1]
            res.append(dict(x=cx, y=cy, ncc=float(mm[i, j]), data=g.to_data(cx, cy)))
    res.sort(key=lambda r: r["x"])
    for r in res:
        print("x %.1f y %.1f ncc %.3f -> theta %.2f Cp %.4f %s" % (
            r["x"], r["y"], r["ncc"], r["data"][0], r["data"][1], "EDGE" if r.get("edge") else ""))
    with open(out, "w") as f:
        json.dump(res, f, indent=1)


if __name__ == "__main__":
    main()
