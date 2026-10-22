"""Track the curves of NACA TN 3819 fig. 18 and save the tracks.

usage: python3 -I tn3819_track.py PAGE.png CALIB.json OUT_tracks.json

Curves tracked:
  U  the upper (more negative) of the two near-coincident compiled curves
     (Chapman's compilation; identification in the method note)
  L  the lower (less negative) one (Love's basic curve)
  F  the oscillating dash-dot curve labelled "Free-flight data"

U and L are measured column by column. Anchor points (x, y) were read by eye
from zoomed crops and from ink-peak lists (peaks.py); between anchors the
predicted y is linearly interpolated, the ink peak nearest the prediction
(within 4 px) is found in the column's darkness profile after the
horizontal gridlines have been subtracted (HGridTemplates), and its
darkness-weighted centroid is taken. The prediction is then replaced by a
running fit to the measured points and the columns are measured again (three
passes in all). Columns within 5 px of a vertical gridline are skipped;
points whose centroid window lies within 4.5 px of a horizontal gridline
centre are flagged near_grid (gridline subtracted, but less reliable); x
ranges where a symbol or leader covers or touches the line are flagged
occluded; where U and L are closer than 7 px they are flagged merged.
Flagged points are drawn hollow on the overlays and left out of the fits
unless a reading says otherwise.

F is followed with the ridge follower (ridge.py), which handles its steep
and dashed parts, from seeds at its first peak and on its last hump.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import localgrid  # noqa: E402
import ridge  # noqa: E402

Image.MAX_IMAGE_PIXELS = None

BOX = (700, 2250, 1900, 3450)  # x0, x1, y0, y1 region tracked and masked

ANCHORS = {
    "U": [(797, 2471.5), (820, 2473.5), (900, 2485.7), (940, 2494.7), (980, 2506.3),
          (1000, 2512.4), (1031, 2524.0), (1050, 2531.0), (1080, 2542.0), (1120, 2556.4),
          (1140, 2565.5), (1200, 2595.0), (1230, 2610.9), (1260, 2627.5), (1290, 2648.0),
          (1330, 2671.0), (1358, 2688.0), (1380, 2702.7), (1410, 2723.1), (1460, 2756.5),
          (1500, 2781.3), (1530, 2799.4), (1580, 2828.9), (1600, 2840.4), (1630, 2856.0),
          (1655, 2871.0), (1710, 2899.6), (1740, 2914.8), (1790, 2938.3), (1830, 2956.4),
          (1860, 2969.3), (1890, 2982.3), (1920, 2994.5), (1945, 3006.0), (1965, 3011.5),
          (1980, 3017.5)],
    "L": [(797, 2501.5), (820, 2501.2), (900, 2506.7), (940, 2515.2), (980, 2527.0),
          (1020, 2540.4), (1050, 2553.8), (1080, 2565.0), (1120, 2584.2), (1140, 2594.3),
          (1170, 2610.2), (1200, 2625.8), (1260, 2661.0), (1290, 2679.6), (1330, 2704.6),
          (1380, 2733.5), (1410, 2751.6), (1460, 2781.2), (1500, 2803.0), (1530, 2819.1),
          (1580, 2846.3), (1600, 2856.6), (1625, 2871.7), (1680, 2899.0), (1700, 2908.8),
          (1740, 2927.5), (1790, 2949.1), (1830, 2966.2), (1860, 2978.5), (1890, 2990.5),
          (1960, 3017.8), (2000, 3029.5), (2050, 3047.4), (2100, 3065.0)],
}
# x ranges where a symbol, label leader or arrowhead covers or touches the line
OCCLUDED = {
    "U": [(1078, 1118, "Ref. 9 circle at M 1.5 touches U"),
          (1536, 1552, "Chapman leader arrowhead touches U"),
          (1352, 1364, "corner of stacked squares at M 1.9 touches U")],
    "L": [(1334, 1374, "stacked squares at M 1.9 cover L"),
          (1536, 1546, "Chapman leader shaft crosses L"),
          (1600, 1612, "basic-curve leader arrowhead touches L"),
          (1612, 1672, "square symbol at M 2.4 covers L")],
}


class HGridTemplates:
    """Median darkness profile across each horizontal gridline, measured over
    columns within +-150 px of the column of interest (columns near vertical
    gridlines skipped). Subtracting it removes the gridline from a column
    profile, so a curve running along or across a gridline can still be
    centroided. The median over about 120 columns ignores the few columns
    where other ink lies on the gridline."""

    OFFS = np.arange(-9.0, 9.01, 0.25)

    def __init__(self, d, hl, vl):
        self.d, self.hl, self.vl = d, hl, vl
        self.cache = {}

    def _near_v(self, c, y):
        return any(abs(c - float(f(y))) < 7 for f in self.vl)

    def template(self, j, x):
        key = (j, x // 25)
        if key in self.cache:
            return self.cache[key]
        f = self.hl[j]
        rows = []
        xc = (x // 25) * 25 + 12
        for c in range(xc - 150, xc + 151, 2):
            yg = float(f(c))
            if self._near_v(c, yg):
                continue
            ys = yg + self.OFFS
            y0 = np.floor(ys).astype(int)
            fr = ys - y0
            col = self.d[:, c]
            rows.append((1 - fr) * col[y0] + fr * col[y0 + 1])
        t = np.median(np.array(rows), axis=0)
        t = t - np.median(np.r_[t[:6], t[-6:]])
        self.cache[key] = t
        return t

    def subtract(self, prof, ys, x):
        """Subtract every horizontal gridline within reach from a column
        profile sampled at integer rows ys; returns (profile, on_grid rows)."""
        out = prof.copy()
        on = np.zeros(len(ys), bool)
        for j, f in enumerate(self.hl):
            yg = float(f(x))
            if yg < ys[0] - 10 or yg > ys[-1] + 10:
                continue
            t = self.template(j, x)
            out -= np.interp(ys - yg, self.OFFS, t, left=0.0, right=0.0)
            on |= np.abs(ys - yg) <= 4.5
        return out, on


def column_peak(d, tmpl, x, ypred, search=4.0, cw=3.5, min_peak=35.0):
    y0 = int(np.floor(ypred - 10))
    ys0 = np.arange(y0, y0 + 21, dtype=float)
    prof, m = tmpl.subtract(d[y0:y0 + 21, x].astype(float), ys0, x)
    base = np.median(np.r_[prof[:3], prof[-3:]])
    pr = prof - base
    ys = np.arange(y0, y0 + 21, dtype=float)
    cand = [i for i in range(1, 20) if pr[i] >= pr[i - 1] and pr[i] >= pr[i + 1]
            and pr[i] > min_peak and abs(ys[i] - ypred) <= search]
    if not cand:
        return None
    i = min(cand, key=lambda k: abs(ys[k] - ypred))
    win = np.abs(ys - ys[i]) <= cw
    w = np.clip(pr[win], 0, None)
    if w.sum() <= 0:
        return None
    c = float((ys[win] * w).sum() / w.sum())
    return c, float(pr[i]), bool(m[win].any())


def track_columns(d, msk, vmask_cols, anchors, xr):
    ax = np.array([a[0] for a in anchors], float)
    ay = np.array([a[1] for a in anchors], float)
    pred = {x: float(np.interp(x, ax, ay)) for x in xr}
    pts = {}
    for _pass in range(3):
        pts = {}
        for x in xr:
            if x in vmask_cols:
                continue
            r = column_peak(d, msk, x, pred[x])
            if r is None:
                continue
            pts[x] = r
        # new prediction: local linear fit (+-12 px) to clean points
        xs = np.array([x for x in pts if not pts[x][2]], float)
        ys = np.array([pts[int(x)][0] for x in xs], float)
        for x in xr:
            sel = np.abs(xs - x) <= 12
            if sel.sum() >= 6:
                c = np.polyfit(xs[sel], ys[sel], 1)
                pred[x] = float(np.polyval(c, x))
    return pts


def main():
    page, calib, out = sys.argv[1:4]
    d = 255.0 - np.asarray(Image.open(page).convert("L")).astype(float)
    g = localgrid.LocalGrid.load(calib)
    vl = [g.vline(k) for k in range(len(g.vvals))]
    hl = [g.hline(j) for j in range(len(g.hvals))]
    mask = ridge.grid_mask(d.shape, vl, hl, 4.5, BOX).astype(np.float32)
    tmpl = HGridTemplates(d, hl, vl)
    tracks = {}
    raw = {}
    for name, anc in ANCHORS.items():
        xr = range(int(anc[0][0]), int(anc[-1][0]) + 1)
        # columns lying inside a vertical gridline mask at the curve height
        vcols = set()
        for x in xr:
            y = float(np.interp(x, [a[0] for a in anc], [a[1] for a in anc]))
            for f in vl:
                if abs(x - float(f(y))) <= 5.0:
                    vcols.add(x)
        raw[name] = track_columns(d, tmpl, vcols, anc, xr)
    for name in ("U", "L"):
        other = raw["L" if name == "U" else "U"]
        pts = []
        for x, (y, pk, ng) in sorted(raw[name].items()):
            occ = [r[2] for r in OCCLUDED[name] if r[0] <= x <= r[1]]
            merged = x in other and abs(other[x][0] - y) < 7.0
            pts.append(dict(x=float(x), y=y, peak=pk, near_grid=ng, occluded=bool(occ),
                            merged=bool(merged)))
        tracks[name] = pts
    # free-flight curve
    F = []
    for sx, sy, dr, xr, xl in ((824.0, 2367.5, (1.0, 0.3), 905.0, 790.0),
                               (935.0, 2428.0, (1.0, 0.25), 1000.0, 905.0)):
        fwd = ridge.follow(d, mask, (sx, sy), dr, tol=2.5, step=1.0, max_gap=30,
                           stop=lambda p, xr=xr: p[0] > xr)
        bwd = ridge.follow(d, mask, (sx, sy), (-dr[0], dr[1]), tol=2.5, step=1.0, max_gap=30,
                           stop=lambda p, xl=xl: p[0] < xl or p[1] > 2520)
        seg = bwd[::-1] + fwd
        for p in seg:
            p["seg"] = "F@%d" % int(sx)
            # the "Free-flight data" leader arrowhead touches F here
            if 843.0 <= p["x"] <= 849.0 and 2393.0 <= p["y"] <= 2403.0:
                p["occluded"] = True
        F += seg
    tracks["F"] = F
    for name, pts in tracks.items():
        for p in pts:
            m, pb = g.to_data(p["x"], p["y"])
            p["M"] = m
            p["P"] = pb
        ms = [p["M"] for p in pts]
        nflag = sum(1 for p in pts if p.get("near_grid") or p.get("occluded") or p.get("merged"))
        print(name, len(pts), "points (%d flagged); M %.4f to %.4f" % (nflag, min(ms), max(ms)))
    with open(out, "w") as f:
        json.dump(tracks, f)


if __name__ == "__main__":
    main()
