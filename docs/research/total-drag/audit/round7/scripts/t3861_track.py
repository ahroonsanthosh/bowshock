"""Track the curves of NACA TN 3861 figs. 15 and 16 column by column.

usage: python3 -I t3861_track.py FIG PAGE.png CALIB.json SYMBOLS.json OUT_tracks.json

Same column method as tn3819_track.py (horizontal gridlines subtracted,
nearest ink peak to an anchor-interpolated prediction within 6 px, three
passes with a running local fit). Columns within 6 px of a vertical gridline
are skipped. Points within 36 px of a data symbol are flagged 'symbol';
points within 4.5 px of a horizontal gridline are flagged 'grid'.

Fig. 15: curve A, solid from M_c 1.0 then dashed to M_c 8.5 (dash pattern
long-long-short as the legend's "Oblique shock values"); curve B, the heavy
long-short-long line near 2.0 from M_c 7 (the legend's "Newtonian flow,
Grimminger's hypersonic approx."). Fig. 16: curve C, the dashed
"Delta p / q_c for zero pressure" line.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import localgrid  # noqa: E402
import tn3819_track  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

ANCHORS = {
    15: {
        "A": [(1552, 2185), (1600, 2142), (1700, 2032), (1800, 1958), (1900, 1890), (1990, 1842), (2100, 1816),
              (2200, 1794), (2350, 1764.5), (2500, 1744), (2550, 1735.2), (2650, 1721.8), (2800, 1709.2),
              (2900, 1701.4), (3000, 1696.4), (3150, 1689.5), (3300, 1682.9), (3520, 1674.1), (3700, 1668.5),
              (3950, 1661.2), (4300, 1654.9), (4550, 1651.0), (4750, 1645.3), (5050, 1641.4), (5080, 1640.8)],
        "B": [(4376, 1484), (4800, 1478), (5327, 1470)],
    },
    16: {
        "C": [(2900, 1962), (2950, 1940.3), (3100, 1874.3), (3306, 1809), (3500, 1770.3), (3700, 1736.8),
              (3900, 1713.2), (4100, 1694.5), (4300, 1681.3), (4500, 1671), (4700, 1662.6), (4767, 1661)],
    },
}
# steep starts tracked row by row: (curve, [(y, x), ...]) with y decreasing
ROW_ANCHORS = {
    16: {"C_steep": [(3493, 2173), (3310, 2200), (3140, 2230), (3027, 2260), (2881, 2300), (2737, 2350),
                     (2600, 2401.4), (2560, 2417.2), (2520, 2435.0), (2480, 2452.5), (2400, 2496.4), (2360, 2519.2),
                     (2320, 2544.6), (2280, 2573.7), (2240, 2602.7), (2200, 2637.2), (2140, 2690), (2080, 2751.1),
                     (2000, 2851.1), (1975, 2885)]},
}


def main():
    fig, page, calib, symf, out = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
    d = 255.0 - np.asarray(Image.open(page).convert("L")).astype(float)
    g = localgrid.LocalGrid.load(calib)
    syms = json.load(open(symf))
    vl = [g.vline(k) for k in range(len(g.vvals)) if np.sum(~np.isnan(g.X[k])) >= 2]
    hl = [g.hline(j) for j in range(len(g.hvals)) if np.sum(~np.isnan(g.X[:, j])) >= 2]
    tmpl = tn3819_track.HGridTemplates(d, hl, vl)
    tracks = {}
    for name, anc in ANCHORS[fig].items():
        if not anc:
            continue
        xr = range(int(anc[0][0]), int(anc[-1][0]) + 1)
        vcols = set()
        for x in xr:
            y = float(np.interp(x, [a[0] for a in anc], [a[1] for a in anc]))
            if any(abs(x - float(f(y))) <= 6.0 for f in vl):
                vcols.add(x)
        raw = tn3819_track.track_columns(d, tmpl, vcols, anc, xr)
        pts = []
        for x, (y, pk, ng) in sorted(raw.items()):
            flag = []
            if ng:
                flag.append("grid")
            if any(np.hypot(x - s["value_px"][0], y - s["value_px"][1]) < 36 for s in syms):
                flag.append("symbol")
            Mc, P = g.to_data(float(x), y)
            pts.append(dict(x=float(x), y=y, peak=pk, flag=",".join(flag), Mc=Mc, P=P))
        tracks[name] = pts
        nf = sum(1 for p in pts if p["flag"])
        print(name, len(pts), "points,", nf, "flagged; Mc %.3f to %.3f" % (pts[0]["Mc"], pts[-1]["Mc"]))
    import cr_track
    for name, anc in ROW_ANCHORS.get(fig, {}).items():
        anc = sorted(anc)
        al = np.array([a[0] for a in anc], float)
        ac = np.array([a[1] for a in anc], float)
        rng = range(int(al[0]), int(al[-1]) + 1)
        pred = {y: float(np.interp(y, al, ac)) for y in rng}
        pts = {}
        for _ in range(3):
            pts = {}
            for y in rng:
                p = pred[y]
                lo = int(p) - 20
                coords = np.arange(lo, lo + 41, dtype=float)
                r = cr_track.peak_near(d[y, lo:lo + 41], coords, p, search=6.0, cw=5.0, min_peak=60.0)
                if r:
                    pts[y] = r
            ss = np.array(sorted(pts), float)
            vv = np.array([pts[int(q)][0] for q in ss])
            for y in rng:
                sel = np.abs(ss - y) <= 15
                if sel.sum() >= 8:
                    c = np.polyfit(ss[sel], vv[sel], 1)
                    pred[y] = float(np.polyval(c, y))
        lst = []
        for y, (x, pk, wd) in sorted(pts.items()):
            flag = []
            if any(abs(y - float(f(x))) < 6 for f in hl) or any(abs(x - float(f(y))) < 6 for f in vl):
                flag.append("grid")
            if any(np.hypot(x - q["value_px"][0], y - q["value_px"][1]) < 36 for q in syms):
                flag.append("symbol")
            Mc, P = g.to_data(x, float(y))
            lst.append(dict(x=x, y=float(y), peak=pk, flag=",".join(flag), Mc=Mc, P=P))
        tracks[name] = lst
        print(name, len(lst), "points (rows),", sum(1 for q in lst if q["flag"]), "flagged; Mc %.3f to %.3f" % (
            min(q["Mc"] for q in lst), max(q["Mc"] for q in lst)))
    with open(out, "w") as f:
        json.dump(tracks, f)


if __name__ == "__main__":
    main()
