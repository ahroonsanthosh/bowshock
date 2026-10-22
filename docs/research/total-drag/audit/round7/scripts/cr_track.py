"""Track the faired curves of NASA CR-149372 fig. 8b (PDF p. 26, 600 dpi).

usage: python3 -I cr_track.py PAGE.png CALIB.json TRI.json OUT_tracks.json

The scan is a halftone; it is box-blurred (radius 2) before measuring.
Each curve is measured in segments: column by column where it is flat
(theta near 0 and beyond 90 deg) and row by row where it is steep. Anchor
points read by eye from ink-peak lists (peaks2.py) and the matched
symbols give a first prediction; in each column (row) the ink peak nearest
the prediction within 6 px is centroided; the prediction is then replaced by
a running local line fit and the pass repeated (three passes). Flags:
'grid' within 10 px of a gridline crossing the measuring direction (the
gridline would merge with the curve), 'symbol' within 30 px of a matched
triangle centre or where the ink run is wider than 24 px (a symbol of
another curve or of this one), 'merged' where another curve's prediction is
within 22 px.

Curves: M1.2 (through the triangles), M1.1 (through the squares), M1.0
(through the circles). M1.1 and M1.0 are tracked only over the steep part,
to check that the M1.2 track never jumps to them.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402
import localgrid  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

# (curve, mode, list of anchors (along, across)); along = x for 'col', y for 'row'
SEGMENTS = [
    ("M1.2", "col", [(1655, 2101), (1700, 2095), (1755, 2112), (1800, 2149), (1846, 2180), (1870, 2215)]),
    ("M1.2", "row", [(2200, 1872), (2300, 1920), (2400, 1976), (2500, 2021), (2600, 2064), (2700, 2109),
                     (2800, 2155), (2900, 2186), (3000, 2222), (3100, 2254), (3200, 2296), (3300, 2324),
                     (3400, 2360), (3500, 2397), (3600, 2433), (3700, 2467), (3800, 2498), (3900, 2533),
                     (4000, 2568), (4100, 2603), (4200, 2634), (4300, 2668), (4400, 2702), (4500, 2742),
                     (4600, 2781), (4700, 2821), (4800, 2867), (4900, 2919), (5000, 2967), (5100, 3022),
                     (5180, 3075)]),
    ("M1.2", "col", [(3040, 5090), (3080, 5150), (3110, 5200), (3160, 5262), (3210, 5268), (3260, 5258),
                     (3300, 5245), (3330, 5240)]),
    ("M1.1", "row", [(2400, 1910), (2500, 1961), (2600, 1996), (2700, 2063), (2800, 2107), (2900, 2146),
                     (3000, 2183), (3100, 2199), (3200, 2241), (3300, 2276), (3400, 2308), (3500, 2343),
                     (3600, 2373), (3700, 2405), (3800, 2433), (3900, 2464), (4000, 2494), (4100, 2523),
                     (4200, 2553), (4300, 2585), (4400, 2618)]),
    ("M1.0", "row", [(2500, 1913), (2600, 1961), (2700, 2007), (2800, 2061), (2900, 2088), (3000, 2121),
                     (3100, 2156), (3200, 2189), (3300, 2219), (3400, 2255), (3500, 2292), (3600, 2326),
                     (3700, 2358), (3800, 2371), (3900, 2420), (4000, 2450), (4100, 2479), (4200, 2508),
                     (4300, 2532), (4400, 2552)]),
]


def peak_near(prof, coords, pred, search=6.0, cw=7.0, min_peak=90.0):
    cand = [i for i in range(1, len(prof) - 1) if prof[i] >= prof[i - 1] and prof[i] >= prof[i + 1]
            and prof[i] > min_peak and abs(coords[i] - pred) <= search]
    if not cand:
        return None
    i = min(cand, key=lambda k: abs(coords[k] - pred))
    win = np.abs(coords - coords[i]) <= cw
    w = np.clip(prof[win] - 0.25 * prof[i], 0, None)
    c = float((coords[win] * w).sum() / w.sum())
    # width of the run above half peak
    half = prof > 0.5 * prof[i]
    a = i
    while a > 0 and half[a - 1]:
        a -= 1
    b = i
    while b < len(prof) - 1 and half[b + 1]:
        b += 1
    return c, float(prof[i]), int(b - a + 1)


def main():
    page, calib, trif, out = sys.argv[1:5]
    d = 255.0 - np.asarray(Image.open(page).convert("L").filter(ImageFilter.BoxBlur(2))).astype(float)
    g = localgrid.LocalGrid.load(calib)
    tris = json.load(open(trif))
    vl = [g.vline(k) for k in range(len(g.vvals))]
    hl = [g.hline(j) for j in range(len(g.hvals))]
    preds = {}
    tracks = {}
    for name, mode, anc in SEGMENTS:
        al = np.array([a[0] for a in anc], float)
        ac = np.array([a[1] for a in anc], float)
        rng = range(int(al[0]), int(al[-1]) + 1)
        pred = {s: float(np.interp(s, al, ac)) for s in rng}
        pts = {}
        for _ in range(3):
            pts = {}
            for s in rng:
                p = pred[s]
                lo = int(p) - 20
                coords = np.arange(lo, lo + 41, dtype=float)
                prof = d[s, lo:lo + 41] if mode == "row" else d[lo:lo + 41, s]
                r = peak_near(prof, coords, p)
                if r:
                    pts[s] = r
            ss = np.array(sorted(pts), float)
            vv = np.array([pts[int(s)][0] for s in ss])
            wide = np.array([pts[int(s)][2] > 24 for s in ss])
            for s in rng:
                sel = (np.abs(ss - s) <= 15) & ~wide
                if sel.sum() >= 8:
                    c = np.polyfit(ss[sel], vv[sel], 1)
                    pred[s] = float(np.polyval(c, s))
        preds[(name, mode, int(al[0]))] = pred
        lst = tracks.setdefault(name, [])
        for s, (c, pk, wd) in sorted(pts.items()):
            x, y = (c, float(s)) if mode == "row" else (float(s), c)
            flag = []
            if mode == "row":
                if any(abs(y - float(f(x))) < 10 for f in hl):
                    flag.append("grid")
            else:
                if any(abs(x - float(f(y))) < 10 for f in vl):
                    flag.append("grid")
            if wd > 24 or any(np.hypot(x - t["x"], y - t["y"]) < 30 for t in tris):
                flag.append("symbol")
            lst.append(dict(x=x, y=y, mode=mode, peak=pk, width=wd, flag=",".join(flag)))
    # merged: another curve's track within 22 px in the same row
    rows = {}
    for name, pts in tracks.items():
        for p in pts:
            if p["mode"] == "row":
                rows.setdefault(int(p["y"]), []).append((name, p))
    for y, lst in rows.items():
        for n1, p1 in lst:
            for n2, p2 in lst:
                if n1 != n2 and abs(p1["x"] - p2["x"]) < 22:
                    p1["flag"] = ",".join(filter(None, [p1["flag"], "merged"]))
    for name, pts in tracks.items():
        for p in pts:
            p["theta"], p["Cp"] = g.to_data(p["x"], p["y"])
        pts.sort(key=lambda p: p["theta"])
        nf = sum(1 for p in pts if p["flag"])
        print(name, len(pts), "points,", nf, "flagged; theta %.2f to %.2f" % (pts[0]["theta"], pts[-1]["theta"]))
    with open(out, "w") as f:
        json.dump(tracks, f)


if __name__ == "__main__":
    main()
