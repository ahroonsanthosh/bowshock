"""Read the curves of NACA TN 3861 figs. 15 and 16 at chosen crossflow Mach numbers.

usage: python3 -I t3861_read.py FIG CALIB.json TRACKS.json OUT.json

At each target M_c the track points within |M_c - target| <= w are fitted by a
line and a parabola (w from the table below); the central fit is the value,
the spread of fits a model term. Points flagged 'symbol' are left out; points
flagged 'grid' are left out except for curve B of fig. 15, which lies on the
P = 2.0 gridline over its whole length (there the gridline was subtracted
and the excess ink centroided). Error (about 2 sigma):
  2 sqrt(se^2 + s^2 (dP/dy)^2 + (slope s dMc/dx)^2) + spread/2, s = 0.9 px
(0.7 px calibration leave-one-out, 0.5 px ink centroid). End points are the
first and last tracked ink, with 2 px uncertainty along the line.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import localgrid  # noqa: E402

PLAN = {
    15: {"A": dict(targets=[1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0],
                   windows=(0.06, 0.1, 0.15), use_grid=False, wide={3.0: (0.2, 0.3, 0.4), 5.0: (0.2, 0.3, 0.4)},
                   start_px=(1550.0, 2207.0)),
         "B": dict(targets=[7.5, 8.0], windows=(0.1, 0.2, 0.3), use_grid=True)},
    16: {"C": dict(targets=[1.4, 1.5, 1.6, 1.75, 2.0, 2.25, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5],
                   windows=(0.04, 0.07, 0.1), use_grid=False, merge=("C_steep", "C"), wide={3.0: (0.15, 0.2, 0.3)})},
}


def main():
    fig, calib, trk, out = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
    g = localgrid.LocalGrid.load(calib)
    tracks = json.load(open(trk))
    rows = []
    for name, pl in PLAN[fig].items():
        pts = []
        for n in pl.get("merge", (name,)):
            pts += tracks[n]
        pts.sort(key=lambda p: p["Mc"])
        allM = np.array([p["Mc"] for p in pts])
        allP = np.array([p["P"] for p in pts])
        ok = np.array([not p["flag"] or (pl["use_grid"] and p["flag"] == "grid") for p in pts])
        M, P = allM[ok], allP[ok]
        for mt in pl["targets"]:
            res = []
            for w in pl.get("wide", {}).get(mt, pl["windows"]):
                sel = np.abs(M - mt) <= w
                for dg in (1, 2):
                    if sel.sum() < dg + 6 or (M[sel] < mt).sum() < 2 or (M[sel] > mt).sum() < 2:
                        continue
                    dm = M[sel] - mt
                    A = np.vander(dm, dg + 1, increasing=True)
                    coef, *_ = np.linalg.lstsq(A, P[sel], rcond=None)
                    r = P[sel] - A @ coef
                    s2 = (r @ r) / max(1, sel.sum() - dg - 1)
                    cov = s2 * np.linalg.inv(A.T @ A)
                    res.append(dict(w=w, deg=dg, value=float(coef[0]), slope=float(coef[1]),
                                    se=float(np.sqrt(cov[0, 0])), n=int(sel.sum())))
            if not res:
                print(name, mt, "no two-sided points")
                continue
            cen = res[len(res) // 2]
            vals = [r["value"] for r in res]
            spread = max(vals) - min(vals)
            x, y = g.to_pixel(mt, cen["value"])
            dMx = abs(g.to_data(x + 10, y)[0] - mt) / 10
            dPy = abs(g.to_data(x, y + 10)[1] - cen["value"]) / 10
            s = 0.9
            err = 2 * np.sqrt(cen["se"] ** 2 + (s * dPy) ** 2 + (cen["slope"] * s * dMx) ** 2) + spread / 2
            rows.append(dict(curve=name, kind="at Mc", Mc=mt, P=cen["value"], err=float(err), x=x, y=y,
                             slope=cen["slope"], n=cen["n"], spread=float(spread)))
            print("%s Mc %.2f P %.4f +- %.4f (slope %.3f, n %d, spread %.5f)" % (name, mt, cen["value"], err,
                                                                              cen["slope"], cen["n"], spread))
        # end points
        ends = [("start", pts[0]), ("end", pts[-1])]
        if "start_px" in pl:
            sx, sy = pl["start_px"]
            m0, p0 = g.to_data(sx, sy)
            ends[0] = ("start", dict(x=sx, y=sy, Mc=m0, P=p0, flag="blob at the line end, read from the pixel map"))
        for lab, p in ends:
            dMx = abs(g.to_data(p["x"] + 10, p["y"])[0] - p["Mc"]) / 10
            dPy = abs(g.to_data(p["x"], p["y"] + 10)[1] - p["P"]) / 10
            rows.append(dict(curve=name, kind=lab, Mc=p["Mc"], P=p["P"], err=float(2 * 2 * dPy),
                             errM=float(2 * 2 * dMx), x=p["x"], y=p["y"]))
            print("%s %s: Mc %.3f P %.4f (flag %s)" % (name, lab, p["Mc"], p["P"], p["flag"]))
    with open(out, "w") as f:
        json.dump(rows, f, indent=1)


if __name__ == "__main__":
    main()
