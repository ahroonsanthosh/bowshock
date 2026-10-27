"""Per-station look at stacks of overlapping symbols on a pressure plot.

Usage: python -I stations.py PAGE.png SPEC.json OUT.json TILES.png
SPEC: {"thr": 128, "open": 3, "r": 9.0, "band": 6, "minsec": 24,
       "stations": [{"id": "s1", "x": 812.0, "y0": 480, "y1": 580}, ...]}
For each station: rows (in y0..y1) where opened ink (lines thinner
than `open` removed) lies within x +- band are grouped into runs
(separate stacks, a gap of >= 3 rows splits them); for each run the top
and bottom rows are reported.  Circles of radius r (stroke centre) are
searched along the station (x +- 4 px, all y in the run +- r) with the
sector method of circles.py; candidates with >= minsec of 36 sectors are
listed.  A tile per station (raw page, 6x) with the runs marked (blue
ticks) and circle candidates (red) is written into one strip image.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def ridges(g, thr):
    r = np.zeros(g.shape, bool)
    h = (g[:, 1:-1] <= g[:, :-2]) & (g[:, 1:-1] <= g[:, 2:])
    v = (g[1:-1, :] <= g[:-2, :]) & (g[1:-1, :] <= g[2:, :])
    r[:, 1:-1] |= h
    r[1:-1, :] |= v
    return r & (g < thr)


def circle_scan(img, xc, ya, yb, R, thr, minsec):
    m = int(R + 6)
    X0, Y0 = int(xc) - m - 5, int(ya) - m
    sub = img[Y0:int(yb) + m + 1, X0:int(xc) + m + 6]
    rg = ridges(ndimage.gaussian_filter(sub, 0.6), thr)
    ys, xs = np.nonzero(rg)
    xs = xs + X0
    ys = ys + Y0
    out = []
    best = {}
    for cy in np.arange(ya, yb + 0.01, 0.5):
        for cx in np.arange(xc - 4, xc + 4.01, 0.5):
            d = np.abs(np.hypot(xs - cx, ys - cy) - R)
            sel = d <= 1.0
            if not sel.any():
                continue
            ang = (np.degrees(np.arctan2(-(ys[sel] - cy), xs[sel] - cx)) % 360) // 10
            n = len(np.unique(ang))
            if n >= minsec:
                out.append((n, cx, cy))
    # cluster candidates (within 2 px) keep the best, mean of ties
    out.sort(reverse=True)
    kept = []
    for n, cx, cy in out:
        if all(abs(cy - k[2]) > 3 or abs(cx - k[1]) > 3 for k in kept):
            ties = [(x, y) for nn, x, y in out if nn == n and abs(y - cy) <= 3 and abs(x - cx) <= 3]
            mx = np.mean([t[0] for t in ties])
            my = np.mean([t[1] for t in ties])
            kept.append((n, mx, my))
    kept.sort(key=lambda k: k[2])
    return kept


def main():
    page, specf, outf, tilef = sys.argv[1:5]
    spec = json.load(open(specf))
    img = np.asarray(Image.open(page).convert("L"), float)
    rgb = Image.open(page).convert("RGB")
    thr = spec.get("thr", 128)
    op = spec.get("open", 3)
    R = spec.get("r", 9.0)
    band = spec.get("band", 6)
    minsec = spec.get("minsec", 24)
    res = []
    tiles = []
    for st in spec["stations"]:
        xc, y0, y1 = st["x"], st["y0"], st["y1"]
        X0, X1 = int(xc) - 30, int(xc) + 31
        sub = img[y0:y1, X0:X1] < thr
        o = ndimage.binary_opening(sub, structure=np.ones((op, op)))
        lab, n = ndimage.label(o)
        b0, b1 = 30 - band, 30 + band + 1
        ids = set(np.unique(lab[:, b0:b1])) - {0}
        keep = np.isin(lab, list(ids))
        rows = np.nonzero(keep[:, b0:b1].any(axis=1))[0]
        runs = []
        if len(rows):
            s = rows[0]
            p = rows[0]
            for r in rows[1:]:
                if r - p >= 3:
                    runs.append((s + y0, p + y0))
                    s = r
                p = r
            runs.append((s + y0, p + y0))
        circ = []
        for a, b in runs:
            circ += circle_scan(img, xc, a, b, R, thr + 40, minsec)
        res.append({"id": st["id"], "x": xc, "runs": [[int(a), int(b)] for a, b in runs], "circles": [[int(n), round(float(x), 2), round(float(y), 2)] for n, x, y in circ]})
        z = 6
        if runs:
            ty0, ty1 = max(y0, runs[0][0] - 15), min(y1, runs[-1][1] + 15)
        else:
            ty0, ty1 = y0, min(y1, y0 + 40)
        t = rgb.crop((X0, ty0, X1, ty1)).resize(((X1 - X0) * z, (ty1 - ty0) * z), Image.NEAREST)
        d = ImageDraw.Draw(t)
        for a, b in runs:
            for yy in (a, b):
                d.line([(0, (yy - ty0) * z), (25, (yy - ty0) * z)], fill=(0, 90, 255), width=2)
        for n, cx, cy in circ:
            q = [((cx - X0 + R * np.cos(th)) * z + z / 2, (cy - ty0 + R * np.sin(th)) * z + z / 2) for th in np.linspace(0, 2 * np.pi, 60)]
            d.line(q, fill=(255, 0, 0), width=1)
            d.text(((cx - X0) * z + R * z + 4, (cy - ty0) * z - 6), "%d" % n, fill=(255, 0, 0))
        lab_im = Image.new("RGB", (t.size[0], 14), (255, 255, 255))
        ImageDraw.Draw(lab_im).text((2, 1), st["id"], fill=(0, 0, 0))
        tt = Image.new("RGB", (t.size[0], t.size[1] + 14), (255, 255, 255))
        tt.paste(lab_im, (0, 0))
        tt.paste(t, (0, 14))
        tiles.append(tt)
    json.dump(res, open(outf, "w"), indent=1)
    W = sum(t.size[0] + 6 for t in tiles)
    H = max(t.size[1] for t in tiles)
    S = Image.new("RGB", (W, H), (255, 200, 200))
    x = 0
    for t in tiles:
        S.paste(t, (x, 0))
        x += t.size[0] + 6
    S.save(tilef)
    for r in res:
        print(r["id"], "x=%.1f" % r["x"], "runs", r["runs"], "circles", r["circles"])


if __name__ == "__main__":
    main()
